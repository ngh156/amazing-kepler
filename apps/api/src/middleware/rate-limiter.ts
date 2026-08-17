import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const WINDOW_MS = 1000; // 1 second window
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests per second max

const ipBucket = new Map<string, RateLimitRecord>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();

  let record = ipBucket.get(ip);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    ipBucket.set(ip, record);
    return next();
  }

  record.count += 1;

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'TOO_MANY_REQUESTS',
      message: 'Rate limit exceeded (Max 15 requests/sec). Please slow down.',
      retryAfterMs: record.resetTime - now,
    });
  }

  next();
};
