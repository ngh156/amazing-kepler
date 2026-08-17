# ⚡ APEX KEPLER CEX - Hybrid Crypto Exchange Platform

A high-performance, full-stack hybrid cryptocurrency exchange simulation featuring **80+ Spot & Perpetual Futures Market Pairs**, **Ultra-High 10,000x Margin Leverage**, **Automated Liquidation Engine**, **Real-Time Crypto Heatmap**, and **Binance-Style Orderbook & PnL Receipts**.

---

## 🌟 Key Features

### 📈 Perpetual Futures & Spot Trading Terminal
- **80+ Market Pairs**: Real-time Binance WebSocket reference stream integration.
- **1x to 10,000x Ultra-Leverage**: Custom leverage input slider with automated margin calculations.
- **Automated Force Liquidation Engine (`LiquidationService`)**: Real-time position mark price monitoring with margin seizure to Exchange Insurance Fund (`SYSTEM_RESERVE`).
- **Automated Funding Rate Settlement (`FundingRateService`)**: Periodic 8-hour funding fee distribution between LONG and SHORT position holders.
- **TradingView Pro Chart Engine**: Custom watermark branding, indicator overlays (MA7, MA25, MA99, BOLL, VOL), timeframe selection, and full-screen technical analysis.
- **Binance PnL Close Receipt Modal**: Shareable PnL cards with ROE%, entry/exit pricing, and instant wallet balance settlement.

### 🔥 Real-Time Crypto Heatmap & Bubbles (`/heatmap`)
- **Interactive Treemap**: Filter by Top 10 Caps, Layer 1s, Memes & Low-Cap Shitcoins (`TURBO`, `MOG`, `PEPE`, `SHIB`, `NEIRO`).
- **Click-To-Trade Navigation**: Instant routing to Futures trading terminal on tile click.
- **Top Gainers & Losers Marquee**: Live ranking of top 24h market movers.

### ℹ️ Coin Deep Analytics Drawer (`CoinInfoDrawer`)
- Official project summaries, CoinMarketCap ranks, real 24h volumes, market cap estimates, ATH/ATL statistics, whitepaper, and block explorer links.

### 🛡️ Production Hardening & Architecture
- **Double-Entry Ledger Financial Invariants**: Isolated accounts (`SPOT_AVAILABLE`, `FUTURES_MARGIN`, `P2P_ESCROW`, `SYSTEM_RESERVE`).
- **Rate-Limiting Middleware**: Protection against DDoS and order placement spam bot attacks.
- **Graceful Shutdown Handlers**: `SIGINT` / `SIGTERM` handlers for database and Redis connection safety.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, Lightweight Charts.
- **Backend API**: Node.js, Express, TypeScript, Socket.io Gateway, BigNumber.js.
- **Database & Cache**: PostgreSQL (Prisma ORM), Redis (Pub/Sub & Stream Caching).
- **Containerization**: Docker, Docker Compose.

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- [Node.js v18+](https://nodejs.org)
- [Docker & Docker Compose](https://www.docker.com)
- [Git](https://git-scm.com)

### 2. Clone Repository
```bash
git clone https://github.com/your-username/apex-kepler-cex.git
cd apex-kepler-cex
```

### 3. Start Infrastructure (PostgreSQL & Redis)
```bash
docker-compose up -d
```

### 4. Setup Environment Variables
Copy `.env.example` to `.env` in `apps/api`:
```bash
cp apps/api/.env.example apps/api/.env
```

### 5. Push Database Schema & Seed 80+ Market Pairs
```bash
cd apps/api
npx prisma db push
npx tsx prisma/seed.ts
cd ../..
```

### 6. Run Development Servers
```bash
npx concurrently -n "API,WEB" -c "cyan,green" "npm run dev --prefix apps/api" "npm run dev --prefix apps/web"
```

- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:4000](http://localhost:4000)
- **Crypto Heatmap**: [http://localhost:3000/heatmap](http://localhost:3000/heatmap)

---

## 🔑 Demo Account Credentials

| Account Role | Email | Password | Pre-Funded Balance |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@kepler.exchange` | `Password123!` | **$500,000.00 USDT** + 100 BTC / ETH |
| 💼 **Merchant P2P** | `merchant@kepler.exchange` | `Password123!` | **$500,000.00 USDT** |
| 📈 **Pro Trader VIP** | `trader@kepler.exchange` | `Password123!` | **$500,000.00 USDT** |

---

## 📜 License
MIT License. Created for educational and demonstration purposes.
