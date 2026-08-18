import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { ENV } from '../../config/env';
import { AuthRequest } from './auth.middleware';
import { AccountType } from '@prisma/client';

import { sendOtpEmail } from '../../services/mail.service';

// In-Memory OTP Cache store for active sessions (5 minutes expiration)
interface OtpEntry {
  code: string;
  expiresAt: number;
}
const otpStore = new Map<string, OtpEntry>();

/**
 * Generate 6-digit random numeric OTP code
 */
function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Step 1: Request Email OTP Code for Login / Register
 */
export async function requestOtp(req: Request, res: Response) {
  try {
    const { email, password, action } = req.body; // action: 'login' | 'register'

    if (!email) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Email là bắt buộc' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === 'login') {
      if (!password) {
        return res.status(400).json({ error: 'INVALID_INPUT', message: 'Mật khẩu là bắt buộc' });
      }

      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không chính xác' });
      }

      if (user.isFrozen) {
        return res.status(403).json({ error: 'ACCOUNT_FROZEN', message: 'Tài khoản của bạn đã bị khóa bảo mật' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không chính xác' });
      }
    } else if (action === 'register') {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email này đã được đăng ký tài khoản' });
      }
    }

    // Generate 6-digit OTP Code
    const otpCode = generate6DigitOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(normalizedEmail, { code: otpCode, expiresAt });

    // Send Email
    const sent = await sendOtpEmail(normalizedEmail, otpCode, action === 'login' ? 'Đăng nhập' : 'Tạo tài khoản');

    return res.json({
      success: true,
      requireOtp: true,
      email: normalizedEmail,
      message: `Mã OTP 6 chữ số đã được gửi tới email ${normalizedEmail}`,
      demoOtpCode: otpCode, // Provided for instant demo testnet validation
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
}

/**
 * Step 2: Verify Email OTP Code & Issue Session Token
 */
export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, password, otpCode, nickname, action } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ error: 'INVALID_INPUT', message: 'Vui lòng nhập Email và mã OTP 6 chữ số' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const storedOtp = otpStore.get(normalizedEmail);

    if (!storedOtp) {
      return res.status(400).json({ error: 'OTP_EXPIRED', message: 'Mã OTP chưa được gửi hoặc đã hết hạn. Vui lòng lấy mã mới.' });
    }

    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP_EXPIRED', message: 'Mã OTP đã quá 5 phút hết hạn. Vui lòng gửi lại mã mới.' });
    }

    if (storedOtp.code !== otpCode.trim()) {
      return res.status(400).json({ error: 'INVALID_OTP', message: 'Mã xác thực OTP 6 chữ số không đúng!' });
    }

    // Delete used OTP code
    otpStore.delete(normalizedEmail);

    let user;

    if (action === 'register') {
      const passwordHash = await bcrypt.hash(password || 'Password123!', 10);
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          nickname: nickname || normalizedEmail.split('@')[0],
        },
      });

      // Create default accounts with initial test balance (100,000 USDT)
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
    } else {
      user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (!user) {
        return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng' });
      }
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

export async function logout(req: AuthRequest, res: Response) {
  try {
    if (req.token) {
      // Blacklist JWT token in Redis for 7 days (604800 seconds)
      const { redisPub } = await import('../../config/db');
      await redisPub.setex(`jwt_blacklist:${req.token}`, 604800, 'revoked');
    }
    return res.json({ success: true, message: 'Đăng xuất thành công, phiên làm việc đã bị hủy!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'LOGOUT_FAILED', message: err.message });
  }
}
