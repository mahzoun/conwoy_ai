import { BoardState, CellOwner } from '@conwoy/shared';
import {
  PLAYER1_COLOR,
  PLAYER2_COLOR,
  DEAD_CELL_COLOR,
  GRID_COLOR,
  ZONE1_OVERLAY,
  ZONE2_OVERLAY,
  HOVER_COLOR,
  INVALID_COLOR,
} from './constants';
import { BOARD_HEIGHT, BOARD_WIDTH, PLAYER1_ZONE_END_ROW, PLAYER2_ZONE_START_ROW } from '@conwoy/shared';

export interface RenderOptions {
  boardState: BoardState | null;
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showZones: boolean;
  hoverCells?: [number, number][];
  isHoverValid?: boolean;
  playerSlot?: 1 | 2;
}

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions
): void {
  const {
    boardState,
    width,
    height,
    zoom,
    panX,
    panY,
    showGrid,
    showZones,
    hoverCells,
    isHoverValid,
    playerSlot,
  } = options;

  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, width, height);

  if (!boardState) return;

  const cellSize = 12 * zoom;
  const boardPixelWidth = boardState.width * cellSize;
  const boardPixelHeight = boardState.height * cellSize;

  // Save transform
  ctx.save();
  ctx.translate(panX, panY);

  // Draw zone overlays
  if (showZones) {
    // Player 1 zone (top half)
    ctx.fillStyle = ZONE1_OVERLAY;
    ctx.fillRect(0, 0, boardPixelWidth, (PLAYER1_ZONE_END_ROW + 1) * cellSize);

    // Player 2 zone (bottom half)
    ctx.fillStyle = ZONE2_OVERLAY;
    ctx.fillRect(
      0,
      PLAYER2_ZONE_START_ROW * cellSize,
      boardPixelWidth,
      boardPixelHeight - PLAYER2_ZONE_START_ROW * cellSize
    );

    // Zone divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    const divY = PLAYER2_ZONE_START_ROW * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, divY);
    ctx.lineTo(boardPixelWidth, divY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw grid lines (only when zoomed in enough)
  if (showGrid && cellSize >= 8) {
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let col = 0; col <= boardState.width; col++) {
      const x = col * cellSize;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, boardPixelHeight);
    }
    for (let row = 0; row <= boardState.height; row++) {
      const y = row * cellSize;
      ctx.moveTo(0, y);
      ctx.lineTo(boardPixelWidth, y);
    }
    ctx.stroke();
  }

  // Draw cells
  const padding = cellSize > 4 ? Math.max(0.5, cellSize * 0.05) : 0;

  for (let row = 0; row < boardState.height; row++) {
    for (let col = 0; col < boardState.width; col++) {
      const cell = boardState.cells[row]?.[col];
      if (!cell || !cell.alive) continue;

      const x = col * cellSize + padding;
      const y = row * cellSize + padding;
      const size = cellSize - padding * 2;

      ctx.fillStyle = cell.owner === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;

      if (cellSize > 6) {
        // Rounded cells when large enough
        const radius = Math.max(1, size * 0.2);
        ctx.beginPath();
        ctx.roundRect(x, y, size, size, radius);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  // Draw hover cells
  if (hoverCells && hoverCells.length > 0) {
    ctx.fillStyle = isHoverValid ? HOVER_COLOR : INVALID_COLOR;

    for (const [row, col] of hoverCells) {
      if (row >= 0 && row < boardState.height && col >= 0 && col < boardState.width) {
        const x = col * cellSize + padding;
        const y = row * cellSize + padding;
        const size = cellSize - padding * 2;

        if (cellSize > 6) {
          const radius = Math.max(1, size * 0.2);
          ctx.beginPath();
          ctx.roundRect(x, y, size, size, radius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  // Draw board border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, boardPixelWidth, boardPixelHeight);

  ctx.restore();
}

/**
 * Convert a canvas pixel position to a board cell position.
 */
export function pixelToCell(
  pixelX: number,
  pixelY: number,
  panX: number,
  panY: number,
  zoom: number
): { row: number; col: number } {
  const cellSize = 12 * zoom;
  const boardX = pixelX - panX;
  const boardY = pixelY - panY;

  return {
    row: Math.floor(boardY / cellSize),
    col: Math.floor(boardX / cellSize),
  };
}

/**
 * Compute initial pan to center the board in the canvas.
 */
export function computeInitialPan(
  canvasWidth: number,
  canvasHeight: number,
  boardWidth: number,
  boardHeight: number,
  zoom: number
): { panX: number; panY: number } {
  const cellSize = 12 * zoom;
  const boardPixelWidth = boardWidth * cellSize;
  const boardPixelHeight = boardHeight * cellSize;

  return {
    panX: (canvasWidth - boardPixelWidth) / 2,
    panY: (canvasHeight - boardPixelHeight) / 2,
  };
}
