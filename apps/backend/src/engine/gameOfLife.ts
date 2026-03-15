import { BoardState, Cell, CellOwner } from '@conwoy/shared';

/**
 * Creates an empty board with all cells dead and unowned.
 */
export function createEmptyBoard(width: number, height: number): BoardState {
  const cells: Cell[][] = [];
  for (let row = 0; row < height; row++) {
    cells.push([]);
    for (let col = 0; col < width; col++) {
      cells[row]!.push({ alive: false, owner: 0 });
    }
  }
  return { width, height, cells, generation: 0 };
}

/**
 * Count live neighbors around a cell (8-directional, bounded non-wrapping).
 */
function countNeighbors(
  cells: Cell[][],
  row: number,
  col: number,
  height: number,
  width: number
): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
        if (cells[nr]![nc]!.alive) {
          count++;
        }
      }
    }
  }
  return count;
}

/**
 * Count neighbor owners for ownership attribution.
 * Returns [count for player1, count for player2].
 */
function countNeighborOwners(
  cells: Cell[][],
  row: number,
  col: number,
  height: number,
  width: number
): [number, number] {
  let p1 = 0;
  let p2 = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
        const cell = cells[nr]![nc]!;
        if (cell.alive) {
          if (cell.owner === 1) p1++;
          else if (cell.owner === 2) p2++;
        }
      }
    }
  }
  return [p1, p2];
}

/**
 * Determine the owner of a newly born cell based on neighbor majority.
 * Tie-break: prefer player1.
 */
function determineNewOwner(
  cells: Cell[][],
  row: number,
  col: number,
  height: number,
  width: number
): CellOwner {
  const [p1, p2] = countNeighborOwners(cells, row, col, height, width);
  if (p1 >= p2) return 1;
  return 2;
}

/**
 * Advance the board by one generation using Conway's Game of Life rules.
 *
 * Rules:
 * - Live cell with < 2 live neighbors dies (underpopulation)
 * - Live cell with 2 or 3 live neighbors survives
 * - Live cell with > 3 live neighbors dies (overpopulation)
 * - Dead cell with exactly 3 live neighbors becomes alive (reproduction)
 *
 * Board is bounded (non-wrapping): cells outside boundary are treated as dead.
 * Ownership: surviving cells keep their owner; newly born cells get owner by neighbor majority (tie -> player1).
 */
export function stepGeneration(board: BoardState): BoardState {
  const { width, height, cells, generation } = board;
  const newCells: Cell[][] = [];

  for (let row = 0; row < height; row++) {
    newCells.push([]);
    for (let col = 0; col < width; col++) {
      const cell = cells[row]![col]!;
      const neighborCount = countNeighbors(cells, row, col, height, width);

      let newAlive: boolean;
      let newOwner: CellOwner;

      if (cell.alive) {
        // Survival: 2 or 3 neighbors
        newAlive = neighborCount === 2 || neighborCount === 3;
        newOwner = newAlive ? cell.owner : 0;
      } else {
        // Reproduction: exactly 3 neighbors
        newAlive = neighborCount === 3;
        newOwner = newAlive
          ? determineNewOwner(cells, row, col, height, width)
          : 0;
      }

      newCells[row]!.push({ alive: newAlive, owner: newOwner });
    }
  }

  return {
    width,
    height,
    cells: newCells,
    generation: generation + 1,
  };
}

/**
 * Run the simulation for a given number of generations.
 * Returns an array of all board states including the initial state.
 */
export function runSimulation(
  board: BoardState,
  generations: number
): BoardState[] {
  const history: BoardState[] = [board];
  let current = board;

  for (let i = 0; i < generations; i++) {
    current = stepGeneration(current);
    history.push(current);

    // Early termination: if board is completely empty, no more changes will occur
    if (isEmptyBoard(current)) {
      break;
    }
  }

  return history;
}

/**
 * Check if a board has no live cells.
 */
export function isEmptyBoard(board: BoardState): boolean {
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      if (board.cells[row]![col]!.alive) return false;
    }
  }
  return true;
}

/**
 * Count live cells per player.
 */
export function countLiveCells(board: BoardState): { p1: number; p2: number; total: number } {
  let p1 = 0;
  let p2 = 0;
  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const cell = board.cells[row]![col]!;
      if (cell.alive) {
        if (cell.owner === 1) p1++;
        else if (cell.owner === 2) p2++;
      }
    }
  }
  return { p1, p2, total: p1 + p2 };
}

/**
 * Set cells on a board for a specific player. Used during setup phase.
 * Returns a new board with the cells set.
 */
export function setCells(
  board: BoardState,
  cellPositions: [number, number][],
  owner: CellOwner
): BoardState {
  const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));

  for (const [row, col] of cellPositions) {
    if (row >= 0 && row < board.height && col >= 0 && col < board.width) {
      newCells[row]![col] = { alive: true, owner };
    }
  }

  return { ...board, cells: newCells };
}
