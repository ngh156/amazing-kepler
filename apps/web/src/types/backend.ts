export type Role = 'USER' | 'MERCHANT' | 'TRADER' | 'SUPPORT' | 'COMPLIANCE' | 'RISK_OPERATOR' | 'FINANCE_OPERATOR' | 'ADMIN' | 'SUPER_ADMIN';

export type KycLevel = 'LEVEL_0' | 'LEVEL_1' | 'LEVEL_2';

export interface User {
  id: string;
  email: string;
  nickname?: string;
  role: Role;
  kycLevel: KycLevel;
  kycFirstName?: string;
  kycLastName?: string;
  isTwoFactorEnabled: boolean;
  isFrozen: boolean;
  riskScore: number;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  logoUrl?: string;
  type: 'CRYPTO' | 'FIAT' | 'STABLECOIN';
  decimals: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELISTED';
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
  tradingEnabled: boolean;
}

export interface Market {
  id: string;
  symbol: string;
  baseAssetId: string;
  quoteAssetId: string;
  status: 'DRAFT' | 'PREPARING' | 'ANNOUNCED' | 'OPENING_SOON' | 'TRADING' | 'HALTED' | 'SUSPENDED' | 'DELISTING' | 'DELISTED';
  tickSize: string;
  stepSize: string;
  minQuantity: string;
  maxQuantity: string;
  minNotional: string;
  pricePrecision: number;
  quantityPrecision: number;
  makerFee: string;
  takerFee: string;
  liquidityProfile: string;
}

export interface Account {
  id: string;
  userId: string;
  assetId: string;
  type: 'SPOT_AVAILABLE' | 'SPOT_LOCKED' | 'P2P_ESCROW' | 'EARN_LOCKED' | 'STAKING_LOCKED' | 'SYSTEM_RESERVE' | 'SYSTEM_FEE';
  balance: string;
}

export interface BalanceSummary {
  asset: Asset;
  available: string;
  locked: string;
  total: string;
}

export type OrderType = 'LIMIT' | 'MARKET' | 'STOP_LIMIT' | 'STOP_MARKET';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'NEW' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface Order {
  id: string;
  userId: string;
  marketId: string;
  clientOrderId?: string;
  type: OrderType;
  side: OrderSide;
  price: string;
  originalQuantity: string;
  executedQuantity: string;
  remainingQuantity: string;
  status: OrderStatus;
  source: 'USER' | 'MARKET_MAKER' | 'SYNTHETIC' | 'SYSTEM';
  createdAt: string;
  market?: Market;
}

export interface Trade {
  id: string;
  tradeId: string;
  marketId: string;
  price: string;
  quantity: string;
  quoteQuantity: string;
  buyerOrderId: string;
  sellerOrderId: string;
  buyerUserId: string;
  sellerUserId: string;
  makerSide: OrderSide;
  timestamp: string;
}

export interface OrderBookDepth {
  bids: [string, string][];
  asks: [string, string][];
}

export interface Ticker24h {
  symbol: string;
  displaySymbol: string;
  lastPrice: number;
  priceChange: string;
  priceChangePercent: string;
  high24h: number;
  low24h: number;
  volume24h: string;
}

export interface P2PAdvertisement {
  id: string;
  merchantId: string;
  type: 'BUY' | 'SELL';
  assetId: string;
  fiatSymbol: string;
  price: string;
  availableQuantity: string;
  minLimit: string;
  maxLimit: string;
  paymentMethods: string;
  terms?: string;
  status: 'ONLINE' | 'OFFLINE' | 'CLOSED';
  merchant: User;
  asset: Asset;
}

export interface P2POrder {
  id: string;
  adId: string;
  buyerId: string;
  sellerId: string;
  cryptoAmount: string;
  fiatAmount: string;
  price: string;
  status: 'CREATED' | 'ESCROW_LOCKED' | 'PAYMENT_PENDING' | 'PAYMENT_MARKED' | 'SELLER_CONFIRMING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'DISPUTED';
  expiresAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  metadata?: string;
  createdAt: string;
  actor: {
    email: string;
    role: Role;
  };
}
