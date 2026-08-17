import BigNumber from 'bignumber.js';
import { OrderSide, OrderType, OrderSource } from '@prisma/client';
import { prisma, redisPub } from '../../config/db';
import { LedgerService } from '../ledger/ledger.service';

export interface InMemoryOrder {
  id: string;
  userId: string;
  marketId: string;
  type: OrderType;
  side: OrderSide;
  price: BigNumber;
  originalQuantity: BigNumber;
  remainingQuantity: BigNumber;
  executedQuantity: BigNumber;
  source: OrderSource;
  timestamp: number;
}

export interface TradeMatchResult {
  tradeId: string;
  marketId: string;
  price: BigNumber;
  quantity: BigNumber;
  quoteQuantity: BigNumber;
  buyerOrderId: string;
  sellerOrderId: string;
  buyerUserId: string;
  sellerUserId: string;
  makerSide: OrderSide;
  timestamp: number;
}

export class OrderBook {
  public symbol: string;
  public bids: InMemoryOrder[] = []; // Price DESC, Time ASC
  public asks: InMemoryOrder[] = []; // Price ASC, Time ASC

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  /**
   * Insert Limit Order into OrderBook maintaining Price-Time priority
   */
  public addLimitOrder(order: InMemoryOrder): void {
    if (order.side === OrderSide.BUY) {
      this.bids.push(order);
      this.bids.sort((a, b) => {
        if (b.price.isEqualTo(a.price)) {
          return a.timestamp - b.timestamp;
        }
        return b.price.minus(a.price).toNumber();
      });
    } else {
      this.asks.push(order);
      this.asks.sort((a, b) => {
        if (a.price.isEqualTo(b.price)) {
          return a.timestamp - b.timestamp;
        }
        return a.price.minus(b.price).toNumber();
      });
    }
  }

  /**
   * Remove order from memory (e.g. cancelled)
   */
  public removeOrder(orderId: string): InMemoryOrder | null {
    const bidIdx = this.bids.findIndex((o) => o.id === orderId);
    if (bidIdx !== -1) {
      return this.bids.splice(bidIdx, 1)[0];
    }
    const askIdx = this.asks.findIndex((o) => o.id === orderId);
    if (askIdx !== -1) {
      return this.asks.splice(askIdx, 1)[0];
    }
    return null;
  }

  /**
   * Get Depth Snapshot
   */
  public getDepth(limit: number = 20) {
    // Aggregate bids by price
    const bidMap = new Map<string, BigNumber>();
    for (const b of this.bids) {
      const pStr = b.price.toFixed(2);
      const curr = bidMap.get(pStr) || new BigNumber(0);
      bidMap.set(pStr, curr.plus(b.remainingQuantity));
    }

    // Aggregate asks by price
    const askMap = new Map<string, BigNumber>();
    for (const a of this.asks) {
      const pStr = a.price.toFixed(2);
      const curr = askMap.get(pStr) || new BigNumber(0);
      askMap.set(pStr, curr.plus(a.remainingQuantity));
    }

    const bids = Array.from(bidMap.entries())
      .map(([price, qty]) => [price, qty.toFixed(4)])
      .slice(0, limit);

    const asks = Array.from(askMap.entries())
      .map(([price, qty]) => [price, qty.toFixed(4)])
      .slice(0, limit);

    return { bids, asks };
  }
}

export class MatchingEngineManager {
  private static instance: MatchingEngineManager;
  public orderbooks: Map<string, OrderBook> = new Map();

  private constructor() {}

  public static getInstance(): MatchingEngineManager {
    if (!MatchingEngineManager.instance) {
      MatchingEngineManager.instance = new MatchingEngineManager();
    }
    return MatchingEngineManager.instance;
  }

  public getOrCreateOrderBook(marketId: string): OrderBook {
    let ob = this.orderbooks.get(marketId);
    if (!ob) {
      ob = new OrderBook(marketId);
      this.orderbooks.set(marketId, ob);
    }
    return ob;
  }

  /**
   * Match an incoming order against the orderbook
   */
  public async processOrder(incomingOrder: InMemoryOrder): Promise<TradeMatchResult[]> {
    const ob = this.getOrCreateOrderBook(incomingOrder.marketId);
    const trades: TradeMatchResult[] = [];

    const market = await prisma.market.findUnique({ where: { id: incomingOrder.marketId } });
    if (!market) throw new Error('MARKET_NOT_FOUND');

    if (incomingOrder.side === OrderSide.BUY) {
      // Match incoming BUY against Asks
      while (ob.asks.length > 0 && incomingOrder.remainingQuantity.isGreaterThan(0)) {
        const bestAsk = ob.asks[0];

        // For Limit Buy, price must be >= Best Ask
        if (incomingOrder.type === OrderType.LIMIT && incomingOrder.price.isLessThan(bestAsk.price)) {
          break; // Price condition not satisfied
        }

        // Determine execution quantity
        const matchQty = BigNumber.min(incomingOrder.remainingQuantity, bestAsk.remainingQuantity);
        const matchPrice = bestAsk.price; // Price of resting maker order
        const quoteQty = matchQty.multipliedBy(matchPrice);

        // Update quantities
        incomingOrder.remainingQuantity = incomingOrder.remainingQuantity.minus(matchQty);
        incomingOrder.executedQuantity = incomingOrder.executedQuantity.plus(matchQty);

        bestAsk.remainingQuantity = bestAsk.remainingQuantity.minus(matchQty);
        bestAsk.executedQuantity = bestAsk.executedQuantity.plus(matchQty);

        const tradeResult: TradeMatchResult = {
          tradeId: `TRD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          marketId: incomingOrder.marketId,
          price: matchPrice,
          quantity: matchQty,
          quoteQuantity: quoteQty,
          buyerOrderId: incomingOrder.id,
          sellerOrderId: bestAsk.id,
          buyerUserId: incomingOrder.userId,
          sellerUserId: bestAsk.userId,
          makerSide: OrderSide.SELL,
          timestamp: Date.now(),
        };

        trades.push(tradeResult);

        // If ask is fully filled, remove from orderbook
        if (bestAsk.remainingQuantity.isEqualTo(0)) {
          ob.asks.shift();
        }

        // Persist trade execution & update database balances via Ledger
        await this.executeTradeSettlement(market, tradeResult, incomingOrder, bestAsk);
      }

      // If incoming Limit order still has remaining quantity, add to Bids
      if (incomingOrder.type === OrderType.LIMIT && incomingOrder.remainingQuantity.isGreaterThan(0)) {
        ob.addLimitOrder(incomingOrder);
      }
    } else {
      // Match incoming SELL against Bids
      while (ob.bids.length > 0 && incomingOrder.remainingQuantity.isGreaterThan(0)) {
        const bestBid = ob.bids[0];

        if (incomingOrder.type === OrderType.LIMIT && incomingOrder.price.isGreaterThan(bestBid.price)) {
          break;
        }

        const matchQty = BigNumber.min(incomingOrder.remainingQuantity, bestBid.remainingQuantity);
        const matchPrice = bestBid.price;
        const quoteQty = matchQty.multipliedBy(matchPrice);

        incomingOrder.remainingQuantity = incomingOrder.remainingQuantity.minus(matchQty);
        incomingOrder.executedQuantity = incomingOrder.executedQuantity.plus(matchQty);

        bestBid.remainingQuantity = bestBid.remainingQuantity.minus(matchQty);
        bestBid.executedQuantity = bestBid.executedQuantity.plus(matchQty);

        const tradeResult: TradeMatchResult = {
          tradeId: `TRD_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          marketId: incomingOrder.marketId,
          price: matchPrice,
          quantity: matchQty,
          quoteQuantity: quoteQty,
          buyerOrderId: bestBid.id,
          sellerOrderId: incomingOrder.id,
          buyerUserId: bestBid.userId,
          sellerUserId: incomingOrder.userId,
          makerSide: OrderSide.BUY,
          timestamp: Date.now(),
        };

        trades.push(tradeResult);

        if (bestBid.remainingQuantity.isEqualTo(0)) {
          ob.bids.shift();
        }

        await this.executeTradeSettlement(market, tradeResult, bestBid, incomingOrder);
      }

      if (incomingOrder.type === OrderType.LIMIT && incomingOrder.remainingQuantity.isGreaterThan(0)) {
        ob.addLimitOrder(incomingOrder);
      }
    }

    // Update incoming order DB record
    await prisma.order.update({
      where: { id: incomingOrder.id },
      data: {
        executedQuantity: incomingOrder.executedQuantity.toFixed(18),
        remainingQuantity: incomingOrder.remainingQuantity.toFixed(18),
        status: incomingOrder.remainingQuantity.isEqualTo(0)
          ? 'FILLED'
          : incomingOrder.executedQuantity.isGreaterThan(0)
          ? 'PARTIALLY_FILLED'
          : 'OPEN',
      },
    });

    // Publish Orderbook Depth Update to Redis
    const depth = ob.getDepth();
    await redisPub.publish(`market:${incomingOrder.marketId}:depth`, JSON.stringify(depth));

    return trades;
  }

  /**
   * Settle trade in Database transaction & broadcast Trade Event
   */
  private async executeTradeSettlement(
    market: any,
    trade: TradeMatchResult,
    buyerOrder: InMemoryOrder,
    sellerOrder: InMemoryOrder
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Create Trade Record
      await tx.trade.create({
        data: {
          tradeId: trade.tradeId,
          marketId: trade.marketId,
          price: trade.price.toFixed(18),
          quantity: trade.quantity.toFixed(18),
          quoteQuantity: trade.quoteQuantity.toFixed(18),
          buyerOrderId: buyerOrder.id,
          sellerOrderId: sellerOrder.id,
          buyerUserId: buyerOrder.userId,
          sellerUserId: sellerOrder.userId,
          makerSide: trade.makerSide,
          timestamp: new Date(trade.timestamp),
        },
      });

      // 2. Update Maker Order status in DB
      const makerOrder = trade.makerSide === OrderSide.BUY ? buyerOrder : sellerOrder;
      await tx.order.update({
        where: { id: makerOrder.id },
        data: {
          executedQuantity: makerOrder.executedQuantity.toFixed(18),
          remainingQuantity: makerOrder.remainingQuantity.toFixed(18),
          status: makerOrder.remainingQuantity.isEqualTo(0) ? 'FILLED' : 'PARTIALLY_FILLED',
        },
      });

      // 3. Settle Ledger Balances
      await LedgerService.settleTrade(tx, {
        tradeId: trade.tradeId,
        baseAssetId: market.baseAssetId,
        quoteAssetId: market.quoteAssetId,
        buyerUserId: buyerOrder.userId,
        sellerUserId: sellerOrder.userId,
        price: trade.price,
        quantity: trade.quantity,
        quoteQuantity: trade.quoteQuantity,
      });
    });

    // 4. Publish Trade Event for Market Data Services (Candles, Tickers, WebSocket)
    await redisPub.publish('trade_events', JSON.stringify(trade));
  }
}

export const matchingEngine = MatchingEngineManager.getInstance();
