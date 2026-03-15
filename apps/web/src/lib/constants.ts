export const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
export const WS_URL = process.env['NEXT_PUBLIC_WS_URL'] ?? 'ws://localhost:3001';
export const WALLETCONNECT_PROJECT_ID = process.env['NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'] ?? '';

export const CELL_SIZE_DEFAULT = 12;
export const CELL_SIZE_MIN = 4;
export const CELL_SIZE_MAX = 32;
export const ZOOM_STEP = 0.1;
export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 3;

export const PLAYER1_COLOR = '#3b82f6';
export const PLAYER2_COLOR = '#ef4444';
export const DEAD_CELL_COLOR = '#111827';
export const GRID_COLOR = '#1f2937';
export const ZONE1_OVERLAY = 'rgba(59, 130, 246, 0.08)';
export const ZONE2_OVERLAY = 'rgba(239, 68, 68, 0.08)';
export const HOVER_COLOR = 'rgba(255, 255, 255, 0.3)';
export const INVALID_COLOR = 'rgba(239, 68, 68, 0.5)';

export const SIMULATION_SPEEDS = [
  { label: '0.5x', ms: 200 },
  { label: '1x', ms: 100 },
  { label: '2x', ms: 50 },
  { label: '4x', ms: 25 },
] as const;
