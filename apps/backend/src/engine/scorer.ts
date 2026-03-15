import { BoardState, PlayerSlot, Match } from '@conwoy/shared';
import { countLiveCells } from './gameOfLife';
import { computeCumulativeScores } from './ownership';

export type WinnerResult = PlayerSlot | 'draw';

export interface ScoreResult {
  winner: WinnerResult;
  finalScoreP1: number;
  finalScoreP2: number;
  cumulativeScoreP1: number;
  cumulativeScoreP2: number;
  reason: string;
}

/**
 * Determine the winner from a simulation history.
 * Primary: most live cells at the final generation.
 * Tiebreaker: cumulative live cells across all generations.
 * If still tied: draw.
 */
export function determineWinner(history: BoardState[]): ScoreResult {
  if (history.length === 0) {
    return {
      winner: 'draw',
      finalScoreP1: 0,
      finalScoreP2: 0,
      cumulativeScoreP1: 0,
      cumulativeScoreP2: 0,
      reason: 'No simulation history',
    };
  }

  const finalBoard = history[history.length - 1]!;
  const finalCounts = countLiveCells(finalBoard);
  const { cumulativeP1, cumulativeP2 } = computeCumulativeScores(history);

  let winner: WinnerResult;
  let reason: string;

  if (finalCounts.p1 > finalCounts.p2) {
    winner = 1;
    reason = `Player 1 won with ${finalCounts.p1} live cells vs ${finalCounts.p2}`;
  } else if (finalCounts.p2 > finalCounts.p1) {
    winner = 2;
    reason = `Player 2 won with ${finalCounts.p2} live cells vs ${finalCounts.p1}`;
  } else {
    // Tiebreaker: cumulative score
    if (cumulativeP1 > cumulativeP2) {
      winner = 1;
      reason = `Tie on final count, Player 1 wins on cumulative score (${cumulativeP1} vs ${cumulativeP2})`;
    } else if (cumulativeP2 > cumulativeP1) {
      winner = 2;
      reason = `Tie on final count, Player 2 wins on cumulative score (${cumulativeP2} vs ${cumulativeP1})`;
    } else {
      winner = 'draw';
      reason = `Complete tie: final score ${finalCounts.p1} each, cumulative ${cumulativeP1} each`;
    }
  }

  return {
    winner,
    finalScoreP1: finalCounts.p1,
    finalScoreP2: finalCounts.p2,
    cumulativeScoreP1: cumulativeP1,
    cumulativeScoreP2: cumulativeP2,
    reason,
  };
}

/**
 * Check if simulation should end early (both sides have 0 live cells).
 */
export function shouldTerminateEarly(board: BoardState): boolean {
  const counts = countLiveCells(board);
  return counts.total === 0;
}

/**
 * Compute the live score at a specific generation.
 */
export function computeGenerationScore(board: BoardState): {
  scoreP1: number;
  scoreP2: number;
} {
  const counts = countLiveCells(board);
  return { scoreP1: counts.p1, scoreP2: counts.p2 };
}
