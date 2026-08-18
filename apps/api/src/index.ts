import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import { setupWebSocketGateway } from './websocket/gateway';
import { marketDataService } from './domains/market-data/market-data.service';
import { fundingRateService } from './domains/futures/funding-rate.service';
import { liquidationService } from './domains/futures/liquidation.service';
import { rateLimiter } from './middleware/rate-limiter';
import { redisPub, redisSub, prisma } from './config/db';

import authRouter from './domains/auth/auth.router';
import assetsRouter from './domains/assets/assets.router';
import marketsRouter from './domains/markets/markets.router';
import walletRouter from './domains/wallet/wallet.router';
import tradingRouter from './domains/trading/trading.router';
import marketDataRouter from './domains/marketdata/marketdata.router';
import p2pRouter from './domains/p2p/p2p.router';
import futuresRouter from './domains/futures/futures.router';
import sepayRouter from './domains/sepay/sepay.router';
import adminRouter from './domains/admin/admin.router';

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);

app.use(helmet());
app.use(cors());
app.use(express.json());

import { tradeLimiter, publicApiLimiter } from './middleware/rate-limiter.middleware';

// API Domain Routes with Dedicated Rate Limiting Defense
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/markets', marketsRouter);
app.use('/api/v1/wallets', walletRouter);
app.use('/api/v1', tradeLimiter, tradingRouter);
app.use('/api/v1/marketdata', publicApiLimiter, marketDataRouter);
app.use('/api/v1/p2p', p2pRouter);
app.use('/api/v1/futures', tradeLimiter, futuresRouter);
app.use('/api/v1/sepay', sepayRouter);
app.use('/api/v1/admin', adminRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', environment: ENV.NODE_ENV, time: new Date() });
});

import { fundingFeeService } from './domains/futures/funding.service';

// Setup Real-time WebSocket Gateway
setupWebSocketGateway(server);

// Start Market Data Pipeline & Funding Rate Automated Settlement Worker
marketDataService.start().then(() => {
  console.log('📡 Market Data Pipeline started');
});
fundingRateService.startAutomatedWorker();
liquidationService.startAutomatedWorker();
fundingFeeService.startWorker();

server.listen(ENV.PORT, () => {
  console.log(`🚀 Apex Exchange Backend Engine running on http://localhost:${ENV.PORT}`);
});

// Graceful Server Shutdown Handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting Graceful Server Shutdown...`);

  fundingRateService.stopWorker();
  fundingFeeService.stopWorker();

  server.close(async () => {
    console.log('🔌 HTTP Server closed.');
    try {
      await redisPub.quit();
      await redisSub.quit();
      await prisma.$disconnect();
      console.log('✅ Redis & Database connections cleanly disconnected.');
      process.exit(0);
    } catch (e: any) {
      console.error('Error during shutdown:', e.message);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
