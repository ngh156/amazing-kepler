import { Router, Response } from 'express';
import BigNumber from 'bignumber.js';
import { prisma } from '../../config/db';
import { authenticateJWT, AuthRequest } from '../auth/auth.middleware';
import { AccountType } from '@prisma/client';

const router = Router();

// GET /api/v1/p2p/ads - List P2P Advertisements
router.get('/ads', async (req, res: Response) => {
  try {
    const { type = 'SELL', assetId = 'USDT', fiatSymbol = 'VND' } = req.query;

    const ads = await prisma.p2PAdvertisement.findMany({
      where: {
        type: type as any,
        assetId: assetId as string,
        fiatSymbol: fiatSymbol as string,
        status: 'ONLINE',
      },
      include: {
        merchant: {
          select: { id: true, nickname: true, email: true, kycLevel: true },
        },
        asset: true,
      },
      orderBy: { price: type === 'SELL' ? 'asc' : 'desc' },
    });

    return res.json({ ads });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/p2p/ads - Merchant Create Ad
router.post('/ads', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { type, assetId, fiatSymbol = 'VND', price, availableQuantity, minLimit, maxLimit, paymentMethods, terms } = req.body;

    const ad = await prisma.p2PAdvertisement.create({
      data: {
        merchantId: req.user.id,
        type,
        assetId,
        fiatSymbol,
        price,
        availableQuantity,
        minLimit,
        maxLimit,
        paymentMethods: JSON.stringify(paymentMethods || ['BANK_TRANSFER']),
        terms,
        status: 'ONLINE',
      },
    });

    return res.status(201).json({ ad });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/p2p/orders - Place P2P Order (Lock Escrow)
router.post('/orders', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { adId, cryptoAmount } = req.body;
    const ad = await prisma.p2PAdvertisement.findUnique({ where: { id: adId }, include: { merchant: true } });
    if (!ad || ad.status !== 'ONLINE') {
      return res.status(400).json({ error: 'AD_NOT_AVAILABLE' });
    }

    const amountBN = new BigNumber(cryptoAmount);
    const priceBN = new BigNumber(ad.price.toString());
    const fiatAmountBN = amountBN.multipliedBy(priceBN);

    const buyerId = ad.type === 'SELL' ? req.user.id : ad.merchantId;
    const sellerId = ad.type === 'SELL' ? ad.merchantId : req.user.id;

    let p2pOrder: any;

    await prisma.$transaction(async (tx) => {
      // 1. Lock Seller Crypto into P2P Escrow Account
      const sellerSpotAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: sellerId, assetId: ad.assetId, type: AccountType.SPOT_AVAILABLE } },
      });

      if (!sellerSpotAcc || new BigNumber(sellerSpotAcc.balance.toString()).isLessThan(amountBN)) {
        throw new Error('SELLER_INSUFFICIENT_BALANCE: Seller does not have enough crypto for escrow');
      }

      let sellerEscrowAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: sellerId, assetId: ad.assetId, type: AccountType.P2P_ESCROW } },
      });

      if (!sellerEscrowAcc) {
        sellerEscrowAcc = await tx.account.create({
          data: { userId: sellerId, assetId: ad.assetId, type: AccountType.P2P_ESCROW, balance: 0 },
        });
      }

      // Deduct seller available -> add seller escrow
      await tx.account.update({
        where: { id: sellerSpotAcc.id },
        data: { balance: new BigNumber(sellerSpotAcc.balance.toString()).minus(amountBN).toFixed(18) },
      });

      await tx.account.update({
        where: { id: sellerEscrowAcc.id },
        data: { balance: new BigNumber(sellerEscrowAcc.balance.toString()).plus(amountBN).toFixed(18) },
      });

      // 2. Create P2P Order Record
      p2pOrder = await tx.p2POrder.create({
        data: {
          adId: ad.id,
          buyerId,
          sellerId,
          cryptoAmount: amountBN.toFixed(18),
          fiatAmount: fiatAmountBN.toFixed(18),
          price: priceBN.toFixed(18),
          status: 'ESCROW_LOCKED',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins payment window
        },
      });
    });

    return res.status(201).json({ order: p2pOrder });
  } catch (err: any) {
    return res.status(400).json({ error: 'ORDER_CREATION_FAILED', message: err.message });
  }
});

// POST /api/v1/p2p/orders/:id/mark-paid - Buyer Marks Order as Paid
router.post('/orders/:id/mark-paid', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const order = await prisma.p2POrder.findUnique({ where: { id: req.params.id } });
    if (!order || order.buyerId !== req.user.id) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    if (order.status !== 'ESCROW_LOCKED' && order.status !== 'PAYMENT_PENDING') {
      return res.status(400).json({ error: 'INVALID_STATUS' });
    }

    const updated = await prisma.p2POrder.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_MARKED' },
    });

    return res.json({ order: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/p2p/orders/:id/release - Seller Confirms Payment & Releases Escrow
router.post('/orders/:id/release', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const order = await prisma.p2POrder.findUnique({ where: { id: req.params.id }, include: { ad: true } });
    if (!order || order.sellerId !== req.user.id) {
      return res.status(404).json({ error: 'ORDER_NOT_FOUND' });
    }

    if (order.status !== 'PAYMENT_MARKED') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Order is not marked as paid yet' });
    }

    const cryptoAmountBN = new BigNumber(order.cryptoAmount.toString());

    await prisma.$transaction(async (tx) => {
      // 1. Deduct Seller Escrow
      const sellerEscrowAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: order.sellerId, assetId: order.ad.assetId, type: AccountType.P2P_ESCROW } },
      });

      if (sellerEscrowAcc) {
        await tx.account.update({
          where: { id: sellerEscrowAcc.id },
          data: { balance: new BigNumber(sellerEscrowAcc.balance.toString()).minus(cryptoAmountBN).toFixed(18) },
        });
      }

      // 2. Credit Buyer Spot Available
      let buyerSpotAcc = await tx.account.findUnique({
        where: { userId_assetId_type: { userId: order.buyerId, assetId: order.ad.assetId, type: AccountType.SPOT_AVAILABLE } },
      });

      if (!buyerSpotAcc) {
        buyerSpotAcc = await tx.account.create({
          data: { userId: order.buyerId, assetId: order.ad.assetId, type: AccountType.SPOT_AVAILABLE, balance: 0 },
        });
      }

      await tx.account.update({
        where: { id: buyerSpotAcc.id },
        data: { balance: new BigNumber(buyerSpotAcc.balance.toString()).plus(cryptoAmountBN).toFixed(18) },
      });

      // 3. Mark Order Completed
      await tx.p2POrder.update({
        where: { id: order.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });

    return res.json({ message: 'P2P Order completed and crypto released to buyer successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'RELEASE_FAILED', message: err.message });
  }
});

export default router;
