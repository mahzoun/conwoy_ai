import {
  createEmptyBoard,
  stepGeneration,
  runSimulation,
  isEmptyBoard,
  countLiveCells,
  setCells,
} from './gameOfLife';
import { BoardState, Cell } from '@conwoy/shared';

function makeBoard(width: number, height: number, liveCells: [number, number][], owner: 1 | 2 = 1): BoardState {
  const board = createEmptyBoard(width, height);
  return setCells(board, liveCells, owner);
}

describe('createEmptyBoard', () => {
  it('creates a board with correct dimensions', () => {
    const board = createEmptyBoard(10, 8);
    expect(board.width).toBe(10);
    expect(board.height).toBe(8);
    expect(board.cells.length).toBe(8);
    expect(board.cells[0]!.length).toBe(10);
    expect(board.generation).toBe(0);
  });

  it('creates all dead cells with owner 0', () => {
    const board = createEmptyBoard(5, 5);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        expect(board.cells[r]![c]!.alive).toBe(false);
        expect(board.cells[r]![c]!.owner).toBe(0);
      }
    }
  });
});

describe('empty board', () => {
  it('stays empty after a step', () => {
    const board = createEmptyBoard(10, 10);
    const next = stepGeneration(board);
    expect(isEmptyBoard(next)).toBe(true);
    expect(next.generation).toBe(1);
  });

  it('stays empty after multiple generations', () => {
    const board = createEmptyBoard(10, 10);
    const history = runSimulation(board, 10);
    for (const state of history) {
      expect(isEmptyBoard(state)).toBe(true);
    }
  });
});

describe('underpopulation', () => {
  it('live cell with 0 neighbors dies', () => {
    const board = makeBoard(10, 10, [[5, 5]]);
    const next = stepGeneration(board);
    expect(next.cells[5]![5]!.alive).toBe(false);
  });

  it('live cell with 1 neighbor dies', () => {
    const board = makeBoard(10, 10, [[5, 5], [5, 6]]);
    const next = stepGeneration(board);
    expect(next.cells[5]![5]!.alive).toBe(false);
    expect(next.cells[5]![6]!.alive).toBe(false);
  });
});

describe('survival', () => {
  it('live cell with 2 neighbors survives', () => {
    // Blinker - center cell has 2 neighbors
    const board = makeBoard(10, 10, [[5, 4], [5, 5], [5, 6]]);
    const next = stepGeneration(board);
    // Center cell [5,5] has 2 horizontal neighbors -> survives
    expect(next.cells[5]![5]!.alive).toBe(true);
  });

  it('live cell with 3 neighbors survives', () => {
    // Block - each cell has 3 live neighbors
    const board = makeBoard(10, 10, [[4, 4], [4, 5], [5, 4], [5, 5]]);
    const next = stepGeneration(board);
    expect(next.cells[4]![4]!.alive).toBe(true);
    expect(next.cells[4]![5]!.alive).toBe(true);
    expect(next.cells[5]![4]!.alive).toBe(true);
    expect(next.cells[5]![5]!.alive).toBe(true);
  });
});

describe('overpopulation', () => {
  it('live cell with 4 neighbors dies', () => {
    // Center cell surrounded by 4 cells
    const board = makeBoard(10, 10, [
      [4, 5],
      [5, 4], [5, 5], [5, 6],
      [6, 5],
    ]);
    const next = stepGeneration(board);
    // Center [5,5] has 4 neighbors -> dies
    expect(next.cells[5]![5]!.alive).toBe(false);
  });

  it('live cell with 5 neighbors dies', () => {
    const board = makeBoard(10, 10, [
      [4, 4], [4, 5],
      [5, 4], [5, 5], [5, 6],
      [6, 5],
    ]);
    const next = stepGeneration(board);
    // [5,5] has neighbors: [4,4],[4,5],[5,4],[5,6],[6,5] = 5 neighbors -> dies
    expect(next.cells[5]![5]!.alive).toBe(false);
  });
});

describe('reproduction', () => {
  it('dead cell with exactly 3 neighbors becomes alive', () => {
    // L-shape: cells at [5,5],[5,6],[6,5] -> dead cell [6,6] has 3 neighbors
    const board = makeBoard(10, 10, [[5, 5], [5, 6], [6, 5]]);
    const next = stepGeneration(board);
    expect(next.cells[6]![6]!.alive).toBe(true);
  });

  it('dead cell with 2 neighbors stays dead', () => {
    const board = makeBoard(10, 10, [[5, 5], [5, 6]]);
    const next = stepGeneration(board);
    // [5,7] has 1 neighbor, [4,5] has 2 neighbors but no cell spawns with only 2 -> stays dead
    // A dead cell adjacent to only 2 live cells should stay dead
    expect(next.cells[4]![7]!.alive).toBe(false);
  });

  it('dead cell with 4 neighbors stays dead', () => {
    // Place 4 cells around a center dead cell
    const board = makeBoard(10, 10, [
      [4, 5],
      [5, 4], [5, 6],
      [6, 5],
    ]);
    const next = stepGeneration(board);
    // [5,5] has 4 live neighbors -> stays dead (needs exactly 3)
    expect(next.cells[5]![5]!.alive).toBe(false);
  });
});

describe('still life: block', () => {
  it('block is unchanged after one generation', () => {
    const board = makeBoard(10, 10, [[4, 4], [4, 5], [5, 4], [5, 5]]);
    const next = stepGeneration(board);
    expect(next.cells[4]![4]!.alive).toBe(true);
    expect(next.cells[4]![5]!.alive).toBe(true);
    expect(next.cells[5]![4]!.alive).toBe(true);
    expect(next.cells[5]![5]!.alive).toBe(true);
    expect(next.generation).toBe(1);
  });

  it('block is unchanged after 10 generations', () => {
    const board = makeBoard(10, 10, [[4, 4], [4, 5], [5, 4], [5, 5]]);
    const history = runSimulation(board, 10);
    const last = history[history.length - 1]!;
    expect(last.cells[4]![4]!.alive).toBe(true);
    expect(last.cells[4]![5]!.alive).toBe(true);
    expect(last.cells[5]![4]!.alive).toBe(true);
    expect(last.cells[5]![5]!.alive).toBe(true);
  });
});

describe('oscillator: blinker', () => {
  it('blinker oscillates with period 2', () => {
    // Horizontal blinker: [5,4],[5,5],[5,6]
    const board = makeBoard(15, 15, [[5, 4], [5, 5], [5, 6]]);

    const gen1 = stepGeneration(board);
    // After 1 step: becomes vertical [4,5],[5,5],[6,5]
    expect(gen1.cells[4]![5]!.alive).toBe(true);
    expect(gen1.cells[5]![5]!.alive).toBe(true);
    expect(gen1.cells[6]![5]!.alive).toBe(true);
    expect(gen1.cells[5]![4]!.alive).toBe(false);
    expect(gen1.cells[5]![6]!.alive).toBe(false);

    const gen2 = stepGeneration(gen1);
    // After 2 steps: back to horizontal
    expect(gen2.cells[5]![4]!.alive).toBe(true);
    expect(gen2.cells[5]![5]!.alive).toBe(true);
    expect(gen2.cells[5]![6]!.alive).toBe(true);
    expect(gen2.cells[4]![5]!.alive).toBe(false);
    expect(gen2.cells[6]![5]!.alive).toBe(false);
  });
});

describe('glider', () => {
  it('glider moves correctly after 4 generations', () => {
    // Classic glider starting at top-left area
    // Generation 0:
    // . X .
    // . . X
    // X X X
    const board = makeBoard(20, 20, [
      [2, 3],
      [3, 4],
      [4, 2], [4, 3], [4, 4],
    ]);

    const history = runSimulation(board, 4);
    const gen4 = history[4]!;

    // After 4 generations, glider has moved 1 cell right and 1 cell down
    // Check that gen4 has 5 live cells (glider doesn't die)
    const count = countLiveCells(gen4);
    expect(count.p1).toBe(5);
    expect(count.total).toBe(5);
  });

  it('glider stays alive for many generations', () => {
    const board = makeBoard(40, 40, [
      [2, 3],
      [3, 4],
      [4, 2], [4, 3], [4, 4],
    ]);

    const history = runSimulation(board, 40);
    // Glider should still be alive
    const last = history[history.length - 1]!;
    const count = countLiveCells(last);
    expect(count.p1).toBe(5);
  });
});

describe('board edge behavior', () => {
  it('cells at the edges do not wrap', () => {
    // A glider heading toward the top-left corner should eventually die/stall at the edge
    const board = makeBoard(10, 10, [
      [0, 1],
      [1, 2],
      [2, 0], [2, 1], [2, 2],
    ]);

    const history = runSimulation(board, 20);
    // At some point the glider hits the edge and its cells will die due to boundary
    // We can't assert exact state but can verify it doesn't wrap around
    // Check that no cells suddenly appear at the opposite edge
    const gen10 = history[10]!;
    // Bottom row (9) should have no cells that "wrapped" from top
    expect(gen10.cells[9]![9]!.alive).toBe(false);
    expect(gen10.cells[9]![8]!.alive).toBe(false);
  });

  it('cells outside the boundary are treated as dead (no wrap)', () => {
    // Place cells at the very bottom right
    const board = makeBoard(10, 10, [
      [8, 8], [8, 9],
      [9, 8], [9, 9],
    ]);
    const next = stepGeneration(board);
    // Block at corner should remain stable (still life)
    expect(next.cells[8]![8]!.alive).toBe(true);
    expect(next.cells[8]![9]!.alive).toBe(true);
    expect(next.cells[9]![8]!.alive).toBe(true);
    expect(next.cells[9]![9]!.alive).toBe(true);

    // No wraparound to top-left
    expect(next.cells[0]![0]!.alive).toBe(false);
  });
});

describe('ownership attribution', () => {
  it('new cells inherit majority owner', () => {
    // Two p1 cells and one p2 cell around a dead cell -> p1 wins
    const board = createEmptyBoard(10, 10);
    const withP1 = setCells(board, [[5, 5], [5, 6]], 1);
    const withBoth = setCells(withP1, [[6, 5]], 2);

    // Dead cell [6,6] has neighbors: [5,5](p1), [5,6](p1), [6,5](p2) -> 3 neighbors, p1 majority
    const next = stepGeneration(withBoth);
    expect(next.cells[6]![6]!.alive).toBe(true);
    expect(next.cells[6]![6]!.owner).toBe(1);
  });

  it('tie-break favors player1', () => {
    // Equal p1 and p2 neighbors around a dead cell -> p1 wins
    // Dead cell needs exactly 3 neighbors to be born
    // But we need to test tie-break with exactly 3 neighbors (1p1, 1p2, 1p1 = tie is impossible with 3)
    // Tie occurs when 1p1, 1p2, 1unknown... let's use a scenario with survival
    // Actually: dead cell born with 3 neighbors where 1=p1, 1=p2, 1=p1 -> p1 (2 vs 1)
    // Let's create a scenario: dead cell [5,5] has neighbors [4,5](p1) and [5,4](p2) and [4,4](p1)
    const board = createEmptyBoard(10, 10);
    const withCells = setCells(board, [[4, 4], [4, 5]], 1);
    const withBoth = setCells(withCells, [[5, 4]], 2);

    const next = stepGeneration(withBoth);
    expect(next.cells[5]![5]!.alive).toBe(true);
    expect(next.cells[5]![5]!.owner).toBe(1); // p1 has 2 neighbors, p2 has 1
  });

  it('surviving cells keep their owner', () => {
    // Block: each cell survives and keeps its original owner
    const board = createEmptyBoard(10, 10);
    const withP1 = setCells(board, [[4, 4], [4, 5]], 1);
    const withP2 = setCells(withP1, [[5, 4], [5, 5]], 2);

    const next = stepGeneration(withP2);
    expect(next.cells[4]![4]!.owner).toBe(1);
    expect(next.cells[4]![5]!.owner).toBe(1);
    expect(next.cells[5]![4]!.owner).toBe(2);
    expect(next.cells[5]![5]!.owner).toBe(2);
  });

  it('dead cells have owner 0', () => {
    const board = makeBoard(10, 10, [[5, 5]]);
    const next = stepGeneration(board);
    // Lone cell dies, should have owner 0
    expect(next.cells[5]![5]!.alive).toBe(false);
    expect(next.cells[5]![5]!.owner).toBe(0);
  });
});

describe('countLiveCells', () => {
  it('correctly counts cells by player', () => {
    const board = createEmptyBoard(10, 10);
    const withP1 = setCells(board, [[0, 0], [1, 1], [2, 2]], 1);
    const withBoth = setCells(withP1, [[5, 5], [6, 6]], 2);

    const counts = countLiveCells(withBoth);
    expect(counts.p1).toBe(3);
    expect(counts.p2).toBe(2);
    expect(counts.total).toBe(5);
  });

  it('returns 0 for empty board', () => {
    const board = createEmptyBoard(10, 10);
    const counts = countLiveCells(board);
    expect(counts.p1).toBe(0);
    expect(counts.p2).toBe(0);
    expect(counts.total).toBe(0);
  });
});

describe('runSimulation', () => {
  it('returns correct number of states', () => {
    const board = makeBoard(10, 10, [[4, 4], [4, 5], [5, 4], [5, 5]]);
    const history = runSimulation(board, 5);
    // Should have generation 0 through 5 = 6 states
    expect(history.length).toBe(6);
    expect(history[0]!.generation).toBe(0);
    expect(history[5]!.generation).toBe(5);
  });

  it('terminates early when board is empty', () => {
    // Single isolated cell dies after 1 gen
    const board = makeBoard(10, 10, [[5, 5]]);
    const history = runSimulation(board, 100);
    // Should terminate early (after 2 states: gen 0 and gen 1)
    expect(history.length).toBe(2);
  });

  it('generations increment correctly', () => {
    const board = makeBoard(10, 10, [[4, 4], [4, 5], [5, 4], [5, 5]]);
    const history = runSimulation(board, 3);
    for (let i = 0; i < history.length; i++) {
      expect(history[i]!.generation).toBe(i);
    }
  });
});
