import { Router, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, AuthRequest } from '../auth/auth.middleware';
import BigNumber from 'bignumber.js';
import { LedgerService } from '../ledger/ledger.service';

const router = Router();

// GET /api/v1/wallets/balances - Get all asset balances for user
router.get('/balances', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const accounts = await prisma.account.findMany({
      where: { userId: req.user.id },
      include: { asset: true },
    });

    // Group by assetId
    const balancesMap: Record<string, { asset: any; available: string; locked: string; total: string }> = {};

    for (const acc of accounts) {
      if (!balancesMap[acc.assetId]) {
        balancesMap[acc.assetId] = {
          asset: acc.asset,
          available: '0',
          locked: '0',
          total: '0',
        };
      }

      if (acc.type === 'SPOT_AVAILABLE') {
        balancesMap[acc.assetId].available = acc.balance.toString();
      } else if (acc.type === 'SPOT_LOCKED') {
        balancesMap[acc.assetId].locked = acc.balance.toString();
      }
    }

    // Calculate total = available + locked
    const balances = Object.values(balancesMap).map((b) => {
      const availBN = new BigNumber(b.available);
      const lockedBN = new BigNumber(b.locked);
      return {
        ...b,
        total: availBN.plus(lockedBN).toFixed(8),
        available: availBN.toFixed(8),
        locked: lockedBN.toFixed(8),
      };
    });

    return res.json({ balances });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/v1/wallets/deposit-address - Generate/fetch testnet deposit address
router.get('/deposit-address', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { networkId } = req.query;

    // Standard simulated Sepolia address based on userId hash
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

    // Lock funds using ledger transaction
    await prisma.$transaction(async (tx) => {
      await LedgerService.lockFunds(tx, req.user!.id, assetId, totalDeduct);

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
