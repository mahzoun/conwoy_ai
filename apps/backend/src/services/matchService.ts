import { v4 as uuidv4 } from 'uuid';
import {
  Match,
  PlayerState,
  MatchConfig,
  GamePhase,
  PlayerSlot,
  AgentId,
  PatternId,
  BoardState,
} from '@conwoy/shared';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  MAX_GENERATIONS,
  DEFAULT_ENTRY_FEE_WEI,
  SETUP_TIMEOUT_SECONDS,
  MAX_INITIAL_CELLS,
} from '@conwoy/shared';
import { query, queryOne } from '../db/client';
import { DbMatch, DbPlayer } from '../db/schema';
import { createEmptyBoard, setCells } from '../engine/gameOfLife';
import { validatePlacement, validateAgentPattern, validateAgentTransform } from '../engine/validator';
import { PATTERNS, AGENTS } from '@conwoy/shared';
import { transformPattern } from '../engine/patternTransform';
import { ERROR_CODES } from '@conwoy/shared';

// In-memory match cache for active games
const activeMatches = new Map<string, Match>();

function makeDefaultConfig(partial?: Partial<MatchConfig>): MatchConfig {
  return {
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    maxGenerations: MAX_GENERATIONS,
    entryFeeWei: DEFAULT_ENTRY_FEE_WEI,
    setupTimeoutSeconds: SETUP_TIMEOUT_SECONDS,
    maxInitialCells: MAX_INITIAL_CELLS,
    ...partial,
  };
}

function makePlayerState(slot: PlayerSlot, walletAddress: string): PlayerState {
  return {
    slot,
    walletAddress,
    agentId: null,
    selectedPatternId: null,
    patternRotation: 0,
    patternMirror: false,
    placedCells: [],
    isReady: false,
    liveCellCount: 0,
    cumulativeCells: 0,
  };
}

function dbMatchToMatch(dbMatch: DbMatch, players: DbPlayer[]): Match {
  const p1db = players.find(p => p.slot === 1) ?? null;
  const p2db = players.find(p => p.slot === 2) ?? null;

  function dbPlayerToState(dbp: DbPlayer): PlayerState {
    return {
      slot: dbp.slot,
      walletAddress: dbp.wallet_address,
      agentId: (dbp.agent_id as AgentId) ?? null,
      selectedPatternId: (dbp.selected_pattern_id as PatternId) ?? null,
      patternRotation: dbp.pattern_rotation,
      patternMirror: dbp.pattern_mirror,
      placedCells: dbp.placed_cells,
      isReady: dbp.is_ready,
      liveCellCount: 0,
      cumulativeCells: 0,
    };
  }

  const winnerRaw = dbMatch.winner;
  let winner: PlayerSlot | 'draw' | null = null;
  if (winnerRaw === '1' || winnerRaw === 1) winner = 1;
  else if (winnerRaw === '2' || winnerRaw === 2) winner = 2;
  else if (winnerRaw === 'draw') winner = 'draw';

  return {
    id: dbMatch.id,
    contractMatchId: dbMatch.contract_match_id,
    transactionHash: dbMatch.transaction_hash,
    config: dbMatch.config,
    phase: dbMatch.phase as GamePhase,
    player1: p1db ? dbPlayerToState(p1db) : null,
    player2: p2db ? dbPlayerToState(p2db) : null,
    currentGeneration: 0,
    boardState: null,
    winner,
    finalScoreP1: dbMatch.final_score_p1,
    finalScoreP2: dbMatch.final_score_p2,
    cumulativeScoreP1: dbMatch.cumulative_score_p1,
    cumulativeScoreP2: dbMatch.cumulative_score_p2,
    createdAt: dbMatch.created_at.toISOString(),
    startedAt: dbMatch.started_at?.toISOString() ?? null,
    finishedAt: dbMatch.finished_at?.toISOString() ?? null,
    resultSignature: dbMatch.result_signature,
  };
}

export async function createMatch(
  walletAddress: string,
  configPartial?: Partial<MatchConfig>,
  contractMatchId?: number,
  transactionHash?: string
): Promise<Match> {
  const matchId = uuidv4();
  const config = makeDefaultConfig(configPartial);
  const playerId = uuidv4();

  await query(
    `INSERT INTO matches (id, contract_match_id, transaction_hash, phase, config)
     VALUES ($1, $2, $3, 'waiting', $4)`,
    [matchId, contractMatchId ?? null, transactionHash ?? null, JSON.stringify(config)]
  );

  await query(
    `INSERT INTO players (id, match_id, slot, wallet_address)
     VALUES ($1, $2, 1, $3)`,
    [playerId, matchId, walletAddress.toLowerCase()]
  );

  const match: Match = {
    id: matchId,
    contractMatchId: contractMatchId ?? null,
    transactionHash: transactionHash ?? null,
    config,
    phase: 'waiting',
    player1: makePlayerState(1, walletAddress.toLowerCase()),
    player2: null,
    currentGeneration: 0,
    boardState: createEmptyBoard(config.boardWidth, config.boardHeight),
    winner: null,
    finalScoreP1: 0,
    finalScoreP2: 0,
    cumulativeScoreP1: 0,
    cumulativeScoreP2: 0,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    resultSignature: null,
  };

  activeMatches.set(matchId, match);
  return match;
}

export async function joinMatch(
  matchId: string,
  walletAddress: string,
  transactionHash?: string
): Promise<{ match: Match; slot: PlayerSlot }> {
  let match = activeMatches.get(matchId) ?? await loadMatch(matchId);
  if (!match) throw new Error(ERROR_CODES.MATCH_NOT_FOUND);
  if (match.phase !== 'waiting') throw new Error(ERROR_CODES.MATCH_WRONG_PHASE);
  if (match.player2 !== null) throw new Error(ERROR_CODES.MATCH_FULL);
  if (match.player1?.walletAddress === walletAddress.toLowerCase()) {
    throw new Error('Cannot join your own match');
  }

  const playerId = uuidv4();
  await query(
    `INSERT INTO players (id, match_id, slot, wallet_address)
     VALUES ($1, $2, 2, $3)`,
    [playerId, matchId, walletAddress.toLowerCase()]
  );

  if (transactionHash) {
    await query(
      `UPDATE matches SET transaction_hash = $1 WHERE id = $2`,
      [transactionHash, matchId]
    );
  }

  await query(
    `UPDATE matches SET phase = 'setup' WHERE id = $1`,
    [matchId]
  );

  match = {
    ...match,
    phase: 'setup',
    transactionHash: transactionHash ?? match.transactionHash,
    player2: makePlayerState(2, walletAddress.toLowerCase()),
  };

  activeMatches.set(matchId, match);
  return { match, slot: 2 };
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const cached = activeMatches.get(matchId);
  if (cached) return cached;
  return loadMatch(matchId);
}

async function loadMatch(matchId: string): Promise<Match | null> {
  const dbMatch = await queryOne<DbMatch>(
    `SELECT * FROM matches WHERE id = $1`,
    [matchId]
  );
  if (!dbMatch) return null;

  const players = await query<DbPlayer>(
    `SELECT * FROM players WHERE match_id = $1 ORDER BY slot`,
    [matchId]
  );

  const match = dbMatchToMatch(dbMatch, players);
  if (match.phase !== 'finished') {
    match.boardState = createEmptyBoard(match.config.boardWidth, match.config.boardHeight);
    activeMatches.set(matchId, match);
  }
  return match;
}

export async function listMatches(
  phase?: string,
  page = 1,
  pageSize = 20
): Promise<{ matches: Match[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const whereClause = phase ? `WHERE phase = $1` : `WHERE phase IN ('waiting', 'setup')`;
  const params: unknown[] = phase ? [phase, pageSize, offset] : [pageSize, offset];
  const paramOffset = phase ? 2 : 1;

  const rows = await query<DbMatch & { total_count: string }>(
    `SELECT m.*, COUNT(*) OVER() as total_count
     FROM matches m
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramOffset} OFFSET $${paramOffset + 1}`,
    params
  );

  if (rows.length === 0) return { matches: [], total: 0 };

  const total = parseInt(rows[0]!.total_count, 10);
  const matchIds = rows.map(r => r.id);

  const allPlayers = await query<DbPlayer>(
    `SELECT * FROM players WHERE match_id = ANY($1)`,
    [matchIds]
  );

  const playersByMatch = new Map<string, DbPlayer[]>();
  for (const p of allPlayers) {
    const arr = playersByMatch.get(p.match_id) ?? [];
    arr.push(p);
    playersByMatch.set(p.match_id, arr);
  }

  const matches = rows.map(dbMatch => {
    const match = dbMatchToMatch(dbMatch, playersByMatch.get(dbMatch.id) ?? []);
    if (match.phase !== 'finished') {
      match.boardState = createEmptyBoard(match.config.boardWidth, match.config.boardHeight);
    }
    return match;
  });

  return { matches, total };
}

export async function selectAgent(
  matchId: string,
  walletAddress: string,
  agentId: AgentId
): Promise<Match> {
  const match = activeMatches.get(matchId) ?? await loadMatch(matchId);
  if (!match) throw new Error(ERROR_CODES.MATCH_NOT_FOUND);
  if (match.phase !== 'setup') throw new Error(ERROR_CODES.MATCH_WRONG_PHASE);

  const addr = walletAddress.toLowerCase();
  const slot = getPlayerSlot(match, addr);
  if (!slot) throw new Error(ERROR_CODES.PLAYER_NOT_IN_MATCH);

  if (!AGENTS[agentId]) throw new Error(ERROR_CODES.INVALID_AGENT);

  await query(
    `UPDATE players SET agent_id = $1 WHERE match_id = $2 AND slot = $3`,
    [agentId, matchId, slot]
  );

  const updatedMatch = updatePlayerInMatch(match, slot, { agentId, selectedPatternId: null });
  activeMatches.set(matchId, updatedMatch);
  return updatedMatch;
}

export async function selectPattern(
  matchId: string,
  walletAddress: string,
  patternId: PatternId,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean
): Promise<Match> {
  const match = activeMatches.get(matchId) ?? await loadMatch(matchId);
  if (!match) throw new Error(ERROR_CODES.MATCH_NOT_FOUND);
  if (match.phase !== 'setup') throw new Error(ERROR_CODES.MATCH_WRONG_PHASE);

  const addr = walletAddress.toLowerCase();
  const slot = getPlayerSlot(match, addr);
  if (!slot) throw new Error(ERROR_CODES.PLAYER_NOT_IN_MATCH);

  const player = slot === 1 ? match.player1 : match.player2;
  if (!player?.agentId) throw new Error(ERROR_CODES.AGENT_NOT_SELECTED);

  // Validate agent can use this pattern
  const agentValidation = validateAgentPattern(player.agentId, patternId);
  if (!agentValidation.valid) throw new Error(agentValidation.code ?? ERROR_CODES.PATTERN_NOT_ALLOWED);

  // Validate transform permissions
  const transformValidation = validateAgentTransform(player.agentId, rotation, mirror);
  if (!transformValidation.valid) throw new Error(transformValidation.code ?? ERROR_CODES.INVALID_PLACEMENT);

  if (!PATTERNS[patternId]) throw new Error(ERROR_CODES.INVALID_PATTERN);

  await query(
    `UPDATE players SET selected_pattern_id = $1, pattern_rotation = $2, pattern_mirror = $3
     WHERE match_id = $4 AND slot = $5`,
    [patternId, rotation, mirror, matchId, slot]
  );

  const updatedMatch = updatePlayerInMatch(match, slot, { selectedPatternId: patternId, patternRotation: rotation, patternMirror: mirror });
  activeMatches.set(matchId, updatedMatch);
  return updatedMatch;
}

export async function placePattern(
  matchId: string,
  walletAddress: string,
  row: number,
  col: number
): Promise<Match> {
  const match = activeMatches.get(matchId) ?? await loadMatch(matchId);
  if (!match) throw new Error(ERROR_CODES.MATCH_NOT_FOUND);
  if (match.phase !== 'setup') throw new Error(ERROR_CODES.MATCH_WRONG_PHASE);

  const addr = walletAddress.toLowerCase();
  const slot = getPlayerSlot(match, addr);
  if (!slot) throw new Error(ERROR_CODES.PLAYER_NOT_IN_MATCH);

  const player = slot === 1 ? match.player1 : match.player2;
  if (!player?.agentId) throw new Error(ERROR_CODES.AGENT_NOT_SELECTED);
  if (!player.selectedPatternId) throw new Error(ERROR_CODES.INVALID_PATTERN);

  const pattern = PATTERNS[player.selectedPatternId];
  if (!pattern) throw new Error(ERROR_CODES.INVALID_PATTERN);

  const board = match.boardState ?? createEmptyBoard(match.config.boardWidth, match.config.boardHeight);

  const validation = validatePlacement(
    board,
    pattern,
    row,
    col,
    slot,
    player.patternRotation,
    player.patternMirror,
    player.placedCells.length
  );

  if (!validation.valid) {
    throw new Error(validation.code ?? ERROR_CODES.INVALID_PLACEMENT);
  }

  // Compute actual cells to place
  const transformedCells = transformPattern(
    pattern.cells,
    player.patternRotation,
    player.patternMirror,
    pattern.width,
    pattern.height
  );

  const newCells: [number, number][] = transformedCells.map(([dr, dc]) => [row + dr, col + dc]);
  const allCells: [number, number][] = [...player.placedCells, ...newCells];

  // Update board state
  const newBoard = setCells(board, newCells, slot as 1 | 2);

  await query(
    `UPDATE players SET placed_cells = $1 WHERE match_id = $2 AND slot = $3`,
    [JSON.stringify(allCells), matchId, slot]
  );

  const updatedPlayer = { ...player, placedCells: allCells, liveCellCount: allCells.length };
  const updatedMatch: Match = {
    ...match,
    boardState: newBoard,
    player1: slot === 1 ? updatedPlayer : match.player1,
    player2: slot === 2 ? updatedPlayer : match.player2,
  };

  activeMatches.set(matchId, updatedMatch);
  return updatedMatch;
}

export async function confirmReady(
  matchId: string,
  walletAddress: string
): Promise<{ match: Match; bothReady: boolean }> {
  const match = activeMatches.get(matchId) ?? await loadMatch(matchId);
  if (!match) throw new Error(ERROR_CODES.MATCH_NOT_FOUND);
  if (match.phase !== 'setup') throw new Error(ERROR_CODES.MATCH_WRONG_PHASE);

  const addr = walletAddress.toLowerCase();
  const slot = getPlayerSlot(match, addr);
  if (!slot) throw new Error(ERROR_CODES.PLAYER_NOT_IN_MATCH);

  const player = slot === 1 ? match.player1 : match.player2;
  if (player?.isReady) throw new Error(ERROR_CODES.ALREADY_READY);

  await query(
    `UPDATE players SET is_ready = true WHERE match_id = $1 AND slot = $2`,
    [matchId, slot]
  );

  const updatedPlayer = { ...player!, isReady: true };
  let updatedMatch: Match = {
    ...match,
    player1: slot === 1 ? updatedPlayer : match.player1,
    player2: slot === 2 ? updatedPlayer : match.player2,
  };

  const p1Ready = updatedMatch.player1?.isReady ?? false;
  const p2Ready = updatedMatch.player2?.isReady ?? false;
  const bothReady = p1Ready && p2Ready;

  if (bothReady) {
    await query(
      `UPDATE matches SET phase = 'running', started_at = NOW() WHERE id = $1`,
      [matchId]
    );
    updatedMatch = { ...updatedMatch, phase: 'running', startedAt: new Date().toISOString() };
  }

  activeMatches.set(matchId, updatedMatch);
  return { match: updatedMatch, bothReady };
}

export async function finalizeMatch(
  matchId: string,
  winner: PlayerSlot | 'draw',
  finalScoreP1: number,
  finalScoreP2: number,
  cumulativeScoreP1: number,
  cumulativeScoreP2: number,
  resultSignature: string
): Promise<Match> {
  const match = activeMatches.get(matchId) ?? await loadMatch(matchId);
  if (!match) throw new Error(ERROR_CODES.MATCH_NOT_FOUND);

  const winnerStr = winner === 'draw' ? 'draw' : String(winner);

  await query(
    `UPDATE matches SET
       phase = 'finished',
       winner = $1,
       final_score_p1 = $2,
       final_score_p2 = $3,
       cumulative_score_p1 = $4,
       cumulative_score_p2 = $5,
       result_signature = $6,
       finished_at = NOW()
     WHERE id = $7`,
    [winnerStr, finalScoreP1, finalScoreP2, cumulativeScoreP1, cumulativeScoreP2, resultSignature, matchId]
  );

  const updatedMatch: Match = {
    ...match,
    phase: 'finished',
    winner,
    finalScoreP1,
    finalScoreP2,
    cumulativeScoreP1,
    cumulativeScoreP2,
    resultSignature,
    finishedAt: new Date().toISOString(),
  };

  activeMatches.set(matchId, updatedMatch);
  return updatedMatch;
}

export function updateMatchBoardState(matchId: string, boardState: BoardState, generation: number): void {
  const match = activeMatches.get(matchId);
  if (match) {
    activeMatches.set(matchId, { ...match, boardState, currentGeneration: generation });
  }
}

export function getActiveMatch(matchId: string): Match | undefined {
  return activeMatches.get(matchId);
}

export async function getMatchHistory(
  walletAddress: string,
  page = 1,
  pageSize = 20
): Promise<{ items: DbMatchHistoryRow[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const addr = walletAddress.toLowerCase();

  const rows = await query<DbMatchHistoryRow & { total_count: string }>(
    `SELECT *, COUNT(*) OVER() as total_count
     FROM match_history
     WHERE wallet_address = $1
     ORDER BY finished_at DESC
     LIMIT $2 OFFSET $3`,
    [addr, pageSize, offset]
  );

  if (rows.length === 0) return { items: [], total: 0 };
  const total = parseInt(rows[0]!.total_count, 10);
  return { items: rows, total };
}

interface DbMatchHistoryRow {
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

// Helper functions
function getPlayerSlot(match: Match, walletAddress: string): PlayerSlot | null {
  const addr = walletAddress.toLowerCase();
  if (match.player1?.walletAddress === addr) return 1;
  if (match.player2?.walletAddress === addr) return 2;
  return null;
}

function updatePlayerInMatch(
  match: Match,
  slot: PlayerSlot,
  updates: Partial<PlayerState>
): Match {
  const player = slot === 1 ? match.player1 : match.player2;
  if (!player) return match;
  const updated = { ...player, ...updates };
  return {
    ...match,
    player1: slot === 1 ? updated : match.player1,
    player2: slot === 2 ? updated : match.player2,
  };
}
