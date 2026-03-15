/**
 * Database schema definitions as TypeScript interfaces.
 * These correspond to the SQL tables defined in migrations/001_initial.sql
 */

export interface DbMatch {
  id: string;
  contract_match_id: number | null;
  transaction_hash: string | null;
  phase: string;
  config: {
    boardWidth: number;
    boardHeight: number;
    maxGenerations: number;
    entryFeeWei: string;
    setupTimeoutSeconds: number;
    maxInitialCells: number;
  };
  winner: number | string | null;
  final_score_p1: number;
  final_score_p2: number;
  cumulative_score_p1: number;
  cumulative_score_p2: number;
  result_signature: string | null;
  created_at: Date;
  started_at: Date | null;
  finished_at: Date | null;
}

export interface DbPlayer {
  id: string;
  match_id: string;
  slot: 1 | 2;
  wallet_address: string;
  agent_id: string | null;
  selected_pattern_id: string | null;
  pattern_rotation: 0 | 90 | 180 | 270;
  pattern_mirror: boolean;
  placed_cells: [number, number][];
  is_ready: boolean;
}

export interface DbGameState {
  id: string;
  match_id: string;
  generation: number;
  board_state: {
    width: number;
    height: number;
    cells: Array<Array<{ alive: boolean; owner: 0 | 1 | 2 }>>;
    generation: number;
  };
  score_p1: number;
  score_p2: number;
  created_at: Date;
}

export interface DbMatchHistoryView {
  match_id: string;
  wallet_address: string;
  player_slot: 1 | 2;
  opponent_address: string;
  result: 'win' | 'loss' | 'draw';
  final_score_self: number;
  final_score_opponent: number;
  entry_fee_wei: string;
  finished_at: Date;
}
