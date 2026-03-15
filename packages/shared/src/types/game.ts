export type AgentId = 'architect' | 'swarm' | 'chaos' | 'engineer';
export type PatternId = 'block' | 'boat' | 'tub' | 'glider' | 'lwss' | 'blinker' | 'toad' | 'beacon';
export type PlayerSlot = 1 | 2;
export type GamePhase = 'waiting' | 'setup' | 'ready' | 'running' | 'finished';
export type CellOwner = 0 | 1 | 2; // 0=dead, 1=player1, 2=player2

export interface Cell {
  alive: boolean;
  owner: CellOwner;
}

export interface BoardState {
  width: number;
  height: number;
  cells: Cell[][];
  generation: number;
}

export interface Pattern {
  id: PatternId;
  name: string;
  description: string;
  cells: [number, number][]; // relative [row, col] offsets
  width: number;
  height: number;
}

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  allowedPatterns: PatternId[];
  canRotate: boolean;
  canMirror: boolean;
  color: string;
  bgColor: string;
}

export interface PlayerState {
  slot: PlayerSlot;
  walletAddress: string;
  agentId: AgentId | null;
  selectedPatternId: PatternId | null;
  patternRotation: 0 | 90 | 180 | 270;
  patternMirror: boolean;
  placedCells: [number, number][];
  isReady: boolean;
  liveCellCount: number;
  cumulativeCells: number;
}

export interface MatchConfig {
  boardWidth: number;
  boardHeight: number;
  maxGenerations: number;
  entryFeeWei: string;
  setupTimeoutSeconds: number;
  maxInitialCells: number;
}

export interface Match {
  id: string;
  contractMatchId: number | null;
  transactionHash: string | null;
  config: MatchConfig;
  phase: GamePhase;
  player1: PlayerState | null;
  player2: PlayerState | null;
  currentGeneration: number;
  boardState: BoardState | null;
  winner: PlayerSlot | null | 'draw';
  finalScoreP1: number;
  finalScoreP2: number;
  cumulativeScoreP1: number;
  cumulativeScoreP2: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  resultSignature: string | null;
}

export interface SimulationTick {
  generation: number;
  boardState: BoardState;
  scoreP1: number;
  scoreP2: number;
}

export interface MatchResult {
  matchId: string;
  winner: PlayerSlot | 'draw';
  finalScoreP1: number;
  finalScoreP2: number;
  totalGenerations: number;
  resultSignature: string;
}

export interface PlacementRequest {
  matchId: string;
  walletAddress: string;
  patternId: PatternId;
  row: number;
  col: number;
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
}
