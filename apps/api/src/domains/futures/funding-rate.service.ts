import { prisma, redisPub } from '../../config/db';
import BigNumber from 'bignumber.js';

export class FundingRateService {
  private static instance: FundingRateService;
  private timer: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): FundingRateService {
    if (!FundingRateService.instance) {
      FundingRateService.instance = new FundingRateService();
    }
    return FundingRateService.instance;
  }

  public startAutomatedWorker(intervalMs: number = 8 * 60 * 60 * 1000) {
    if (this.timer) return;

    // Run first settlement after 10 seconds, then periodically
    setTimeout(() => this.settleFundingRates(), 10000);
    this.timer = setInterval(() => this.settleFundingRates(), intervalMs);
    console.log('⚡ Funding Rate Automated Worker initialized');
  }

  public async settleFundingRates() {
    try {
      const openPositions = await prisma.futuresPosition.findMany({
        where: { status: 'OPEN' },
      });

      if (openPositions.length === 0) return;

      const STANDARD_FUNDING_RATE = 0.0001; // 0.01% standard CEX funding rate

      for (const pos of openPositions) {
        const notional = new BigNumber(pos.size.toString()).multipliedBy(new BigNumber(pos.entryPrice.toString()));
        const fundingFeeBN = notional.multipliedBy(STANDARD_FUNDING_RATE);

        // Long positions pay funding fee, Short positions receive funding fee (when rate is positive)
        const isLong = pos.side === 'LONG';

        await prisma.$transaction(async (tx) => {
          const marginAcc = await tx.account.findUnique({
            where: { userId_assetId_type: { userId: pos.userId, assetId: 'USDT', type: 'FUTURES_MARGIN' } },
          });

          if (marginAcc) {
            const currentBal = new BigNumber(marginAcc.balance.toString());
            const updatedBal = isLong
              ? BigNumber.max(0, currentBal.minus(fundingFeeBN))
              : currentBal.plus(fundingFeeBN);

            await tx.account.update({
              where: { id: marginAcc.id },
              data: { balance: updatedBal.toFixed(18) },
            });
          }
        });
      }

      await redisPub.publish('futures:funding_settled', JSON.stringify({
        timestamp: Date.now(),
        count: openPositions.length,
        rate: '0.0100%',
      }));

      console.log(`✅ Settled 0.0100% Funding Rate across ${openPositions.length} active positions`);
    } catch (e: any) {
      console.error('❌ Funding Rate settlement failed:', e.message);
    }
  }

  public stopWorker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const fundingRateService = FundingRateService.getInstance();
