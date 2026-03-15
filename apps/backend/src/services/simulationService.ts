import { BoardState } from '@conwoy/shared';
import { SIMULATION_TICK_INTERVAL_MS } from '@conwoy/shared';
import { stepGeneration, countLiveCells } from '../engine/gameOfLife';
import { determineWinner, shouldTerminateEarly } from '../engine/scorer';
import { updateMatchBoardState, getActiveMatch, finalizeMatch } from './matchService';
import { resultService } from './resultService';
import { query } from '../db/client';
import { v4 as uuidv4 } from 'uuid';

export type TickCallback = (
  generation: number,
  boardState: BoardState,
  scoreP1: number,
  scoreP2: number
) => void;

export type FinishCallback = (
  winner: 1 | 2 | 'draw',
  finalScoreP1: number,
  finalScoreP2: number,
  cumulativeScoreP1: number,
  cumulativeScoreP2: number,
  resultSignature: string
) => void;

interface SimulationState {
  matchId: string;
  currentBoard: BoardState;
  history: BoardState[];
  maxGenerations: number;
  intervalMs: number;
  timer: NodeJS.Timeout | null;
  isPaused: boolean;
  cumulativeP1: number;
  cumulativeP2: number;
  onTick: TickCallback;
  onFinish: FinishCallback;
}

// Active simulations map
const activeSimulations = new Map<string, SimulationState>();

export async function startSimulation(
  matchId: string,
  initialBoard: BoardState,
  maxGenerations: number,
  onTick: TickCallback,
  onFinish: FinishCallback,
  intervalMs = SIMULATION_TICK_INTERVAL_MS
): Promise<void> {
  if (activeSimulations.has(matchId)) {
    stopSimulation(matchId);
  }

  const state: SimulationState = {
    matchId,
    currentBoard: initialBoard,
    history: [initialBoard],
    maxGenerations,
    intervalMs,
    timer: null,
    isPaused: false,
    cumulativeP1: 0,
    cumulativeP2: 0,
    onTick,
    onFinish,
  };

  activeSimulations.set(matchId, state);

  // Emit initial tick
  const initialCounts = countLiveCells(initialBoard);
  onTick(0, initialBoard, initialCounts.p1, initialCounts.p2);

  // Start simulation loop
  scheduleTick(state);
}

function scheduleTick(state: SimulationState): void {
  if (state.isPaused) return;

  state.timer = setTimeout(() => {
    runTick(state);
  }, state.intervalMs);
}

async function runTick(state: SimulationState): Promise<void> {
  if (state.isPaused) return;

  const { currentBoard, history, maxGenerations, matchId } = state;

  if (currentBoard.generation >= maxGenerations || shouldTerminateEarly(currentBoard)) {
    await finishSimulation(state);
    return;
  }

  // Step the simulation
  const nextBoard = stepGeneration(currentBoard);
  const counts = countLiveCells(nextBoard);

  state.currentBoard = nextBoard;
  state.history.push(nextBoard);
  state.cumulativeP1 += counts.p1;
  state.cumulativeP2 += counts.p2;

  // Update in-memory match
  updateMatchBoardState(matchId, nextBoard, nextBoard.generation);

  // Persist every 50 generations to avoid too many DB writes
  if (nextBoard.generation % 50 === 0) {
    await persistGameState(matchId, nextBoard, counts.p1, counts.p2);
  }

  // Emit tick
  state.onTick(nextBoard.generation, nextBoard, counts.p1, counts.p2);

  // Schedule next tick
  if (!state.isPaused) {
    scheduleTick(state);
  }
}

async function finishSimulation(state: SimulationState): Promise<void> {
  const { matchId, history } = state;

  stopSimulation(matchId);

  const scoreResult = determineWinner(history);
  const resultSignature = await resultService.signResult(
    matchId,
    scoreResult.winner,
    scoreResult.finalScoreP1,
    scoreResult.finalScoreP2
  );

  // Persist final state
  const finalBoard = history[history.length - 1]!;
  await persistGameState(matchId, finalBoard, scoreResult.finalScoreP1, scoreResult.finalScoreP2);

  // Save to database
  await finalizeMatch(
    matchId,
    scoreResult.winner,
    scoreResult.finalScoreP1,
    scoreResult.finalScoreP2,
    scoreResult.cumulativeScoreP1,
    scoreResult.cumulativeScoreP2,
    resultSignature
  );

  state.onFinish(
    scoreResult.winner,
    scoreResult.finalScoreP1,
    scoreResult.finalScoreP2,
    scoreResult.cumulativeScoreP1,
    scoreResult.cumulativeScoreP2,
    resultSignature
  );
}

async function persistGameState(
  matchId: string,
  board: BoardState,
  scoreP1: number,
  scoreP2: number
): Promise<void> {
  try {
    await query(
      `INSERT INTO game_states (id, match_id, generation, board_state, score_p1, score_p2)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (match_id, generation) DO NOTHING`,
      [uuidv4(), matchId, board.generation, JSON.stringify(board), scoreP1, scoreP2]
    );
  } catch (err) {
    console.error('Failed to persist game state:', err);
  }
}

export function stopSimulation(matchId: string): void {
  const state = activeSimulations.get(matchId);
  if (state) {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    activeSimulations.delete(matchId);
  }
}

export function pauseSimulation(matchId: string): void {
  const state = activeSimulations.get(matchId);
  if (state) {
    state.isPaused = true;
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }
}

export function resumeSimulation(matchId: string): void {
  const state = activeSimulations.get(matchId);
  if (state && state.isPaused) {
    state.isPaused = false;
    scheduleTick(state);
  }
}

export function isSimulationActive(matchId: string): boolean {
  return activeSimulations.has(matchId);
}

export async function getSimulationHistory(
  matchId: string,
  fromGeneration = 0,
  toGeneration?: number
): Promise<Array<{ generation: number; scoreP1: number; scoreP2: number }>> {
  const toClause = toGeneration !== undefined ? `AND generation <= $3` : '';
  const params: unknown[] = toGeneration !== undefined
    ? [matchId, fromGeneration, toGeneration]
    : [matchId, fromGeneration];

  return query(
    `SELECT generation, score_p1, score_p2 FROM game_states
     WHERE match_id = $1 AND generation >= $2 ${toClause}
     ORDER BY generation ASC`,
    params
  );
}
