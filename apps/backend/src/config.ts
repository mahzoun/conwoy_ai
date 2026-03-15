import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: process.env['NODE_ENV'] === 'production',

  database: {
    url: optionalEnv(
      'DATABASE_URL',
      'postgresql://postgres:password@localhost:5432/conwoy_ai'
    ),
  },

  signing: {
    privateKey: optionalEnv(
      'SIGNING_PRIVATE_KEY',
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    ),
  },

  jwt: {
    secret: optionalEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  },

  cors: {
    origin: optionalEnv('CORS_ORIGIN', 'http://localhost:3000'),
  },
} as const;

export type Config = typeof config;
