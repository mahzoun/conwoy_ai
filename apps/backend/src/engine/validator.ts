import {
  BoardState,
  Pattern,
  PlayerSlot,
  CellOwner,
  PatternId,
  AgentId,
} from '@conwoy/shared';
import {
  PLAYER1_ZONE_END_ROW,
  PLAYER2_ZONE_START_ROW,
  ERROR_CODES,
  MAX_INITIAL_CELLS,
} from '@conwoy/shared';
import { AGENTS } from '@conwoy/shared';
import { PATTERNS } from '@conwoy/shared';
import { transformPattern } from './patternTransform';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Validate that a player can place a pattern at a given position.
 */
export function validatePlacement(
  board: BoardState,
  pattern: Pattern,
  row: number,
  col: number,
  player: PlayerSlot,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean,
  existingCellCount: number
): ValidationResult {
  // Transform pattern based on rotation/mirror
  const transformedCells = transformPattern(pattern.cells, rotation, mirror, pattern.width, pattern.height);

  // Check each cell position
  for (const [dr, dc] of transformedCells) {
    const targetRow = row + dr;
    const targetCol = col + dc;

    // Check board boundaries
    if (
      targetRow < 0 ||
      targetRow >= board.height ||
      targetCol < 0 ||
      targetCol >= board.width
    ) {
      return {
        valid: false,
        error: `Pattern extends outside board boundaries at [${targetRow}, ${targetCol}]`,
        code: ERROR_CODES.PLACEMENT_OUT_OF_BOUNDS,
      };
    }

    // Check zone restrictions
    if (player === 1 && targetRow > PLAYER1_ZONE_END_ROW) {
      return {
        valid: false,
        error: `Player 1 can only place patterns in rows 0-${PLAYER1_ZONE_END_ROW}`,
        code: ERROR_CODES.PLACEMENT_OUTSIDE_ZONE,
      };
    }

    if (player === 2 && targetRow < PLAYER2_ZONE_START_ROW) {
      return {
        valid: false,
        error: `Player 2 can only place patterns in rows ${PLAYER2_ZONE_START_ROW}-${board.height - 1}`,
        code: ERROR_CODES.PLACEMENT_OUTSIDE_ZONE,
      };
    }

    // Check for overlap with existing cells
    const cell = board.cells[targetRow]?.[targetCol];
    if (cell && cell.alive) {
      return {
        valid: false,
        error: `Pattern overlaps with existing cell at [${targetRow}, ${targetCol}]`,
        code: ERROR_CODES.PLACEMENT_OVERLAPS,
      };
    }
  }

  // Check cell count limit
  if (existingCellCount + transformedCells.length > MAX_INITIAL_CELLS) {
    return {
      valid: false,
      error: `Placing this pattern would exceed the cell limit of ${MAX_INITIAL_CELLS}`,
      code: ERROR_CODES.CELL_LIMIT_EXCEEDED,
    };
  }

  return { valid: true };
}

/**
 * Validate that an agent is allowed to use a pattern.
 */
export function validateAgentPattern(
  agentId: AgentId,
  patternId: PatternId
): ValidationResult {
  const agent = AGENTS[agentId];
  if (!agent) {
    return {
      valid: false,
      error: `Unknown agent: ${agentId}`,
      code: ERROR_CODES.INVALID_AGENT,
    };
  }

  if (!agent.allowedPatterns.includes(patternId)) {
    return {
      valid: false,
      error: `Agent ${agent.name} cannot use pattern ${patternId}. Allowed: ${agent.allowedPatterns.join(', ')}`,
      code: ERROR_CODES.PATTERN_NOT_ALLOWED,
    };
  }

  return { valid: true };
}

/**
 * Validate that an agent is allowed to rotate/mirror.
 */
export function validateAgentTransform(
  agentId: AgentId,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean
): ValidationResult {
  const agent = AGENTS[agentId];
  if (!agent) {
    return {
      valid: false,
      error: `Unknown agent: ${agentId}`,
      code: ERROR_CODES.INVALID_AGENT,
    };
  }

  if (rotation !== 0 && !agent.canRotate) {
    return {
      valid: false,
      error: `Agent ${agent.name} cannot rotate patterns`,
      code: ERROR_CODES.INVALID_PLACEMENT,
    };
  }

  if (mirror && !agent.canMirror) {
    return {
      valid: false,
      error: `Agent ${agent.name} cannot mirror patterns`,
      code: ERROR_CODES.INVALID_PLACEMENT,
    };
  }

  return { valid: true };
}
