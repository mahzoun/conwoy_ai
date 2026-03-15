import { mainnet, sepolia, polygon, hardhat } from 'wagmi/chains';

export const ESCROW_ADDRESSES: Record<number, `0x${string}`> = {
  [mainnet.id]: (process.env['NEXT_PUBLIC_ESCROW_ADDRESS_MAINNET'] ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  [sepolia.id]: (process.env['NEXT_PUBLIC_ESCROW_ADDRESS_SEPOLIA'] ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  [polygon.id]: (process.env['NEXT_PUBLIC_ESCROW_ADDRESS_POLYGON'] ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
  [hardhat.id]: (process.env['NEXT_PUBLIC_ESCROW_ADDRESS_LOCALHOST'] ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`,
};

export const GAME_ESCROW_ABI = [
  {
    type: 'function',
    name: 'createMatch',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'joinMatch',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'finalizeMatch',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'winner', type: 'address' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'finalizeDrawMatch',
    inputs: [
      { name: 'matchId', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'refundExpiredMatch',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getMatch',
    inputs: [{ name: 'matchId', type: 'uint256' }],
    outputs: [
      { name: 'player1', type: 'address' },
      { name: 'player2', type: 'address' },
      { name: 'stake', type: 'uint256' },
      { name: 'finalized', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'MatchCreated',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'player1', type: 'address', indexed: true },
      { name: 'stake', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchJoined',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'player2', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'MatchFinalized',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'payout', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MatchRefunded',
    inputs: [
      { name: 'matchId', type: 'uint256', indexed: true },
      { name: 'player1', type: 'address', indexed: true },
    ],
  },
] as const;
