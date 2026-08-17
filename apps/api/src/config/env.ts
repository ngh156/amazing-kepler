import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const ENV = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://kepler:kepler_password@localhost:5432/kepler_exchange?schema=public',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'kepler_super_secret_jwt_key_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'kepler_super_secret_refresh_jwt_key_2026',
  SIMULATION_MODE: process.env.SIMULATION_MODE !== 'false',
  ETH_SEPOLIA_RPC: process.env.ETH_SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com',
};
