import BigNumber from 'bignumber.js';
import { prisma, redisPub } from '../../config/db';
import { matchingEngine, InMemoryOrder } from '../matching/matching.engine';
import { OrderSide, OrderType, OrderSource } from '@prisma/client';

export class SyntheticLiquidityEngine {
  private static instance: SyntheticLiquidityEngine;
  private intervalId: NodeJS.Timeout | null = null;

  // Controlled Reference Prices
  private referencePrices: Record<string, number> = {
    BTCUSDT: 68500.0,
    ETHUSDT: 3500.0,
    SOLUSDT: 145.0,
  };

  private volatilityFactors: Record<string, number> = {
    BTCUSDT: 0.0008,
    ETHUSDT: 0.0012,
    SOLUSDT: 0.0020,
  };

  private stepCounter = 0;

  private constructor() {}

  public static getInstance(): SyntheticLiquidityEngine {
    if (!SyntheticLiquidityEngine.instance) {
      SyntheticLiquidityEngine.instance = new SyntheticLiquidityEngine();
    }
    return SyntheticLiquidityEngine.instance;
  }

  public start() {
    if (this.intervalId) return;
    console.log('🤖 Dynamic Price Engine & Synthetic Trade Generator started');

    this.intervalId = setInterval(async () => {
      this.stepCounter++;
      await this.runSimulationCycle();
    }, 1500); // Ticks every 1.5 seconds for real-time chart animation
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runSimulationCycle() {
    try {
      const markets = await prisma.market.findMany({ where: { status: 'TRADING' } });
      const systemUser = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
      if (!systemUser) return;

      for (const m of markets) {
        const exchangePrice = this.calculateExchangePrice(m.id);
        const spreadPercent = m.liquidityProfile === 'HIGH' ? 0.0003 : 0.0015;

        const bestBid = exchangePrice * (1 - spreadPercent);
        const bestAsk = exchangePrice * (1 + spreadPercent);

        const ob = matchingEngine.getOrCreateOrderBook(m.id);

        // Create Database Order records for system synthetic liquidity to satisfy foreign key constraints
        const synBidQty = new BigNumber((Math.random() * 0.8 + 0.2).toFixed(m.quantityPrecision));
        const synAskQty = new BigNumber((Math.random() * 0.8 + 0.2).toFixed(m.quantityPrecision));

        const dbBidOrder = await prisma.order.create({
          data: {
            userId: systemUser.id,
            marketId: m.id,
            type: OrderType.LIMIT,
            side: OrderSide.BUY,
            price: bestBid.toFixed(m.pricePrecision),
            originalQuantity: synBidQty.toFixed(18),
            executedQuantity: '0',
            remainingQuantity: synBidQty.toFixed(18),
            status: 'OPEN',
            source: OrderSource.SYNTHETIC,
          },
        });

        const dbAskOrder = await prisma.order.create({
          data: {
            userId: systemUser.id,
            marketId: m.id,
            type: OrderType.LIMIT,
            side: OrderSide.SELL,
            price: bestAsk.toFixed(m.pricePrecision),
            originalQuantity: synAskQty.toFixed(18),
            executedQuantity: '0',
            remainingQuantity: synAskQty.toFixed(18),
            status: 'OPEN',
            source: OrderSource.SYNTHETIC,
          },
        });

        const syntheticBid: InMemoryOrder = {
          id: dbBidOrder.id,
          userId: systemUser.id,
          marketId: m.id,
          type: OrderType.LIMIT,
          side: OrderSide.BUY,
          price: new BigNumber(bestBid.toFixed(m.pricePrecision)),
          originalQuantity: synBidQty,
          remainingQuantity: synBidQty,
          executedQuantity: new BigNumber(0),
          source: OrderSource.SYNTHETIC,
          timestamp: Date.now(),
        };

        const syntheticAsk: InMemoryOrder = {
          id: dbAskOrder.id,
          userId: systemUser.id,
          marketId: m.id,
          type: OrderType.LIMIT,
          side: OrderSide.SELL,
          price: new BigNumber(bestAsk.toFixed(m.pricePrecision)),
          originalQuantity: synAskQty,
          remainingQuantity: synAskQty,
          executedQuantity: new BigNumber(0),
          source: OrderSource.SYNTHETIC,
          timestamp: Date.now(),
        };

        ob.addLimitOrder(syntheticBid);
        ob.addLimitOrder(syntheticAsk);

        // Execute Synthetic Trade to generate Trade Event -> Updates Candle Chart & Realtime WS
        if (this.stepCounter % 2 === 0) {
          const tradeQty = new BigNumber((Math.random() * 0.3 + 0.01).toFixed(m.quantityPrecision));
          const tradePrice = new BigNumber(exchangePrice.toFixed(m.pricePrecision));
          const quoteQty = tradeQty.multipliedBy(tradePrice);
          const isBuy = Math.random() > 0.5;

          const tradeEvent = {
            tradeId: `TRD_SYN_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            marketId: m.id,
            price: tradePrice,
            quantity: tradeQty,
            quoteQuantity: quoteQty,
            buyerOrderId: dbBidOrder.id,
            sellerOrderId: dbAskOrder.id,
            buyerUserId: systemUser.id,
            sellerUserId: systemUser.id,
            makerSide: isBuy ? OrderSide.SELL : OrderSide.BUY,
            timestamp: Date.now(),
          };

          // Save to Database Trade table (now referencing valid DB orders!)
          await prisma.trade.create({
            data: {
              tradeId: tradeEvent.tradeId,
              marketId: tradeEvent.marketId,
              price: tradePrice.toFixed(18),
              quantity: tradeQty.toFixed(18),
              quoteQuantity: quoteQty.toFixed(18),
              buyerOrderId: dbBidOrder.id,
              sellerOrderId: dbAskOrder.id,
              buyerUserId: systemUser.id,
              sellerUserId: systemUser.id,
              makerSide: tradeEvent.makerSide,
              timestamp: new Date(tradeEvent.timestamp),
            },
          });

          // Publish Trade Event -> Triggers MarketData Kline Aggregator & WebSocket Gateway
          await redisPub.publish('trade_events', JSON.stringify(tradeEvent));
        }

        // Publish Orderbook Depth Update
        const depth = ob.getDepth(25);
        await redisPub.publish(`market:${m.id}:depth`, JSON.stringify(depth));
      }
    } catch (e: any) {
      console.error('Synthetic Simulation Error:', e.message);
    }
  }

  private calculateExchangePrice(symbol: string): number {
    const refPrice = this.referencePrices[symbol] || 100.0;
    const volatility = this.volatilityFactors[symbol] || 0.001;

    const sineComponent = Math.sin(this.stepCounter / 5) * (refPrice * volatility * 0.5);
    const randomWalk = (Math.random() - 0.49) * (refPrice * volatility);
    const controlledNoise = sineComponent + randomWalk;

    const exchangePrice = refPrice + controlledNoise;
    this.referencePrices[symbol] = refPrice + randomWalk * 0.1;

    return exchangePrice;
  }
}

export const syntheticEngine = SyntheticLiquidityEngine.getInstance();
