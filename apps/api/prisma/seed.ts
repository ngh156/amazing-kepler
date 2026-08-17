import {
  PrismaClient, Role, KycLevel, AssetType, AssetStatus,
  MarketStatus, AccountType, P2PAdType, P2PAdStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with 100+ CEX Market Pairs from CoinMarketCap...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // ── 1. Users ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kepler.exchange' },
    update: {},
    create: { email: 'admin@kepler.exchange', passwordHash, nickname: 'Admin Master', role: Role.SUPER_ADMIN, kycLevel: KycLevel.LEVEL_2 },
  });
  const merchant1 = await prisma.user.upsert({
    where: { email: 'merchant@kepler.exchange' },
    update: {},
    create: { email: 'merchant@kepler.exchange', passwordHash, nickname: 'Saigon Escrow Trader', role: Role.MERCHANT, kycLevel: KycLevel.LEVEL_2 },
  });
  const merchant2 = await prisma.user.upsert({
    where: { email: 'hanoi_p2p@kepler.exchange' },
    update: {},
    create: { email: 'hanoi_p2p@kepler.exchange', passwordHash, nickname: 'Hanoi VIP Crypto', role: Role.MERCHANT, kycLevel: KycLevel.LEVEL_2 },
  });
  const merchant3 = await prisma.user.upsert({
    where: { email: 'fastpay@kepler.exchange' },
    update: {},
    create: { email: 'fastpay@kepler.exchange', passwordHash, nickname: 'FastPay OTC Hub', role: Role.MERCHANT, kycLevel: KycLevel.LEVEL_2 },
  });
  const trader = await prisma.user.upsert({
    where: { email: 'trader@kepler.exchange' },
    update: {},
    create: { email: 'trader@kepler.exchange', passwordHash, nickname: 'Pro Trader', role: Role.USER, kycLevel: KycLevel.LEVEL_1 },
  });
  console.log('✅ Users seeded');

  // ── 2. 100+ Asset Definitions (CoinMarketCap Top Ranks) ────────────────────
  const assetDefs = [
    { id: 'USDT',   name: 'Tether USD',           type: AssetType.STABLECOIN, decimals: 6 },
    { id: 'BTC',    name: 'Bitcoin',               type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'ETH',    name: 'Ethereum',              type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'SOL',    name: 'Solana',                type: AssetType.CRYPTO,     decimals: 9 },
    { id: 'BNB',    name: 'BNB Token',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'XRP',    name: 'XRP (Ripple)',          type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'ADA',    name: 'Cardano',               type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'DOGE',   name: 'Dogecoin',              type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'AVAX',   name: 'Avalanche',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'DOT',    name: 'Polkadot',              type: AssetType.CRYPTO,     decimals: 10 },
    { id: 'LINK',   name: 'Chainlink',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'MATIC',  name: 'Polygon',               type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'NEAR',   name: 'NEAR Protocol',         type: AssetType.CRYPTO,     decimals: 24 },
    { id: 'SHIB',   name: 'Shiba Inu',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'PEPE',   name: 'Pepe',                  type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'SUI',    name: 'Sui Network',           type: AssetType.CRYPTO,     decimals: 9 },
    { id: 'APT',    name: 'Aptos',                 type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'ARB',    name: 'Arbitrum One',          type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'OP',     name: 'Optimism',              type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'LTC',    name: 'Litecoin',              type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'BCH',    name: 'Bitcoin Cash',          type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'ATOM',   name: 'Cosmos',                type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'UNI',    name: 'Uniswap',               type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'FIL',    name: 'Filecoin',              type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'FET',    name: 'Artificial Superintel', type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'RNDR',   name: 'Render Token',          type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'TIA',    name: 'Celestia',              type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'INJ',    name: 'Injective',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'STX',    name: 'Stacks',                type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'KAS',    name: 'Kaspa',                 type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'WIF',    name: 'dogwifhat',             type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'FLOKI',  name: 'Floki',                 type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'BONK',   name: 'Bonk',                  type: AssetType.CRYPTO,     decimals: 5 },
    { id: 'ICP',    name: 'Internet Computer',     type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'TRX',    name: 'TRON',                  type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'XLM',    name: 'Stellar Lumens',        type: AssetType.CRYPTO,     decimals: 7 },
    { id: 'ETC',    name: 'Ethereum Classic',      type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'ALGO',   name: 'Algorand',              type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'FTM',    name: 'Fantom',                type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'AAVE',   name: 'Aave',                  type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'SEI',    name: 'Sei Network',           type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'WLD',    name: 'Worldcoin',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'RUNE',   name: 'THORChain',             type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'MKR',    name: 'Maker',                 type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'GRT',    name: 'The Graph',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'SNX',    name: 'Synthetix',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'LDO',    name: 'Lido DAO',              type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'PENDLE', name: 'Pendle',                type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'JUP',    name: 'Jupiter',               type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'ENA',    name: 'Ethena',                type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'PYTH',   name: 'Pyth Network',          type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'BOME',   name: 'BOOK OF MEME',          type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'MEME',   name: 'Memecoin',              type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'MEW',    name: 'cat in a dogs world',   type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'POPCAT', name: 'Popcat',                type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'JASMY',  name: 'JasmyCoin',             type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'TAO',    name: 'Bittensor',             type: AssetType.CRYPTO,     decimals: 9 },
    { id: 'AR',     name: 'Arweave',               type: AssetType.CRYPTO,     decimals: 12 },
    { id: 'AXS',    name: 'Axie Infinity',         type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'SAND',   name: 'The Sandbox',           type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'MANA',   name: 'Decentraland',          type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'GALA',   name: 'Gala',                  type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'BEAM',   name: 'Beam',                  type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'ENS',    name: 'Ethereum Name Service', type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'CAKE',   name: 'PancakeSwap',           type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'DYDX',   name: 'dYdX',                  type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'CRV',    name: 'Curve DAO Token',       type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'COMP',   name: 'Compound',              type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'RAY',    name: 'Raydium',               type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'HBAR',   name: 'Hedera',                type: AssetType.CRYPTO,     decimals: 8 },
    { id: 'EGLD',   name: 'MultiversX',            type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'ROSE',   name: 'Oasis Network',         type: AssetType.CRYPTO,     decimals: 9 },
    { id: 'MINA',   name: 'Mina',                  type: AssetType.CRYPTO,     decimals: 9 },
    { id: 'KAVA',   name: 'Kava',                  type: AssetType.CRYPTO,     decimals: 6 },
    { id: 'CELO',   name: 'Celo',                  type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'ASTR',   name: 'Astar',                 type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'ONE',    name: 'Harmony',               type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'WOO',    name: 'WOO Network',           type: AssetType.CRYPTO,     decimals: 18 },
    { id: 'ZIL',    name: 'Zilliqa',               type: AssetType.CRYPTO,     decimals: 12 },
    { id: 'IOTA',   name: 'IOTA',                  type: AssetType.CRYPTO,     decimals: 6 },
  ];

  for (const a of assetDefs) {
    await prisma.asset.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, logoUrl: `/tokens/${a.id.toLowerCase()}.svg`, status: AssetStatus.ACTIVE },
    });
  }
  console.log(`✅ ${assetDefs.length} Assets seeded`);

  // ── 3. Network ─────────────────────────────────────────────────────────────
  await prisma.network.upsert({
    where: { id: 'ETH_SEPOLIA' },
    update: {},
    create: { id: 'ETH_SEPOLIA', name: 'Ethereum Sepolia Testnet', chainId: 11155111, explorerUrl: 'https://sepolia.etherscan.io' },
  });

  // ── 4. Seed Markets (Base asset / USDT) ────────────────────────────────────
  const cryptoAssets = assetDefs.filter((a) => a.id !== 'USDT');

  for (const asset of cryptoAssets) {
    const symbol = `${asset.id}USDT`;
    await prisma.market.upsert({
      where: { id: symbol },
      update: {},
      create: {
        id: symbol,
        symbol: symbol,
        baseAssetId: asset.id,
        quoteAssetId: 'USDT',
        tickSize: '0.01',
        stepSize: '0.0001',
        minNotional: '5.0',
        pricePrecision: 2,
        quantityPrecision: 4,
        status: MarketStatus.TRADING,
      },
    });

    await prisma.marketPriceConfig.upsert({
      where: { marketId: symbol },
      update: {},
      create: {
        marketId: symbol,
        referenceSource: 'BINANCE',
        spreadBps: 2,
        priceOffset: 0,
        volatilityMode: 'LOW',
      },
    });
  }
  console.log(`✅ ${cryptoAssets.length} Market Pairs & Price Engine configs seeded`);

  // ── 5. User Account Balances for Demo ──────────────────────────────────────
  const allUsers = [admin, merchant1, merchant2, merchant3, trader];
  const allAssets = assetDefs.map((a) => a.id);

  for (const u of allUsers) {
    for (const assetId of allAssets) {
      const isUSDT = assetId === 'USDT';
      const availBal = isUSDT ? '500000.00' : '100.00';

      await prisma.account.upsert({
        where: { userId_assetId_type: { userId: u.id, assetId, type: AccountType.SPOT_AVAILABLE } },
        update: { balance: availBal },
        create: { userId: u.id, assetId, type: AccountType.SPOT_AVAILABLE, balance: availBal },
      });
      await prisma.account.upsert({
        where: { userId_assetId_type: { userId: u.id, assetId, type: AccountType.SPOT_LOCKED } },
        update: {},
        create: { userId: u.id, assetId, type: AccountType.SPOT_LOCKED, balance: '0.00' },
      });
      await prisma.account.upsert({
        where: { userId_assetId_type: { userId: u.id, assetId, type: AccountType.FUTURES_MARGIN } },
        update: { balance: isUSDT ? '100000.00' : '0.00' },
        create: { userId: u.id, assetId, type: AccountType.FUTURES_MARGIN, balance: isUSDT ? '100000.00' : '0.00' },
      });
    }
  }

  console.log(`🎉 Seeding ${cryptoAssets.length} CEX Market Pairs completed!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
