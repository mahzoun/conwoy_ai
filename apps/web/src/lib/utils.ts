import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatEth(wei: string, decimals = 4): string {
  const eth = Number(BigInt(wei)) / 1e18;
  return eth.toFixed(decimals).replace(/\.?0+$/, '') || '0';
}

export function formatWei(wei: string): string {
  const value = BigInt(wei);
  if (value === BigInt(0)) return 'Free';
  const eth = Number(value) / 1e18;
  if (eth < 0.001) return `${(eth * 1000).toFixed(3)} mETH`;
  return `${eth.toFixed(4)} ETH`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getWinnerLabel(winner: number | string | null): string {
  if (winner === null) return 'In Progress';
  if (winner === 'draw' || winner === 0) return 'Draw';
  if (winner === 1 || winner === '1') return 'Player 1 Wins';
  if (winner === 2 || winner === '2') return 'Player 2 Wins';
  return 'Unknown';
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
