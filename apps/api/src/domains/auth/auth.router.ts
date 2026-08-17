import { Router } from 'express';
import { register, login, getProfile } from './auth.controller';
import { authenticateJWT } from './auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateJWT, getProfile);

export default router;
