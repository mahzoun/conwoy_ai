import { Match, BoardState, PlayerSlot, AgentId, PatternId } from './game';

// Client -> Server messages
export type ClientMessageType =
  | 'PLAYER_JOIN'
  | 'SELECT_AGENT'
  | 'SELECT_PATTERN'
  | 'PLACE_PATTERN'
  | 'CONFIRM_READY'
  | 'REQUEST_REMATCH'
  | 'SPECTATE'
  | 'PING';

// Server -> Client messages
export type ServerMessageType =
  | 'MATCH_UPDATED'
  | 'SIMULATION_TICK'
  | 'MATCH_FINISHED'
  | 'ERROR'
  | 'CONNECTED'
  | 'PONG'
  | 'REMATCH_REQUESTED';

// Client -> Server message payloads
export interface PlayerJoinMessage {
  type: 'PLAYER_JOIN';
  matchId: string;
  walletAddress: string;
  slot?: PlayerSlot;
}

export interface SelectAgentMessage {
  type: 'SELECT_AGENT';
  matchId: string;
  walletAddress: string;
  agentId: AgentId;
}

export interface SelectPatternMessage {
  type: 'SELECT_PATTERN';
  matchId: string;
  walletAddress: string;
  patternId: PatternId;
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
}

export interface PlacePatternMessage {
  type: 'PLACE_PATTERN';
  matchId: string;
  walletAddress: string;
  row: number;
  col: number;
}

export interface ConfirmReadyMessage {
  type: 'CONFIRM_READY';
  matchId: string;
  walletAddress: string;
}

export interface RequestRematchMessage {
  type: 'REQUEST_REMATCH';
  matchId: string;
  walletAddress: string;
}

export interface SpectateMessage {
  type: 'SPECTATE';
  matchId: string;
}

export interface PingMessage {
  type: 'PING';
}

export type ClientMessage =
  | PlayerJoinMessage
  | SelectAgentMessage
  | SelectPatternMessage
  | PlacePatternMessage
  | ConfirmReadyMessage
  | RequestRematchMessage
  | SpectateMessage
  | PingMessage;

// Server -> Client message payloads
export interface MatchUpdatedMessage {
  type: 'MATCH_UPDATED';
  match: Match;
}

export interface SimulationTickMessage {
  type: 'SIMULATION_TICK';
  generation: number;
  boardState: BoardState;
  scoreP1: number;
  scoreP2: number;
}

export interface MatchFinishedMessage {
  type: 'MATCH_FINISHED';
  winner: PlayerSlot | 'draw';
  finalScoreP1: number;
  finalScoreP2: number;
  cumulativeScoreP1: number;
  cumulativeScoreP2: number;
  resultSignature: string;
  matchId: string;
}

export interface ErrorMessage {
  type: 'ERROR';
  code: string;
  message: string;
}

export interface ConnectedMessage {
  type: 'CONNECTED';
  connectionId: string;
  timestamp: string;
}

export interface PongMessage {
  type: 'PONG';
  timestamp: string;
}

export interface RematchRequestedMessage {
  type: 'REMATCH_REQUESTED';
  walletAddress: string;
  newMatchId?: string;
}

export type ServerMessage =
  | MatchUpdatedMessage
  | SimulationTickMessage
  | MatchFinishedMessage
  | ErrorMessage
  | ConnectedMessage
  | PongMessage
  | RematchRequestedMessage;
