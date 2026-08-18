import BigNumber from 'bignumber.js';
import { prisma, redisPub } from '../../config/db';
import { AccountType } from '@prisma/client';

export class FundingFeeService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private currentFundingRate = 0.0001; // +0.0100% standard Binance 8h funding rate

  public startWorker() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('⚡ [FundingFeeService] 24/7 Real-Time Funding Fee Worker started');

    // Run funding rate settlement loop every 10 seconds for live simulation demo
    this.intervalId = setInterval(() => {
      this.settleFundingFees().catch((err) => {
        console.error('❌ [FundingFeeService] Settlement error:', err);
      });
    }, 10000);
  }

  public stopWorker() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  private async settleFundingFees() {
    const openPositions = await prisma.futuresPosition.findMany({
      where: { status: 'OPEN' },
      include: { market: true },
    });

    if (openPositions.length === 0) return;

    // Slight dynamic fluctuation of funding rate (-0.0002 to +0.0003)
    const rateDelta = (Math.random() - 0.48) * 0.00005;
    this.currentFundingRate = Math.max(-0.001, Math.min(0.001, this.currentFundingRate + rateDelta));

    for (const pos of openPositions) {
      const sizeBN = new BigNumber(pos.size.toString());
      const markPriceBN = new BigNumber(pos.markPrice.toString());
      const notionalBN = sizeBN.multipliedBy(markPriceBN);

      let feeAmountBN = notionalBN.multipliedBy(this.currentFundingRate);

      if (pos.side === 'SHORT') {
        feeAmountBN = feeAmountBN.negated();
      }

      await prisma.$transaction(async (tx) => {
        const marginAcc = await tx.account.findUnique({
          where: { userId_assetId_type: { userId: pos.userId, assetId: 'USDT', type: AccountType.FUTURES_MARGIN } },
        });

        if (marginAcc) {
          const currentBal = new BigNumber(marginAcc.balance.toString());
          const newBal = BigNumber.max(0, currentBal.minus(feeAmountBN));

          await tx.account.update({
            where: { id: marginAcc.id },
            data: { balance: newBal.toFixed(18) },
          });
        }
      });
    }

    // Broadcast live funding update via Redis PubSub
    try {
      await redisPub.publish('funding:update', JSON.stringify({
        fundingRate: this.currentFundingRate,
        fundingRatePct: (this.currentFundingRate * 100).toFixed(4),
        nextFundingTime: new Date(Date.now() + 10000).toISOString(),
      }));
    } catch (e) {
      // Ignore pubsub error
    }
  }
}

export const fundingFeeService = new FundingFeeService();
