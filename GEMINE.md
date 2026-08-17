# API Contract & Backend Sync Documentation (GEMINE.md)

Document mapping the synchronization between Node/PostgreSQL Backend DTOs/Entities and the Next.js TypeScript Frontend types (`src/types/backend.ts`).

---

## 1. Backend DTO Synchronization Mappings

| Backend Entity / DTO | Frontend TypeScript Interface | File Location |
| --- | --- | --- |
| `User` | `User` | `src/types/backend.ts` |
| `Role` (`USER` \| `MERCHANT` \| `ADMIN` \| `SUPER_ADMIN`) | `Role` | `src/types/backend.ts` |
| `KycLevel` (`LEVEL_0` \| `LEVEL_1` \| `LEVEL_2`) | `KycLevel` | `src/types/backend.ts` |
| `Asset` | `Asset` | `src/types/backend.ts` |
| `Market` | `Market` | `src/types/backend.ts` |
| `Account` | `Account` | `src/types/backend.ts` |
| `BalanceSummary` | `BalanceSummary` | `src/types/backend.ts` |
| `Order` | `Order` | `src/types/backend.ts` |
| `OrderSide` (`BUY` \| `SELL`) | `OrderSide` | `src/types/backend.ts` |
| `OrderType` (`LIMIT` \| `MARKET`) | `OrderType` | `src/types/backend.ts` |
| `OrderStatus` (`NEW` \| `OPEN` \| `FILLED` \| `CANCELLED`) | `OrderStatus` | `src/types/backend.ts` |
| `Trade` | `Trade` | `src/types/backend.ts` |
| `OrderBookDepth` | `OrderBookDepth` | `src/types/backend.ts` |
| `Ticker24h` | `Ticker24h` | `src/types/backend.ts` |
| `P2PAdvertisement` | `P2PAdvertisement` | `src/types/backend.ts` |
| `P2POrder` | `P2POrder` | `src/types/backend.ts` |
| `AuditLog` | `AuditLog` | `src/types/backend.ts` |

---

## 2. API Endpoint Services Mapping

| Domain | Service File | Endpoints Mapped |
| --- | --- | --- |
| Authentication | `src/services/auth.service.ts` | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Spot Trading | `src/services/trading.service.ts` | `POST /orders`, `POST /orders/:id/cancel`, `GET /orders/open`, `GET /orders/history`, `GET /depth/:marketId` |
| Market Data | `src/services/market.service.ts` | `GET /markets`, `GET /markets/:id`, `GET /marketdata/klines`, `GET /marketdata/trades/:symbol`, `GET /marketdata/tickers` |
| Wallet | `src/services/wallet.service.ts` | `GET /wallets/balances`, `GET /wallets/deposit-address`, `POST /wallets/withdraw` |
| P2P Marketplace | `src/services/p2p.service.ts` | `GET /p2p/ads`, `POST /p2p/ads`, `POST /p2p/orders`, `POST /p2p/orders/:id/mark-paid`, `POST /p2p/orders/:id/release` |
| Backoffice Admin | `src/services/admin.service.ts` | `GET /admin/users`, `POST /admin/users/:id/freeze`, `POST /admin/markets`, `GET /admin/audit-logs` |
