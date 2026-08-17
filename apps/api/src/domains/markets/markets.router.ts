import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const markets = await prisma.market.findMany({
      include: {
        baseAsset: true,
        quoteAsset: true,
      },
    });
    return res.json({ markets });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const market = await prisma.market.findFirst({
      where: {
        OR: [{ id: req.params.id }, { symbol: req.params.id.replace('-', '/') }],
      },
      include: {
        baseAsset: true,
        quoteAsset: true,
      },
    });
    if (!market) return res.status(404).json({ error: 'MARKET_NOT_FOUND' });
    return res.json({ market });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
