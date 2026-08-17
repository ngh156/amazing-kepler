/**
 * CANDLE AGGREGATOR SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Consumes InternalPriceTick from the Price Engine and maintains in-memory
 * OHLCV candles for each (symbol, interval) pair.
 *
 * On every tick:
 *   1. Update the current open candle (high/low/close/volume).
 *   2. Publish a partial candle update via Redis → WebSocket.
 *   3. When a candle period closes: persist to DB + publish closed candle.
 */

import { prisma, redisPub } from '../../config/db';
import { InternalPriceTick } from './price-engine.service';

const INTERVALS: Record<string, number> = {
  '1m':  60,
  '5m':  300,
  '15m': 900,
  '30m': 1800,
  '1h':  3600,
  '4h':  14400,
  '1d':  86400,
};

interface LiveCandle {
  symbol: string;
  interval: string;
  openTime: number;   // Unix seconds
  closeTime: number;  // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
}

class CandleAggregator {
  // key = `${symbol}:${interval}`
  private candles = new Map<string, LiveCandle>();

  async onTick(tick: InternalPriceTick, tradeVolume = 0) {
    const price = tick.internalPrice;
    const now = Math.floor(tick.timestamp / 1000); // seconds

    for (const [interval, periodSec] of Object.entries(INTERVALS)) {
      const key = `${tick.symbol}:${interval}`;
      const periodStart = Math.floor(now / periodSec) * periodSec;
      const periodEnd   = periodStart + periodSec - 1;

      let candle = this.candles.get(key);

      if (!candle || candle.openTime !== periodStart) {
        // Close previous candle if exists
        if (candle) {
          await this.closeCandle(candle);
        }
        // Open new candle
        candle = {
          symbol: tick.symbol,
          interval,
          openTime: periodStart,
          closeTime: periodEnd,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: tradeVolume,
          quoteVolume: price * tradeVolume,
          trades: 1,
        };
        this.candles.set(key, candle);
      } else {
        // Update existing candle
        candle.high        = Math.max(candle.high, price);
        candle.low         = Math.min(candle.low, price);
        candle.close       = price;
        candle.volume     += tradeVolume;
        candle.quoteVolume = candle.volume * price;
        candle.trades++;
      }

      // Publish partial candle update to WebSocket channels
      await this.publishLive(candle);
    }

    // Publish ticker (for header price display) on both room aliases
    const tickerPayload = JSON.stringify({
      symbol: tick.symbol,
      price: tick.internalPrice,
      referencePrice: tick.referencePrice,
      timestamp: tick.timestamp,
    });

    await Promise.all([
      redisPub.publish(`market:${tick.symbol}:ticker`, tickerPayload).catch(() => {}),
      redisPub.publish(`ticker:${tick.symbol}`, tickerPayload).catch(() => {}),
    ]);
  }

  private async closeCandle(candle: LiveCandle) {
    try {
      const openTime  = new Date(candle.openTime  * 1000);
      const closeTime = new Date(candle.closeTime * 1000);

      await prisma.candle.upsert({
        where: { symbol_interval_openTime: { symbol: candle.symbol, interval: candle.interval, openTime } },
        create: {
          symbol: candle.symbol,
          interval: candle.interval,
          openTime,
          closeTime,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          quoteVolume: candle.quoteVolume,
          trades: candle.trades,
          source: 'INTERNAL',
        },
        update: {
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          quoteVolume: candle.quoteVolume,
          trades: candle.trades,
        },
      });

      // Publish CLOSED candle for chart update
      const payload = JSON.stringify({ ...candle, isClosed: true });
      await Promise.all([
        redisPub.publish(`market:${candle.symbol}:kline:${candle.interval}`, payload).catch(() => {}),
        redisPub.publish(`kline:${candle.symbol}:${candle.interval}`, payload).catch(() => {}),
      ]);
    } catch (e: any) {
      console.error(`[CandleAggregator] Failed to persist candle ${candle.symbol}:${candle.interval}`, e.message);
    }
  }

  private async publishLive(candle: LiveCandle) {
    const payload = JSON.stringify({ ...candle, isClosed: false });
    try {
      await Promise.all([
        redisPub.publish(`market:${candle.symbol}:kline:${candle.interval}`, payload).catch(() => {}),
        redisPub.publish(`kline:${candle.symbol}:${candle.interval}`, payload).catch(() => {}),
      ]);
    } catch (e) {
      // non-fatal
    }
  }

  // Get current live candle for a symbol+interval (used by REST endpoint)
  getLiveCandle(symbol: string, interval: string): LiveCandle | undefined {
    return this.candles.get(`${symbol}:${interval}`);
  }
}

export const candleAggregator = new CandleAggregator();
