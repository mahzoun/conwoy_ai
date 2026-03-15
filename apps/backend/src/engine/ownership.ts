import { BoardState, CellOwner, PlayerSlot } from '@conwoy/shared';

/**
 * Calculates live cell ownership statistics for a board state.
 */
export function calculateOwnership(board: BoardState): {
  player1Cells: number;
  player2Cells: number;
  totalLiveCells: number;
  ownershipPercentage: { p1: number; p2: number };
} {
  let player1Cells = 0;
  let player2Cells = 0;

  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const cell = board.cells[row]![col]!;
      if (cell.alive) {
        if (cell.owner === 1) player1Cells++;
        else if (cell.owner === 2) player2Cells++;
      }
    }
  }

  const totalLiveCells = player1Cells + player2Cells;
  const ownershipPercentage = {
    p1: totalLiveCells > 0 ? (player1Cells / totalLiveCells) * 100 : 0,
    p2: totalLiveCells > 0 ? (player2Cells / totalLiveCells) * 100 : 0,
  };

  return { player1Cells, player2Cells, totalLiveCells, ownershipPercentage };
}

/**
 * Compute cumulative cell counts across a simulation history.
 */
export function computeCumulativeScores(
  history: BoardState[]
): { cumulativeP1: number; cumulativeP2: number } {
  let cumulativeP1 = 0;
  let cumulativeP2 = 0;

  for (const board of history) {
    const { player1Cells, player2Cells } = calculateOwnership(board);
    cumulativeP1 += player1Cells;
    cumulativeP2 += player2Cells;
  }

  return { cumulativeP1, cumulativeP2 };
}

/**
 * Find cells that changed ownership between two board states.
 */
export function findOwnershipChanges(
  prev: BoardState,
  next: BoardState
): Array<{ row: number; col: number; prevOwner: CellOwner; nextOwner: CellOwner }> {
  const changes: Array<{ row: number; col: number; prevOwner: CellOwner; nextOwner: CellOwner }> = [];

  for (let row = 0; row < next.height; row++) {
    for (let col = 0; col < next.width; col++) {
      const prevCell = prev.cells[row]?.[col];
      const nextCell = next.cells[row]?.[col];
      if (prevCell && nextCell && prevCell.owner !== nextCell.owner) {
        changes.push({
          row,
          col,
          prevOwner: prevCell.owner,
          nextOwner: nextCell.owner,
        });
      }
    }
  }

  return changes;
}

/**
 * Get the "frontier" cells — live cells adjacent to enemy cells.
 */
export function getFrontierCells(
  board: BoardState,
  player: PlayerSlot
): [number, number][] {
  const frontier: [number, number][] = [];
  const enemyOwner: CellOwner = player === 1 ? 2 : 1;

  for (let row = 0; row < board.height; row++) {
    for (let col = 0; col < board.width; col++) {
      const cell = board.cells[row]![col]!;
      if (cell.alive && cell.owner === player) {
        // Check 8 neighbors for enemy cells
        let hasEnemyNeighbor = false;
        for (let dr = -1; dr <= 1 && !hasEnemyNeighbor; dr++) {
          for (let dc = -1; dc <= 1 && !hasEnemyNeighbor; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = row + dr;
            const nc = col + dc;
            if (nr >= 0 && nr < board.height && nc >= 0 && nc < board.width) {
              const neighbor = board.cells[nr]![nc]!;
              if (neighbor.alive && neighbor.owner === enemyOwner) {
                hasEnemyNeighbor = true;
              }
            }
          }
        }
        if (hasEnemyNeighbor) {
          frontier.push([row, col]);
        }
      }
    }
  }

  return frontier;
}
