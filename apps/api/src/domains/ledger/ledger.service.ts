import { AccountType, EntryType, Prisma } from '@prisma/client';
import BigNumber from 'bignumber.js';
import { prisma } from '../../config/db';

export class LedgerService {
  /**
   * Lock funds when placing an order
   */
  static async lockFunds(
    tx: Prisma.TransactionClient,
    userId: string,
    assetId: string,
    amount: BigNumber
  ): Promise<void> {
    // 1. Fetch Spot Available Account
    let availAcc = await tx.account.findUnique({
      where: { userId_assetId_type: { userId, assetId, type: AccountType.SPOT_AVAILABLE } },
    });

    if (!availAcc) {
      availAcc = await tx.account.create({
        data: { userId, assetId, type: AccountType.SPOT_AVAILABLE, balance: 0 },
      });
    }

    const currentAvail = new BigNumber(availAcc.balance.toString());
    if (currentAvail.isLessThan(amount)) {
      throw new Error(`INSUFFICIENT_BALANCE: Required ${amount.toFixed()} ${assetId}, available ${currentAvail.toFixed()}`);
    }

    // 2. Fetch Spot Locked Account
    let lockedAcc = await tx.account.findUnique({
      where: { userId_assetId_type: { userId, assetId, type: AccountType.SPOT_LOCKED } },
    });

    if (!lockedAcc) {
      lockedAcc = await tx.account.create({
        data: { userId, assetId, type: AccountType.SPOT_LOCKED, balance: 0 },
      });
    }

    // 3. Update Balances
    const newAvail = currentAvail.minus(amount);
    const newLocked = new BigNumber(lockedAcc.balance.toString()).plus(amount);

    await tx.account.update({
      where: { id: availAcc.id },
      data: { balance: newAvail.toFixed(18) },
    });

    await tx.account.update({
      where: { id: lockedAcc.id },
      data: { balance: newLocked.toFixed(18) },
    });

    // 4. Create Double-Entry Ledger Transaction
    const ledgerTx = await tx.ledgerTransaction.create({
      data: {
        referenceType: 'LOCK_ORDER',
        referenceId: `${userId}_${assetId}_${Date.now()}`,
        description: `Lock ${amount.toFixed()} ${assetId} for order`,
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          transactionId: ledgerTx.id,
          accountId: availAcc.id,
          entryType: EntryType.CREDIT,
          amount: amount.toFixed(18),
        },
        {
          transactionId: ledgerTx.id,
          accountId: lockedAcc.id,
          entryType: EntryType.DEBIT,
          amount: amount.toFixed(18),
        },
      ],
    });
  }

  /**
   * Unlock funds on order cancellation or rejection
   */
  static async unlockFunds(
    tx: Prisma.TransactionClient,
    userId: string,
    assetId: string,
    amount: BigNumber
  ): Promise<void> {
    const lockedAcc = await tx.account.findUnique({
      where: { userId_assetId_type: { userId, assetId, type: AccountType.SPOT_LOCKED } },
    });

    if (!lockedAcc) return;

    const currentLocked = new BigNumber(lockedAcc.balance.toString());
    const unlockAmount = BigNumber.min(currentLocked, amount);

    if (unlockAmount.isLessThanOrEqualTo(0)) return;

    const availAcc = await tx.account.findUnique({
      where: { userId_assetId_type: { userId, assetId, type: AccountType.SPOT_AVAILABLE } },
    });

    if (!availAcc) return;

    const newLocked = currentLocked.minus(unlockAmount);
    const newAvail = new BigNumber(availAcc.balance.toString()).plus(unlockAmount);

    await tx.account.update({
      where: { id: lockedAcc.id },
      data: { balance: newLocked.toFixed(18) },
    });

    await tx.account.update({
      where: { id: availAcc.id },
      data: { balance: newAvail.toFixed(18) },
    });

    const ledgerTx = await tx.ledgerTransaction.create({
      data: {
        referenceType: 'UNLOCK_ORDER',
        referenceId: `${userId}_${assetId}_${Date.now()}`,
        description: `Unlock ${unlockAmount.toFixed()} ${assetId}`,
      },
    });

    await tx.ledgerEntry.createMany({
      data: [
        {
          transactionId: ledgerTx.id,
          accountId: lockedAcc.id,
          entryType: EntryType.CREDIT,
          amount: unlockAmount.toFixed(18),
        },
        {
          transactionId: ledgerTx.id,
          accountId: availAcc.id,
          entryType: EntryType.DEBIT,
          amount: unlockAmount.toFixed(18),
        },
      ],
    });
  }

  /**
   * Settle trade match between Buyer and Seller
   */
  static async settleTrade(
    tx: Prisma.TransactionClient,
    params: {
      tradeId: string;
      baseAssetId: string;
      quoteAssetId: string;
      buyerUserId: string;
      sellerUserId: string;
      price: BigNumber;
      quantity: BigNumber;
      quoteQuantity: BigNumber;
    }
  ): Promise<void> {
    const { tradeId, baseAssetId, quoteAssetId, buyerUserId, sellerUserId, quantity, quoteQuantity } = params;

    // Buyer locked quote asset -> Seller available quote asset
    // Seller locked base asset -> Buyer available base asset

    // 1. Get Accounts
    const buyerQuoteLocked = await tx.account.findUnique({
      where: { userId_assetId_type: { userId: buyerUserId, assetId: quoteAssetId, type: AccountType.SPOT_LOCKED } },
    });
    const buyerBaseAvail = await tx.account.findUnique({
      where: { userId_assetId_type: { userId: buyerUserId, assetId: baseAssetId, type: AccountType.SPOT_AVAILABLE } },
    });

    const sellerBaseLocked = await tx.account.findUnique({
      where: { userId_assetId_type: { userId: sellerUserId, assetId: baseAssetId, type: AccountType.SPOT_LOCKED } },
    });
    const sellerQuoteAvail = await tx.account.findUnique({
      where: { userId_assetId_type: { userId: sellerUserId, assetId: quoteAssetId, type: AccountType.SPOT_AVAILABLE } },
    });

    if (buyerQuoteLocked && sellerQuoteAvail) {
      // Deduct Quote from Buyer Locked, Add to Seller Available
      const newBuyerQuoteLocked = new BigNumber(buyerQuoteLocked.balance.toString()).minus(quoteQuantity);
      const newSellerQuoteAvail = new BigNumber(sellerQuoteAvail.balance.toString()).plus(quoteQuantity);

      await tx.account.update({
        where: { id: buyerQuoteLocked.id },
        data: { balance: BigNumber.max(0, newBuyerQuoteLocked).toFixed(18) },
      });
      await tx.account.update({
        where: { id: sellerQuoteAvail.id },
        data: { balance: newSellerQuoteAvail.toFixed(18) },
      });
    }

    if (sellerBaseLocked && buyerBaseAvail) {
      // Deduct Base from Seller Locked, Add to Buyer Available
      const newSellerBaseLocked = new BigNumber(sellerBaseLocked.balance.toString()).minus(quantity);
      const newBuyerBaseAvail = new BigNumber(buyerBaseAvail.balance.toString()).plus(quantity);

      await tx.account.update({
        where: { id: sellerBaseLocked.id },
        data: { balance: BigNumber.max(0, newSellerBaseLocked).toFixed(18) },
      });
      await tx.account.update({
        where: { id: buyerBaseAvail.id },
        data: { balance: newBuyerBaseAvail.toFixed(18) },
      });
    }

    // Ledger record
    await tx.ledgerTransaction.create({
      data: {
        referenceType: 'TRADE',
        referenceId: tradeId,
        description: `Trade settlement: ${quantity.toFixed()} ${baseAssetId} @ ${params.price.toFixed()} ${quoteAssetId}`,
      },
    });
  }
}
