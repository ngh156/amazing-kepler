import rateLimit from 'express-rate-limit';

// 1. Auth Rate Limiter (Brute-force protection for login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 authentication requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Phát hiện tần suất truy cập cao. Vui lòng thử lại sau vài phút!' },
});

// 2. Financial Trade & Transfer Rate Limiter (Double spending & spam defense)
export const tradeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Limit each IP to 120 financial requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Tốc độ thao tác quá nhanh. Vui lòng chờ vài giây trước khi thực hiện tiếp!' },
});

// 3. Public API Rate Limiter
export const publicApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 500, // 500 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: 'TOO_MANY_REQUESTS', message: 'Hệ thống đang quá tải. Vui lòng đợi trong giây lát!' },
});

