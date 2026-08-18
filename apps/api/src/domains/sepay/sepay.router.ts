import { Router, Request, Response } from 'express';
import { prisma, redisPub } from '../../config/db';
import { ENV } from '../../config/env';
import { authenticateJWT, AuthRequest } from '../auth/auth.middleware';
import BigNumber from 'bignumber.js';

const router = Router();
const VND_USDT_RATE = 25400; // 1 USDT = 25,400 VNĐ

// Bank account info for sePay VietQR
const SEPAY_BANK_CONFIG = {
  bankName: 'MBBank',
  bankBin: '970422',
  accountNo: '0123456789',
  accountName: 'CONG TY CP APEX KEPLER EXCHANGES',
};

// ── 1. Create VietQR Deposit Order ───────────────────────────────────────────
router.post('/deposit-qr', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { amountVND } = req.body;
    const vndNum = parseFloat(amountVND);

    if (!vndNum || vndNum < 50000) {
      return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'Minimum deposit is 50,000 VNĐ (~2 USDT)' });
    }

    const amountUSDT = Math.round((vndNum / VND_USDT_RATE) * 100) / 100;
    const randomCode = 'KP' + Math.floor(100000 + Math.random() * 900000);

    // Generate sePay VietQR Image URL
    const qrUrl = `https://qr.sepay.vn/img?bank=${SEPAY_BANK_CONFIG.bankName}&acc=${SEPAY_BANK_CONFIG.accountNo}&template=compact&amount=${vndNum}&des=${randomCode}`;

    const deposit = await prisma.fiatDeposit.create({
      data: {
        userId: req.user!.id,
        code: randomCode,
        amountVND: vndNum,
        amountUSDT,
        rateVND: VND_USDT_RATE,
        status: 'PENDING',
        bankName: SEPAY_BANK_CONFIG.bankName,
        accountNo: SEPAY_BANK_CONFIG.accountNo,
        accountName: SEPAY_BANK_CONFIG.accountName,
        qrUrl,
        transactionContent: randomCode,
      },
    });

    return res.json({
      success: true,
      deposit,
      bankConfig: SEPAY_BANK_CONFIG,
      qrUrl,
      instruction: `Please scan the VietQR code or transfer exactly ${vndNum.toLocaleString()} VNĐ with Content: "${randomCode}"`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'CREATE_DEPOSIT_FAILED', message: err.message });
  }
});

// ── 2. Official sePay Webhook Receiver (Hardened Security) ───────────────────
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const {
      id: sepayTxId,
      gateway,
      accountNumber,
      amountIn,
      transactionContent,
      body,
    } = req.body;

    // 1. Webhook Signature / API Key Security Check
    const authHeader = (req.headers['authorization'] || req.headers['x-sepay-api-key'] || '').toString();
    const expectedSecret = ENV.SEPAY_WEBHOOK_KEY || 'Apikey SEPAY_SECRET_WEBHOOK_TOKEN_2026';
    if (ENV.NODE_ENV === 'production' && authHeader !== expectedSecret) {
      console.warn(`⚠️ [sePay Webhook Security] Unauthorized Webhook Request Attempt! IP: ${req.ip}`);
      return res.status(401).json({ error: 'UNAUTHORIZED_WEBHOOK_SIGNATURE', message: 'Invalid sePay webhook authorization header' });
    }

    console.log(`📡 [sePay Webhook] Incoming Bank Payment: +${amountIn} VNĐ | Content: "${transactionContent || body}" | Gateway: ${gateway}`);

    const rawContent = (transactionContent || body || '').toString().toUpperCase();

    // Match code KPxxxxx in transaction content
    const match = rawContent.match(/KP\d{6}/);
    if (!match) {
      console.warn(`[sePay Webhook] No matching KPxxxxx transfer code found in body: "${rawContent}"`);
      return res.json({ success: true, message: 'Webhook received but no matching code found' });
    }

    const code = match[0];
    const deposit = await prisma.fiatDeposit.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!deposit) {
      console.warn(`[sePay Webhook] Deposit code ${code} not found in database`);
      return res.json({ success: true, message: 'Deposit code not found' });
    }

    if (deposit.status === 'COMPLETED') {
      return res.json({ success: true, message: 'Deposit already processed' });
    }

    // 2. Strict Transfer Amount Validation (Prevent underpayment fraud)
    const receivedVND = parseFloat(String(amountIn || 0));
    if (receivedVND < deposit.amountVND) {
      console.warn(`⚠️ [sePay Webhook Fraud Alert] Transferred amount ${receivedVND} VNĐ is less than deposit order ${deposit.amountVND} VNĐ for code ${code}!`);
      return res.status(400).json({ error: 'INSUFFICIENT_TRANSFER_AMOUNT', message: 'Số tiền chuyển khoản thực tế nhỏ hơn đơn hàng đặt nạp!' });
    }

    // Process & Credit User Wallet via LedgerService
    await prisma.$transaction(async (tx) => {
      // 1. Update FiatDeposit record to COMPLETED
      await tx.fiatDeposit.update({
        where: { id: deposit.id },
        data: {
          status: 'COMPLETED',
          sepayTxId: sepayTxId ? String(sepayTxId) : undefined,
          completedAt: new Date(),
        },
      });

      // 2. Credit SPOT_AVAILABLE USDT wallet
      const userSpotAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: deposit.userId, assetId: 'USDT', type: 'SPOT_AVAILABLE' } },
      });

      if (userSpotAcc) {
        const currentBal = new BigNumber(userSpotAcc.balance.toString());
        await tx.account.update({
          where: { id: userSpotAcc.id },
          data: { balance: currentBal.plus(new BigNumber(deposit.amountUSDT.toString())).toFixed(18) },
        });
      }
    });

    console.log(`✅ [sePay Webhook] Successfully credited +$${deposit.amountUSDT} USDT (${deposit.amountVND.toLocaleString()} VNĐ) to User ${deposit.userId}`);

    // Notify user web frontend via Redis / Socket.io
    await redisPub.publish('wallet:fiat_deposit_success', JSON.stringify({
      userId: deposit.userId,
      code: deposit.code,
      amountVND: deposit.amountVND,
      amountUSDT: deposit.amountUSDT,
      timestamp: Date.now(),
    }));

    return res.json({ success: true, message: `Successfully credited +${deposit.amountUSDT} USDT to user` });
  } catch (err: any) {
    console.error('❌ [sePay Webhook Error]:', err.message);
    return res.status(500).json({ error: 'WEBHOOK_FAILED', message: err.message });
  }
});

// ── 3. Get User Deposit History ──────────────────────────────────────────────
router.get('/history', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const deposits = await prisma.fiatDeposit.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ deposits });
  } catch (err: any) {
    return res.status(500).json({ error: 'FETCH_FAILED', message: err.message });
  }
});

// ── 4. Simulate sePay Webhook (Demo Purpose) ─────────────────────────────────
router.post('/simulate-webhook', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const deposit = await prisma.fiatDeposit.findUnique({ where: { code } });

    if (!deposit) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Deposit code not found' });
    }

    if (deposit.status === 'COMPLETED') {
      return res.status(400).json({ error: 'ALREADY_COMPLETED', message: 'Deposit is already completed' });
    }

    // Trigger simulated bank deposit payload
    await prisma.$transaction(async (tx) => {
      await tx.fiatDeposit.update({
        where: { id: deposit.id },
        data: {
          status: 'COMPLETED',
          sepayTxId: 'SIMULATED_' + Date.now(),
          completedAt: new Date(),
        },
      });

      const userSpotAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: deposit.userId, assetId: 'USDT', type: 'SPOT_AVAILABLE' } },
      });

      if (userSpotAcc) {
        const currentBal = new BigNumber(userSpotAcc.balance.toString());
        await tx.account.update({
          where: { id: userSpotAcc.id },
          data: { balance: currentBal.plus(new BigNumber(deposit.amountUSDT.toString())).toFixed(18) },
        });
      }
    });

    await redisPub.publish('wallet:fiat_deposit_success', JSON.stringify({
      userId: deposit.userId,
      code: deposit.code,
      amountVND: deposit.amountVND,
      amountUSDT: deposit.amountUSDT,
      timestamp: Date.now(),
    }));

    return res.json({
      success: true,
      message: `Simulated sePay Webhook Success! Credited +${deposit.amountUSDT} USDT (${deposit.amountVND.toLocaleString()} VNĐ) to your wallet balance.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SIMULATION_FAILED', message: err.message });
  }
});

export default router;
