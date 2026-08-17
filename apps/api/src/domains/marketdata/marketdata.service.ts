import { redisSub, redisPub, prisma } from '../../config/db';
import BigNumber from 'bignumber.js';

export class MarketDataService {
  private static instance: MarketDataService;

  private constructor() {
    this.initSubscriber();
  }

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  private initSubscriber() {
    redisSub.subscribe('trade_events', (err) => {
      if (err) console.error('❌ Failed to subscribe to trade_events:', err);
      else console.log('📡 Subscribed to trade_events Redis channel');
    });

    redisSub.on('message', async (channel, message) => {
      if (channel === 'trade_events') {
        try {
          const trade = JSON.parse(message);
          await this.handleTradeEvent(trade);
        } catch (e: any) {
          console.error('Error handling trade event:', e.message);
        }
      }
    });
  }

  /**
   * Aggregate incoming trade event into OHLCV Candles and publish ticker update
   */
  private async handleTradeEvent(trade: any) {
    const symbol = trade.marketId;
    const price = new BigNumber(trade.price);
    const quantity = new BigNumber(trade.quantity);
    const quoteQuantity = new BigNumber(trade.quoteQuantity || '0');
    const tradeTime = new Date(trade.timestamp);

    // Broadcast recent trade to WebSocket Subscribers
    await redisPub.publish(`market:${symbol}:trades`, JSON.stringify(trade));

    // 1-minute Candle Aggregation
    const candleTime = new Date(Math.floor(tradeTime.getTime() / 60000) * 60000);

    const existingCandle = await prisma.candle.findUnique({
      where: {
        symbol_interval_openTime: {
          symbol,
          interval: '1m',
          openTime: candleTime,
        },
      },
    });

    if (!existingCandle) {
      const newCandle = await prisma.candle.create({
        data: {
          symbol,
          interval: '1m',
          openTime: candleTime,
          open: price.toFixed(18),
          high: price.toFixed(18),
          low: price.toFixed(18),
          close: price.toFixed(18),
          volume: quantity.toFixed(18),
          quoteVolume: quoteQuantity.toFixed(18),
          closeTime: new Date(candleTime.getTime() + 59999),
          source: 'INTERNAL',
        },
      });

      await redisPub.publish(`market:${symbol}:kline:1m`, JSON.stringify(newCandle));
    } else {
      const currentHigh = new BigNumber(existingCandle.high.toString());
      const currentLow = new BigNumber(existingCandle.low.toString());
      const currentVol = new BigNumber(existingCandle.volume.toString());
      const currentQuoteVol = new BigNumber((existingCandle.quoteVolume || '0').toString());

      const updatedCandle = await prisma.candle.update({
        where: { id: existingCandle.id },
        data: {
          high: BigNumber.max(currentHigh, price).toFixed(18),
          low: BigNumber.min(currentLow, price).toFixed(18),
          close: price.toFixed(18),
          volume: currentVol.plus(quantity).toFixed(18),
          quoteVolume: currentQuoteVol.plus(quoteQuantity).toFixed(18),
        },
      });

      await redisPub.publish(`market:${symbol}:kline:1m`, JSON.stringify(updatedCandle));
    }

    // Publish 24h Ticker Update
    await this.broadcastTickerUpdate(symbol);
  }

  public async broadcastTickerUpdate(symbol: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const trades24h = await prisma.trade.findMany({
      where: {
        marketId: symbol,
        timestamp: { gte: oneDayAgo },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (trades24h.length === 0) return;

    const lastTrade = trades24h[trades24h.length - 1];
    const firstTrade = trades24h[0];

    let high = new BigNumber(0);
    let low = new BigNumber(Infinity);
    let volume = new BigNumber(0);
    let quoteVolume = new BigNumber(0);

    for (const t of trades24h) {
      const p = new BigNumber(t.price.toString());
      const q = new BigNumber(t.quantity.toString());
      const gq = new BigNumber((t.quoteQuantity || '0').toString());

      if (p.isGreaterThan(high)) high = p;
      if (p.isLessThan(low)) low = p;
      volume = volume.plus(q);
      quoteVolume = quoteVolume.plus(gq);
    }

    const lastPrice = new BigNumber(lastTrade.price.toString());
    const openPrice = new BigNumber(firstTrade.price.toString());
    const priceChange = lastPrice.minus(openPrice);
    const priceChangePercent = openPrice.isZero()
      ? new BigNumber(0)
      : priceChange.dividedBy(openPrice).multipliedBy(100);

    const ticker = {
      symbol,
      lastPrice: lastPrice.toFixed(2),
      openPrice: openPrice.toFixed(2),
      highPrice: high.toFixed(2),
      lowPrice: low.toFixed(2),
      priceChange: priceChange.toFixed(2),
      priceChangePercent: priceChangePercent.toFixed(2),
      volume: volume.toFixed(4),
      quoteVolume: quoteVolume.toFixed(2),
      timestamp: Date.now(),
    };

    await redisPub.publish(`market:${symbol}:ticker`, JSON.stringify(ticker));
  }
}

export const marketDataService = MarketDataService.getInstance();
