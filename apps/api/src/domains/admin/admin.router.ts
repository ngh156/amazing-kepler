import { Router, Response } from 'express';
import { prisma } from '../../config/db';
import { authenticateJWT, requireRole, AuthRequest } from '../auth/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Ensure only ADMIN or SUPER_ADMIN access
router.use(authenticateJWT, requireRole([Role.ADMIN, Role.SUPER_ADMIN]));

// GET /api/v1/admin/users - Manage Users List
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        kycLevel: true,
        isFrozen: true,
        riskScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ users });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/admin/users/:id/freeze - Freeze user account
router.post('/users/:id/freeze', async (req: AuthRequest, res: Response) => {
  try {
    const { isFrozen } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isFrozen: Boolean(isFrozen) },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: isFrozen ? 'FREEZE_USER' : 'UNFREEZE_USER',
        resource: 'USER',
        resourceId: user.id,
        metadata: JSON.stringify({ email: user.email }),
      },
    });

    return res.json({ message: `User ${user.email} freeze status updated to ${isFrozen}`, user });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// POST /api/v1/admin/markets - Create/List new trading pair
router.post('/markets', async (req: AuthRequest, res: Response) => {
  try {
    const { symbol, baseAssetId, quoteAssetId, tickSize, stepSize, minQuantity, liquidityProfile } = req.body;

    const market = await prisma.market.create({
      data: {
        id: symbol.replace('/', ''),
        symbol,
        baseAssetId,
        quoteAssetId,
        tickSize: tickSize || 0.01,
        stepSize: stepSize || 0.0001,
        minQuantity: minQuantity || 0.0001,
        liquidityProfile: liquidityProfile || 'MEDIUM',
        status: 'TRADING',
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'CREATE_MARKET',
        resource: 'MARKET',
        resourceId: market.id,
        metadata: JSON.stringify({ symbol }),
      },
    });

    return res.status(201).json({ market });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// GET /api/v1/admin/audit-logs - View Audit Trail
router.get('/audit-logs', async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
