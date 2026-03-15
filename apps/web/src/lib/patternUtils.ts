import { Pattern, PatternId } from '@conwoy/shared';
import { PATTERNS } from '@conwoy/shared';

/**
 * Transform pattern cells by rotation and optional horizontal mirror.
 */
export function transformPattern(
  cells: [number, number][],
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean,
  originalWidth: number,
  originalHeight: number
): [number, number][] {
  let transformed = cells.map(([r, c]) => [r, c] as [number, number]);

  // Apply mirror (horizontal flip)
  if (mirror) {
    transformed = transformed.map(([r, c]) => [r, originalWidth - 1 - c]);
  }

  // Apply rotation
  if (rotation === 90) {
    transformed = transformed.map(([r, c]) => [c, originalHeight - 1 - r]);
  } else if (rotation === 180) {
    transformed = transformed.map(([r, c]) => [originalHeight - 1 - r, originalWidth - 1 - c]);
  } else if (rotation === 270) {
    transformed = transformed.map(([r, c]) => [originalWidth - 1 - c, r]);
  }

  // Normalize to top-left (0,0)
  const minRow = Math.min(...transformed.map(([r]) => r));
  const minCol = Math.min(...transformed.map(([, c]) => c));

  return transformed.map(([r, c]) => [r - minRow, c - minCol]);
}

/**
 * Get the absolute cell positions for placing a pattern at a given board position.
 */
export function getAbsoluteCells(
  patternId: PatternId,
  row: number,
  col: number,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean
): [number, number][] {
  const pattern = PATTERNS[patternId];
  if (!pattern) return [];

  const transformed = transformPattern(pattern.cells, rotation, mirror, pattern.width, pattern.height);
  return transformed.map(([dr, dc]) => [row + dr, col + dc]);
}

/**
 * Get the bounding box of a transformed pattern.
 */
export function getTransformedBounds(
  patternId: PatternId,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean
): { width: number; height: number } {
  const pattern = PATTERNS[patternId];
  if (!pattern) return { width: 0, height: 0 };

  const cells = transformPattern(pattern.cells, rotation, mirror, pattern.width, pattern.height);

  if (cells.length === 0) return { width: 0, height: 0 };

  const maxRow = Math.max(...cells.map(([r]) => r));
  const maxCol = Math.max(...cells.map(([, c]) => c));

  return { width: maxCol + 1, height: maxRow + 1 };
}

/**
 * Check if placing a pattern would go out of bounds.
 */
export function isPlacementInBounds(
  cells: [number, number][],
  boardWidth: number,
  boardHeight: number
): boolean {
  return cells.every(
    ([r, c]) => r >= 0 && r < boardHeight && c >= 0 && c < boardWidth
  );
}

/**
 * Check if any cell in the list overlaps with a live cell on the board.
 */
export function hasOverlap(
  cells: [number, number][],
  boardCells: Array<Array<{ alive: boolean }>>
): boolean {
  return cells.some(([r, c]) => boardCells[r]?.[c]?.alive === true);
}

/**
 * Get the center offset for a pattern to place it centered at a click position.
 */
export function getCenterOffset(
  patternId: PatternId,
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean
): { rowOffset: number; colOffset: number } {
  const bounds = getTransformedBounds(patternId, rotation, mirror);
  return {
    rowOffset: Math.floor(bounds.height / 2),
    colOffset: Math.floor(bounds.width / 2),
  };
}
