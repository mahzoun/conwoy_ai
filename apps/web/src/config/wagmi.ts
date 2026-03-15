'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, polygon, hardhat } from 'wagmi/chains';
import { WALLETCONNECT_PROJECT_ID } from '../lib/constants';

export const wagmiConfig = getDefaultConfig({
  appName: 'Conwoy AI — Competitive Conway\'s Game of Life',
  projectId: WALLETCONNECT_PROJECT_ID || 'demo-project-id',
  chains: [mainnet, sepolia, polygon, hardhat],
  ssr: true,
});
