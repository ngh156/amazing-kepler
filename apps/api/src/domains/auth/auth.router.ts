import { Router } from 'express';
import { register, login, getProfile, logout } from './auth.controller';
import { authenticateJWT } from './auth.middleware';
import { authLimiter } from '../../middleware/rate-limiter.middleware';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, getProfile);

export default router;
