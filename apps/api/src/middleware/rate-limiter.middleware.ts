import rateLimit from 'express-rate-limit';

// 1. Auth Rate Limiter (Brute-force protection for login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 authentication requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Phát hiện tần suất truy cập cao. Vui lòng thử lại sau 15 phút!' },
});

// 2. Financial Trade & Transfer Rate Limiter (Double spending & spam defense)
export const tradeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 financial requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Tốc độ thao tác quá nhanh. Vui lòng chờ vài giây trước khi thực hiện tiếp!' },
});

// 3. Public API Rate Limiter
export const publicApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS', message: 'Hệ thống đang quá tải. Vui lòng đợi trong giây lát!' },
});
