import { Router, Response } from 'express';
import BigNumber from 'bignumber.js';
import { prisma } from '../../config/db';
import { authenticateJWT, AuthRequest } from '../auth/auth.middleware';
import { AccountType, PositionSide } from '@prisma/client';
import { priceEngine } from '../market-data/price-engine.service';
import { candleAggregator } from '../market-data/candle-aggregator.service';

const router = Router();

// POST /api/v1/futures/positions - Open or Aggregate Futures Long/Short position with Leverage (1x - 100x)
router.post('/positions', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { marketId, side, size, leverage = 10, entryPrice } = req.body;

    if (!marketId || !side || !size || !entryPrice) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Missing parameters' });
    }

    const lev = Math.min(Math.max(Number(leverage), 1), 10000);
    const sizeBN = new BigNumber(size);
    const entryBN = new BigNumber(entryPrice);
    const notionalBN = sizeBN.multipliedBy(entryBN);

    // Initial Margin required = Notional / Leverage
    const marginBN = notionalBN.dividedBy(lev);

    let position: any;

    await prisma.$transaction(async (tx) => {
      // 1. Deduct Margin from Spot Available -> Futures Margin Account
      const availAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId: 'USDT', type: AccountType.SPOT_AVAILABLE } },
      });

      if (!availAcc || new BigNumber(availAcc.balance.toString()).isLessThan(marginBN)) {
        throw new Error(`INSUFFICIENT_MARGIN: Required ${marginBN.toFixed(2)} USDT margin, available ${availAcc ? availAcc.balance : 0}`);
      }

      let marginAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId: 'USDT', type: AccountType.FUTURES_MARGIN } },
      });

      if (!marginAcc) {
        marginAcc = await tx.account.create({
          data: { userId: req.user!.id, assetId: 'USDT', type: AccountType.FUTURES_MARGIN, balance: 0 },
        });
      }

      await tx.account.update({
        where: { id: availAcc.id },
        data: { balance: new BigNumber(availAcc.balance.toString()).minus(marginBN).toFixed(18) },
      });

      await tx.account.update({
        where: { id: marginAcc.id },
        data: { balance: new BigNumber(marginAcc.balance.toString()).plus(marginBN).toFixed(18) },
      });

      // 2. Check for existing OPEN position for this user, market, and side to aggregate (DCA Dollar-Cost Averaging)
      const existingPos = await tx.futuresPosition.findFirst({
        where: {
          userId: req.user!.id,
          marketId,
          side: side as PositionSide,
          status: 'OPEN',
        },
      });

      if (existingPos) {
        const existingSizeBN = new BigNumber(existingPos.size.toString());
        const existingEntryBN = new BigNumber(existingPos.entryPrice.toString());
        const existingMarginBN = new BigNumber(existingPos.margin.toString());

        const newTotalSizeBN = existingSizeBN.plus(sizeBN);
        const newTotalMarginBN = existingMarginBN.plus(marginBN);

        // Weighted Average Entry Price = ((Size1 * Price1) + (Size2 * Price2)) / TotalSize
        const weightedEntryBN = existingSizeBN
          .multipliedBy(existingEntryBN)
          .plus(sizeBN.multipliedBy(entryBN))
          .dividedBy(newTotalSizeBN);

        let newLiqPriceBN: BigNumber;
        if (side === 'LONG') {
          newLiqPriceBN = weightedEntryBN.multipliedBy(new BigNumber(1).minus(new BigNumber(0.9).dividedBy(lev)));
        } else {
          newLiqPriceBN = weightedEntryBN.multipliedBy(new BigNumber(1).plus(new BigNumber(0.9).dividedBy(lev)));
        }

        position = await tx.futuresPosition.update({
          where: { id: existingPos.id },
          data: {
            entryPrice: weightedEntryBN.toFixed(18),
            markPrice: entryBN.toFixed(18),
            liquidationPrice: newLiqPriceBN.toFixed(18),
            size: newTotalSizeBN.toFixed(18),
            margin: newTotalMarginBN.toFixed(18),
            leverage: lev,
          },
        });
      } else {
        let liqPriceBN: BigNumber;
        if (side === 'LONG') {
          liqPriceBN = entryBN.multipliedBy(new BigNumber(1).minus(new BigNumber(0.9).dividedBy(lev)));
        } else {
          liqPriceBN = entryBN.multipliedBy(new BigNumber(1).plus(new BigNumber(0.9).dividedBy(lev)));
        }

        position = await tx.futuresPosition.create({
          data: {
            userId: req.user!.id,
            marketId,
            side: side as PositionSide,
            entryPrice: entryBN.toFixed(18),
            markPrice: entryBN.toFixed(18),
            liquidationPrice: liqPriceBN.toFixed(18),
            size: sizeBN.toFixed(18),
            margin: marginBN.toFixed(18),
            leverage: lev,
            status: 'OPEN',
          },
        });
      }
    });

    return res.status(201).json({ position });
  } catch (err: any) {
    return res.status(400).json({ error: 'FUTURES_POSITION_FAILED', message: err.message });
  }
});

// GET /api/v1/futures/positions - Fetch User Futures Positions
router.get('/positions', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const statusParam = (req.query.status as string) || 'OPEN';
    const whereClause: any = { userId: req.user.id };

    if (statusParam === 'OPEN') {
      whereClause.status = 'OPEN';
    } else if (statusParam === 'CLOSED') {
      whereClause.status = { in: ['CLOSED', 'LIQUIDATED'] };
    }

    const positions = await prisma.futuresPosition.findMany({
      where: whereClause,
      include: { market: true },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({ positions });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/v1/futures/history - Fetch Closed Trade & Liquidation History
router.get('/history', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const history = await prisma.futuresPosition.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['CLOSED', 'LIQUIDATED'] },
      },
      include: { market: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/futures/positions/:id/close - Close Position & Settle Realized PnL to Wallet Balance
router.post('/positions/:id/close', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const position = await prisma.futuresPosition.findUnique({ where: { id: req.params.id } });
    if (!position || position.userId !== req.user.id || position.status !== 'OPEN') {
      return res.status(404).json({ error: 'POSITION_NOT_FOUND' });
    }

    const marginBN = new BigNumber(position.margin.toString());
    const sizeBN = new BigNumber(position.size.toString());
    const entryBN = new BigNumber(position.entryPrice.toString());

    // Fetch current live mark price for exact settlement
    const tickerRes = await priceEngine.transformPrice(position.marketId, Number(position.entryPrice));
    const live = candleAggregator.getLiveCandle(position.marketId, '1m');
    const closePriceBN = new BigNumber(live?.close ?? tickerRes);

    // Calculate Realized PnL = (ClosePrice - EntryPrice) * Size for LONG, (EntryPrice - ClosePrice) * Size for SHORT
    let pnlBN: BigNumber;
    if (position.side === 'LONG') {
      pnlBN = closePriceBN.minus(entryBN).multipliedBy(sizeBN);
    } else {
      pnlBN = entryBN.minus(closePriceBN).multipliedBy(sizeBN);
    }

    // Settled Return Amount = Margin + Realized PnL (Clamped to >= 0)
    const returnAmountBN = BigNumber.max(0, marginBN.plus(pnlBN));

    await prisma.$transaction(async (tx) => {
      // 1. Deduct Margin from Futures Margin Account
      const marginAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId: 'USDT', type: AccountType.FUTURES_MARGIN } },
      });

      if (marginAcc) {
        await tx.account.update({
          where: { id: marginAcc.id },
          data: { balance: BigNumber.max(0, new BigNumber(marginAcc.balance.toString()).minus(marginBN)).toFixed(18) },
        });
      }

      // 2. Return (Margin + Realized PnL) to Spot Available Balance!
      const availAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId: 'USDT', type: AccountType.SPOT_AVAILABLE } },
      });

      if (availAcc) {
        await tx.account.update({
          where: { id: availAcc.id },
          data: { balance: new BigNumber(availAcc.balance.toString()).plus(returnAmountBN).toFixed(18) },
        });
      }

      // 3. Mark position as CLOSED
      await tx.futuresPosition.update({
        where: { id: position.id },
        data: {
          status: 'CLOSED',
          markPrice: closePriceBN.toFixed(18),
        },
      });
    });

    const pnlStr = pnlBN.isGreaterThanOrEqualTo(0) ? `+${pnlBN.toFixed(2)}` : pnlBN.toFixed(2);
    return res.json({
      message: `Position closed! Realized PnL: ${pnlStr} USDT settled to your USDT balance.`,
      pnl: pnlBN.toFixed(2),
      returnedAmount: returnAmountBN.toFixed(2),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'CLOSE_FAILED', message: err.message });
  }
});

export default router;
