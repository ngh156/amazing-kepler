import { Router, Request, Response } from 'express';
import { prisma } from '../../config/db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      include: {
        networks: {
          include: {
            network: true,
          },
        },
      },
    });
    return res.json({ assets });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: {
        networks: {
          include: {
            network: true,
          },
        },
      },
    });
    if (!asset) return res.status(404).json({ error: 'ASSET_NOT_FOUND' });
    return res.json({ asset });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
