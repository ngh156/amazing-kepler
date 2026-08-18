import { Router, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, AuthRequest } from '../auth/auth.middleware';
import { tradeLimiter } from '../../middleware/rate-limiter.middleware';
import BigNumber from 'bignumber.js';
import { AccountType } from '@prisma/client';

const router = Router();

// GET /api/v1/wallets/balances - Get Sub-Account Balances (Fiat, Spot, Futures, P2P Escrow)
router.get('/balances', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const accounts = await prisma.account.findMany({
      where: { userId: req.user.id },
      include: { asset: true },
    });

    const balancesMap: Record<string, {
      asset: any;
      available: string;
      locked: string;
      futuresMargin: string;
      p2pEscrow: string;
      total: string;
    }> = {};

    for (const acc of accounts) {
      if (!balancesMap[acc.assetId]) {
        balancesMap[acc.assetId] = {
          asset: acc.asset,
          available: '0',
          locked: '0',
          futuresMargin: '0',
          p2pEscrow: '0',
          total: '0',
        };
      }

      const balStr = acc.balance.toString();
      if (acc.type === AccountType.SPOT_AVAILABLE) {
        balancesMap[acc.assetId].available = balStr;
      } else if (acc.type === AccountType.SPOT_LOCKED) {
        balancesMap[acc.assetId].locked = balStr;
      } else if (acc.type === AccountType.FUTURES_MARGIN) {
        balancesMap[acc.assetId].futuresMargin = balStr;
      } else if (acc.type === AccountType.P2P_ESCROW) {
        balancesMap[acc.assetId].p2pEscrow = balStr;
      }
    }

    const balances = Object.values(balancesMap).map((b) => {
      const availBN = new BigNumber(b.available);
      const lockedBN = new BigNumber(b.locked);
      const futuresBN = new BigNumber(b.futuresMargin);
      const p2pBN = new BigNumber(b.p2pEscrow);
      const totalBN = availBN.plus(lockedBN).plus(futuresBN).plus(p2pBN);

      return {
        ...b,
        total: totalBN.toFixed(8),
        available: availBN.toFixed(8),
        locked: lockedBN.toFixed(8),
        futuresMargin: futuresBN.toFixed(8),
        p2pEscrow: p2pBN.toFixed(8),
      };
    });

    return res.json({ balances });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/wallets/internal-transfer - Enforce Fiat ↔ Spot ↔ Futures Rules & Record Audit Ledger
router.post('/internal-transfer', tradeLimiter, authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { fromWallet, toWallet, assetId, amount } = req.body;
    if (!fromWallet || !toWallet || !assetId || !amount) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Missing parameters' });
    }

    if (fromWallet === toWallet) {
      return res.status(400).json({ error: 'SAME_WALLET', message: 'Ví nguồn và Ví đích không được trùng nhau' });
    }

    // Rule 4: Transfer Flow Enforcement (Fiat ↔ Spot ↔ Futures)
    if ((fromWallet === 'FIAT' && toWallet === 'FUTURES') || (fromWallet === 'FUTURES' && toWallet === 'FIAT')) {
      return res.status(400).json({
        error: 'INVALID_TRANSFER_PATH',
        message: 'Giao dịch chuyển tiền phải tuân thủ quy tắc: Fiat ↔ Spot ↔ Futures. Không được chuyển trực tiếp giữa Fiat và Futures!',
      });
    }

    const xferBN = new BigNumber(amount);
    if (xferBN.isLessThanOrEqualTo(0)) {
      return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'Số tiền chuyển phải lớn hơn 0' });
    }

    const getAccountType = (wallet: string): AccountType => {
      if (wallet === 'FIAT') return AccountType.SPOT_AVAILABLE;
      if (wallet === 'FUTURES') return AccountType.FUTURES_MARGIN;
      return AccountType.SPOT_AVAILABLE;
    };

    const sourceAccType = getAccountType(fromWallet);
    const targetAccType = getAccountType(toWallet);

    await prisma.$transaction(async (tx) => {
      const sourceAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId, type: sourceAccType } },
      });

      const sourceAvailBN = new BigNumber(sourceAcc?.balance.toString() || '0');
      if (sourceAvailBN.isLessThan(xferBN)) {
        throw new Error(`Số dư khả dụng trong Ví ${fromWallet} không đủ! (Khả dụng: ${sourceAvailBN.toFixed(4)} ${assetId})`);
      }

      const newSourceBal = sourceAvailBN.minus(xferBN);
      await tx.account.update({
        where: { userId_assetId_type: { userId: req.user!.id, assetId, type: sourceAccType } },
        data: { balance: newSourceBal.toFixed(18) },
      });

      const targetAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId, type: targetAccType } },
      });

      const targetAvailBN = new BigNumber(targetAcc?.balance.toString() || '0');
      const newTargetBal = targetAvailBN.plus(xferBN);

      await tx.account.upsert({
        where: { userId_assetId_type: { userId: req.user!.id, assetId, type: targetAccType } },
        update: { balance: newTargetBal.toFixed(18) },
        create: { userId: req.user!.id, assetId, type: targetAccType, balance: newTargetBal.toFixed(18) },
      });

      // Record Audit Log Entry
      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: 'INTERNAL_TRANSFER',
          resource: `wallet:${fromWallet}_to_${toWallet}`,
          metadata: JSON.stringify({
            fromWallet,
            toWallet,
            assetId,
            amount: xferBN.toFixed(8),
            sourceNewBalance: newSourceBal.toFixed(8),
            targetNewBalance: newTargetBal.toFixed(8),
            timestamp: new Date().toISOString(),
          }),
        },
      });
    }, {
      isolationLevel: 'Serializable',
    });

    return res.json({
      message: `Chuyển thành công ${amount} ${assetId} từ Ví ${fromWallet} sang Ví ${toWallet}!`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: 'TRANSFER_FAILED', message: err.message });
  }
});

// GET /api/v1/wallets/ledger-history - Fetch Audit Ledger History for User
router.get('/ledger-history', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const logs = await prisma.auditLog.findMany({
      where: { actorId: req.user.id, action: 'INTERNAL_TRANSFER' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const parsedLogs = logs.map((log) => ({
      ...log,
      payload: log.metadata ? JSON.parse(log.metadata) : {},
    }));

    return res.json({ logs: parsedLogs });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/v1/wallets/deposit-address - Generate deposit address
router.get('/deposit-address', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { networkId } = req.query;

    const mockAddress = `0x${req.user.id.replace(/-/g, '').substring(0, 40)}`;

    return res.json({
      address: mockAddress,
      networkId: networkId || 'ETH_SEPOLIA',
      memo: null,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${mockAddress}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/wallets/withdraw - Submit withdrawal request
router.post('/withdraw', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { assetId, networkId, toAddress, amount } = req.body;
    if (!assetId || !networkId || !toAddress || !amount) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Missing parameters' });
    }

    const withdrawAmount = new BigNumber(amount);
    if (withdrawAmount.isLessThanOrEqualTo(0)) {
      return res.status(400).json({ error: 'INVALID_AMOUNT' });
    }

    const assetNetwork = await prisma.assetNetwork.findUnique({
      where: { assetId_networkId: { assetId, networkId } },
    });

    if (!assetNetwork || !assetNetwork.withdrawalEnabled) {
      return res.status(400).json({ error: 'WITHDRAWAL_DISABLED', message: 'Withdrawals disabled for asset/network' });
    }

    const fee = new BigNumber(assetNetwork.withdrawalFee.toString());
    const totalDeduct = withdrawAmount.plus(fee);

    await prisma.$transaction(async (tx) => {
      // Lock funds from SPOT_AVAILABLE
      const availAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: req.user!.id, assetId, type: AccountType.SPOT_AVAILABLE } },
      });

      if (!availAcc || new BigNumber(availAcc.balance.toString()).isLessThan(totalDeduct)) {
        throw new Error('Số dư Spot khả dụng không đủ để rút!');
      }

      await tx.account.update({
        where: { id: availAcc.id },
        data: { balance: new BigNumber(availAcc.balance.toString()).minus(totalDeduct).toFixed(18) },
      });

      await tx.withdrawal.create({
        data: {
          userId: req.user!.id,
          assetId,
          networkId,
          toAddress,
          amount: withdrawAmount.toFixed(18),
          fee: fee.toFixed(18),
          status: 'PENDING',
        },
      });
    });

    return res.status(201).json({ message: 'Withdrawal request submitted successfully' });
  } catch (err: any) {
    return res.status(400).json({ error: 'WITHDRAWAL_FAILED', message: err.message });
  }
});

export default router;
