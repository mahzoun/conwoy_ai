import { Match, MatchConfig, PlayerSlot, AgentId, PatternId } from './game';

// Request types
export interface CreateMatchRequest {
  walletAddress: string;
  signature: string;
  config?: Partial<MatchConfig>;
  contractMatchId?: number;
  transactionHash?: string;
}

export interface JoinMatchRequest {
  walletAddress: string;
  signature: string;
  transactionHash?: string;
}

export interface SelectAgentRequest {
  agentId: AgentId;
  walletAddress: string;
  signature: string;
}

export interface PlacePatternRequest {
  walletAddress: string;
  signature: string;
  patternId: PatternId;
  row: number;
  col: number;
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
}

export interface ConfirmReadyRequest {
  walletAddress: string;
  signature: string;
}

// Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface CreateMatchResponse {
  match: Match;
}

export interface JoinMatchResponse {
  match: Match;
  slot: PlayerSlot;
}

export interface GetMatchResponse {
  match: Match;
}

export interface ListMatchesResponse {
  matches: MatchListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MatchListItem {
  id: string;
  phase: string;
  player1Address: string | null;
  player2Address: string | null;
  entryFeeWei: string;
  createdAt: string;
  winner: PlayerSlot | null | 'draw';
}

export interface ProfileResponse {
  walletAddress: string;
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  totalEarnings: string;
  recentMatches: MatchHistoryItem[];
}

export interface MatchHistoryItem {
  matchId: string;
  opponentAddress: string;
  playerSlot: PlayerSlot;
  result: 'win' | 'loss' | 'draw';
  finalScoreSelf: number;
  finalScoreOpponent: number;
  entryFeeWei: string;
  finishedAt: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  database: 'connected' | 'disconnected';
  version: string;
}
