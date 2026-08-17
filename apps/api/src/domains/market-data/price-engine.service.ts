/**
 * PRICE ENGINE
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives a normalized MarketTick (externalPrice) from the Market Data Service,
 * applies per-market configuration (spread, offset, boundary checks) and emits
 * an InternalPriceTick that all downstream services must use.
 *
 * External price is NEVER rendered directly to the frontend.
 */

import { prisma } from '../../config/db';
import EventEmitter from 'events';

export interface MarketTick {
  symbol: string;
  externalPrice: number;
  quantity: number;
  timestamp: number; // Unix ms
  source: string;    // 'BINANCE' | 'SIMULATION'
}

export interface InternalPriceTick {
  symbol: string;
  referencePrice: number;   // externalPrice after normalization
  internalPrice: number;    // after spread + offset + boundary
  spreadBps: number;
  priceOffset: number;
  timestamp: number;
  source: string;
}

interface PriceConfig {
  spreadBps: number;
  priceOffset: number;
  maxDeviationBps: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  enabled: boolean;
}

const DEFAULT_CONFIG: PriceConfig = {
  spreadBps: 5,
  priceOffset: 0,
  maxDeviationBps: 200,
  minPrice: null,
  maxPrice: null,
  enabled: true,
};

class PriceEngine extends EventEmitter {
  // In-memory config cache — reloaded every 60 seconds
  private configCache = new Map<string, PriceConfig>();
  private lastConfigLoad = 0;
  private readonly CONFIG_TTL_MS = 60_000;

  /**
   * Helper to convert an external reference price to an internal market price
   * according to current market rules (spread, offset, boundaries).
   */
  async transformPrice(symbol: string, refPrice: number): Promise<number> {
    const config = await this.getConfig(symbol);
    if (!config.enabled) return refPrice;

    const spread = refPrice * (config.spreadBps / 10_000);
    let internalPrice = refPrice + spread + config.priceOffset;

    const maxDev = refPrice * (config.maxDeviationBps / 10_000);
    if (Math.abs(internalPrice - refPrice) > maxDev) {
      internalPrice = refPrice + Math.sign(internalPrice - refPrice) * maxDev;
    }

    if (config.minPrice != null) internalPrice = Math.max(internalPrice, config.minPrice);
    if (config.maxPrice != null) internalPrice = Math.min(internalPrice, config.maxPrice);

    return Math.round(internalPrice * 100) / 100;
  }

  async compute(tick: MarketTick): Promise<InternalPriceTick | null> {
    const config = await this.getConfig(tick.symbol);
    if (!config.enabled) return null;

    const refPrice = tick.externalPrice;
    const internalPrice = await this.transformPrice(tick.symbol, refPrice);

    const result: InternalPriceTick = {
      symbol: tick.symbol,
      referencePrice: refPrice,
      internalPrice,
      spreadBps: config.spreadBps,
      priceOffset: config.priceOffset,
      timestamp: tick.timestamp,
      source: tick.source,
    };

    this.emit('tick', result);
    return result;
  }

  private async getConfig(symbol: string): Promise<PriceConfig> {
    const now = Date.now();
    if (now - this.lastConfigLoad > this.CONFIG_TTL_MS) {
      await this.reloadConfigs();
      this.lastConfigLoad = now;
    }
    return this.configCache.get(symbol) ?? DEFAULT_CONFIG;
  }

  private async reloadConfigs() {
    try {
      const configs = await prisma.marketPriceConfig.findMany({ where: { enabled: true } });
      this.configCache.clear();
      for (const c of configs) {
        this.configCache.set(c.marketId, {
          spreadBps: c.spreadBps,
          priceOffset: c.priceOffset,
          maxDeviationBps: c.maxDeviationBps,
          minPrice: c.minPrice ? Number(c.minPrice) : null,
          maxPrice: c.maxPrice ? Number(c.maxPrice) : null,
          enabled: c.enabled,
        });
      }
    } catch (e) {
      console.warn('[PriceEngine] Failed to reload configs from DB, using cached values');
    }
  }
}

export const priceEngine = new PriceEngine();
