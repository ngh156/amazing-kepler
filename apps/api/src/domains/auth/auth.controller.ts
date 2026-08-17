import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { ENV } from '../../config/env';
import { AuthRequest } from './auth.middleware';
import { AccountType } from '@prisma/client';

export async function register(req: Request, res: Response) {
  try {
    const { email, password, nickname } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Email and password required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname: nickname || email.split('@')[0],
      },
    });

    // Create default accounts with initial test balance (100,000 USDT for simulation mode)
    const assets = await prisma.asset.findMany();
    for (const asset of assets) {
      const initialAmount = asset.id === 'USDT' ? 100000 : asset.id === 'BTC' ? 2 : asset.id === 'ETH' ? 20 : 0;
      await prisma.account.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          type: AccountType.SPOT_AVAILABLE,
          balance: initialAmount,
        },
      });
      await prisma.account.create({
        data: {
          userId: user.id,
          assetId: asset.id,
          type: AccountType.SPOT_LOCKED,
          balance: 0,
        },
      });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        kycLevel: user.kycLevel,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    if (user.isFrozen) {
      return res.status(403).json({ error: 'ACCOUNT_FROZEN', message: 'Account has been frozen by security' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ENV.JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        role: user.role,
        kycLevel: user.kycLevel,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        nickname: true,
        role: true,
        kycLevel: true,
        isTwoFactorEnabled: true,
        isFrozen: true,
        riskScore: true,
        createdAt: true,
      },
    });
    return res.json({ user });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}
