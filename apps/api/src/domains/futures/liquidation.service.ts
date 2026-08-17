import { prisma, redisPub } from '../../config/db';
import BigNumber from 'bignumber.js';

export class LiquidationService {
  private static instance: LiquidationService;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): LiquidationService {
    if (!LiquidationService.instance) {
      LiquidationService.instance = new LiquidationService();
    }
    return LiquidationService.instance;
  }

  public startAutomatedWorker(intervalMs: number = 2000) {
    if (this.timer) return;

    this.timer = setInterval(() => this.checkAndLiquidatePositions(), intervalMs);
    console.log('⚡ Futures Automated Liquidation Engine initialized (Checking every 2s)');
  }

  public async checkAndLiquidatePositions() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const openPositions = await prisma.futuresPosition.findMany({
        where: { status: 'OPEN' },
      });

      if (openPositions.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Fetch current ticker prices for all markets
      const tickers = await prisma.marketPriceConfig.findMany({});
      const currentPrices = new Map<string, number>();

      for (const pos of openPositions) {
        const entry = parseFloat(pos.entryPrice.toString());
        const liqPrice = parseFloat(pos.liquidationPrice.toString());
        const markPrice = parseFloat(pos.markPrice?.toString() || pos.entryPrice.toString());
        const lev = pos.leverage || 10;
        const posSize = parseFloat(pos.size.toString());
        const marginNum = parseFloat(pos.margin.toString());

        // Calculate current unRealized PnL
        const unPnl = pos.side === 'LONG'
          ? (markPrice - entry) * posSize
          : (entry - markPrice) * posSize;

        // Condition for Liquidation:
        // 1. Price breached liquidationPrice
        // 2. OR unRealized Loss >= Margin (ROE <= -100%)
        const isLongLiquidated = pos.side === 'LONG' && (markPrice <= liqPrice || unPnl <= -marginNum);
        const isShortLiquidated = pos.side === 'SHORT' && (markPrice >= liqPrice || unPnl <= -marginNum);

        if (isLongLiquidated || isShortLiquidated) {
          console.warn(`🚨 [LIQUIDATION ENGINE] Triggered Force Liquidation for User ${pos.userId} on ${pos.marketId} (${pos.side} ${lev}x @ Mark $${markPrice}, Liq $${liqPrice})`);

          await prisma.$transaction(async (tx) => {
            // 1. Update position status to LIQUIDATED
            await tx.futuresPosition.update({
              where: { id: pos.id },
              data: {
                status: 'LIQUIDATED',
                markPrice: markPrice.toString(),
              },
            });

            // 2. Seize Margin from User's Futures Account -> SYSTEM_RESERVE (Insurance Fund)
            const marginAcc = await tx.account.findUnique({
              where: { userId_assetId_type: { userId: pos.userId, assetId: 'USDT', type: 'FUTURES_MARGIN' } },
            });

            if (marginAcc) {
              const currentBal = new BigNumber(marginAcc.balance.toString());
              await tx.account.update({
                where: { id: marginAcc.id },
                data: { balance: BigNumber.max(0, currentBal.minus(new BigNumber(pos.margin.toString()))).toFixed(18) },
              });
            }

            // 3. Deposit seized margin into Insurance Fund (SYSTEM_RESERVE)
            const systemUser = await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
            if (systemUser) {
              const reserveAcc = await tx.account.findUnique({
                where: { userId_assetId_type: { userId: systemUser.id, assetId: 'USDT', type: 'SYSTEM_RESERVE' } },
              });

              if (reserveAcc) {
                await tx.account.update({
                  where: { id: reserveAcc.id },
                  data: { balance: new BigNumber(reserveAcc.balance.toString()).plus(new BigNumber(pos.margin.toString())).toFixed(18) },
                });
              }
            }
          });

          // Broadcast real-time liquidation alert over Redis
          await redisPub.publish('futures:liquidation', JSON.stringify({
            userId: pos.userId,
            positionId: pos.id,
            symbol: pos.marketId,
            side: pos.side,
            leverage: lev,
            entryPrice: entry,
            liquidationPrice: liqPrice,
            markPrice: markPrice,
            lossUSDT: marginNum,
            timestamp: Date.now(),
          }));
        }
      }
    } catch (e: any) {
      console.error('❌ Liquidation Engine Error:', e.message);
    } finally {
      this.isProcessing = false;
    }
  }

  public stopWorker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const liquidationService = LiquidationService.getInstance();
