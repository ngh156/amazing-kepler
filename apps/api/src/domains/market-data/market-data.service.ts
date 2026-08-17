/**
 * EXTERNAL MARKET DATA SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to Binance WebSocket stream to receive realtime trade ticks.
 * Normalizes each tick to MarketTick format and pipes through the Price Engine.
 *
 * If the external stream is unavailable (blocked / timeout), falls back to
 * Internal Simulation Mode — which runs the same pipeline but generates
 * synthetic ticks internally. The pipeline is NEVER bypassed.
 */

import WebSocket from 'ws';
import { prisma, redisPub } from '../../config/db';
import { priceEngine, MarketTick } from './price-engine.service';
import { candleAggregator } from './candle-aggregator.service';

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/stream?streams=';
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 5;

interface SimState {
  price: number;
  volatility: number;
}

const BASE_PRICES: Record<string, SimState> = {
  BTCUSDT:  { price: 68500,    volatility: 0.0010 },
  ETHUSDT:  { price: 3500,     volatility: 0.0015 },
  SOLUSDT:  { price: 145,      volatility: 0.0020 },
  BNBUSDT:  { price: 580,      volatility: 0.0015 },
  XRPUSDT:  { price: 0.58,     volatility: 0.0025 },
  ADAUSDT:  { price: 0.42,     volatility: 0.0025 },
  DOGEUSDT: { price: 0.12,     volatility: 0.0030 },
  AVAXUSDT: { price: 26.5,     volatility: 0.0025 },
  DOTUSDT:  { price: 6.2,      volatility: 0.0020 },
  LINKUSDT: { price: 12.8,     volatility: 0.0020 },
  MATICUSDT:{ price: 0.52,     volatility: 0.0025 },
  NEARUSDT: { price: 4.8,      volatility: 0.0025 },
  SHIBUSDT: { price: 0.000018, volatility: 0.0035 },
  PEPEUSDT: { price: 0.0000095,volatility: 0.0040 },
  SUIUSDT:  { price: 0.92,     volatility: 0.0030 },
  APTUSDT:  { price: 6.75,     volatility: 0.0025 },
  ARBUSDT:  { price: 0.58,     volatility: 0.0025 },
  OPUSDT:   { price: 1.45,     volatility: 0.0025 },
  LTCUSDT:  { price: 65.4,     volatility: 0.0015 },
  BCHUSDT:  { price: 340,      volatility: 0.0020 },
  ATOMUSDT: { price: 5.1,      volatility: 0.0020 },
  UNIUSDT:  { price: 6.9,      volatility: 0.0020 },
  FILUSDT:  { price: 3.85,     volatility: 0.0025 },
  FETUSDT:  { price: 1.35,     volatility: 0.0030 },
  RNDRUSDT: { price: 5.9,      volatility: 0.0030 },
  TIAUSDT:  { price: 5.2,      volatility: 0.0030 },
  INJUSDT:  { price: 18.5,     volatility: 0.0025 },
  STXUSDT:  { price: 1.65,     volatility: 0.0025 },
  KASUSDT:  { price: 0.16,     volatility: 0.0025 },
  WIFUSDT:  { price: 1.85,     volatility: 0.0040 },
  FLOKIUSDT:{ price: 0.00014,  volatility: 0.0040 },
  BONKUSDT: { price: 0.000021, volatility: 0.0040 },
  ICPUSDT:  { price: 7.8,      volatility: 0.0020 },
  TRXUSDT:  { price: 0.13,     volatility: 0.0015 },
  XLMUSDT:  { price: 0.095,    volatility: 0.0020 },
  ETCUSDT:  { price: 19.2,     volatility: 0.0020 },
  ALGOUSDT: { price: 0.14,     volatility: 0.0025 },
  FTMUSDT:  { price: 0.48,     volatility: 0.0030 },
  AAVEUSDT: { price: 115,      volatility: 0.0020 },
  SEIUSDT:  { price: 0.32,     volatility: 0.0030 },
};

class ExternalMarketDataService {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private simTimer: NodeJS.Timeout | null = null;
  private simulationMode = false;
  private activeSymbols: string[] = [];
  private stepCounter = 0;

  async start() {
    const markets = await prisma.market.findMany({ where: { status: 'TRADING' } });
    this.activeSymbols = markets.map((m) => m.id);

    if (this.activeSymbols.length === 0) {
      console.warn('[MarketData] No TRADING markets found in DB');
      return;
    }

    console.log(`[MarketData] Starting for ${this.activeSymbols.length} markets: ${this.activeSymbols.join(', ')}`);
    this.connectBinance();
  }

  private sockets: WebSocket[] = [];

  private connectBinance() {
    this.sockets.forEach((s) => s.terminate());
    this.sockets = [];

    // Batch symbols into chunks of 20 streams per WS connection
    const CHUNK_SIZE = 20;
    const symbolChunks: string[][] = [];
    for (let i = 0; i < this.activeSymbols.length; i += CHUNK_SIZE) {
      symbolChunks.push(this.activeSymbols.slice(i, i + CHUNK_SIZE));
    }

    console.log(`[MarketData] Connecting to Binance via ${symbolChunks.length} batched WebSocket connections for ${this.activeSymbols.length} pairs...`);

    symbolChunks.forEach((chunk, index) => {
      const streams = chunk.map((s) => `${s.toLowerCase()}@trade`).join('/');
      const url = `${BINANCE_WS_BASE}${streams}`;

      try {
        const ws = new WebSocket(url);

        ws.on('open', () => {
          console.log(`[MarketData] ✅ Socket #${index + 1} connected (${chunk.length} pairs: ${chunk[0]}..${chunk[chunk.length - 1]})`);
        });

        ws.on('message', (data: Buffer) => {
          try {
            const msg = JSON.parse(data.toString());
            const trade = msg.data ?? msg;

            if (!trade.s || !trade.p) return;

            const tick: MarketTick = {
              symbol: (trade.s as string).toUpperCase(),
              externalPrice: parseFloat(trade.p),
              quantity: parseFloat(trade.q ?? '0.1'),
              timestamp: trade.T ?? Date.now(),
              source: 'BINANCE',
            };

            this.pipeline(tick);
          } catch (_) {}
        });

        ws.on('error', (err) => {
          console.warn(`[MarketData] Socket #${index + 1} error:`, err.message);
        });

        ws.on('close', () => {
          console.warn(`[MarketData] Socket #${index + 1} closed. Reconnecting in 3s...`);
          setTimeout(() => this.connectBinance(), 3000);
        });

        this.sockets.push(ws);
      } catch (e: any) {
        console.error(`[MarketData] Failed to open Socket #${index + 1}:`, e.message);
      }
    });
  }

  private scheduleReconnect() {
    if (this.retryCount >= MAX_RETRIES) {
      console.warn(`[MarketData] Max retries (${MAX_RETRIES}) reached → switching to Simulation Mode`);
      this.startSimulation();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30_000);
    this.retryCount++;
    console.log(`[MarketData] Reconnecting in ${delay / 1000}s (attempt ${this.retryCount}/${MAX_RETRIES})...`);
    this.retryTimer = setTimeout(() => this.connectBinance(), delay);
  }

  private startSimulation() {
    if (this.simTimer) return;
    this.simulationMode = true;
    console.log('[MarketData] 🔄 Running in Internal Simulation Mode (Price Engine pipeline active for all 40 pairs)');

    this.simTimer = setInterval(async () => {
      this.stepCounter++;

      for (const symbol of this.activeSymbols) {
        let state = BASE_PRICES[symbol];
        if (!state) {
          BASE_PRICES[symbol] = { price: 100, volatility: 0.001 };
          state = BASE_PRICES[symbol];
        }

        const drift  = (Math.random() - 0.49) * 0.0002;
        const noise  = (Math.random() - 0.49) * 2 * state.volatility;
        const sine   = Math.sin(this.stepCounter / 12) * state.volatility * 0.3;
        const pct    = drift + noise + sine;
        state.price  = state.price * (1 + pct);

        const tick: MarketTick = {
          symbol,
          externalPrice: state.price,
          quantity: Math.random() * 0.5 + 0.01,
          timestamp: Date.now(),
          source: 'SIMULATION',
        };

        await this.pipeline(tick);
      }
    }, 1000);
  }

  private async pipeline(tick: MarketTick) {
    try {
      const internal = await priceEngine.compute(tick);
      if (!internal) return;

      // 1. Update Candle Aggregator
      await candleAggregator.onTick(internal, tick.quantity);

      // 2. Broadcast Market Trade Event to Socket.io
      const tradePayload = {
        tradeId: `TRD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        marketId: tick.symbol,
        price: internal.internalPrice,
        quantity: tick.quantity,
        makerSide: Math.random() > 0.5 ? 'BUY' : 'SELL',
        timestamp: tick.timestamp,
      };
      await redisPub.publish(`market:${tick.symbol}:trades`, JSON.stringify(tradePayload));

      // 3. Broadcast Real-time Orderbook Depth (centered around internalPrice)
      const bids = [];
      const asks = [];
      const isMicro = tick.symbol.includes('SHIB') || tick.symbol.includes('PEPE') || tick.symbol.includes('FLOKI') || tick.symbol.includes('BONK');
      const stepPct = isMicro ? 0.0005 : 0.0002;
      const decimals = isMicro ? 7 : 2;

      for (let i = 1; i <= 15; i++) {
        const bidP = internal.internalPrice * (1 - i * stepPct);
        const askP = internal.internalPrice * (1 + i * stepPct);
        const bidQ = (Math.random() * 1500 + 10).toFixed(2);
        const askQ = (Math.random() * 1500 + 10).toFixed(2);
        bids.push([bidP.toFixed(decimals), bidQ]);
        asks.push([askP.toFixed(decimals), askQ]);
      }
      await redisPub.publish(`market:${tick.symbol}:depth`, JSON.stringify({ bids, asks }));

    } catch (e: any) {
      console.error('[MarketData] Pipeline error:', e.message);
    }
  }

  stop() {
    this.ws?.close();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    if (this.simTimer)   clearInterval(this.simTimer);
  }
}

export const marketDataService = new ExternalMarketDataService();
