import { WebSocket } from 'ws';
import { Match, PlayerSlot } from '@conwoy/shared';

export interface AuthenticatedRequest {
  walletAddress: string;
  signature: string;
  timestamp?: number;
}

export interface WsClientInfo {
  ws: WebSocket;
  connectionId: string;
  matchId?: string;
  walletAddress?: string;
  slot?: PlayerSlot;
  isSpectator?: boolean;
  lastPing?: number;
}

export interface WsMatchRoom {
  matchId: string;
  clients: Map<string, WsClientInfo>; // connectionId -> client
}

export interface MatchInMemory {
  match: Match;
  simulationHistory: BoardSnapshot[];
  rematchRequests: Set<string>;
}

export interface BoardSnapshot {
  generation: number;
  boardState: {
    width: number;
    height: number;
    cells: Array<Array<{ alive: boolean; owner: 0 | 1 | 2 }>>;
    generation: number;
  };
  scoreP1: number;
  scoreP2: number;
  timestamp: string;
}

export interface ValidationError {
  code: string;
  message: string;
}
