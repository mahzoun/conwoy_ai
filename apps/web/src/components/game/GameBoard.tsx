'use client';

import { useEffect, useRef, useCallback } from 'react';
import { BoardState, PatternId, PlayerSlot } from '@conwoy/shared';
import { renderBoard, computeInitialPan } from '../../lib/boardRenderer';
import { useGameBoard } from '../../hooks/useGameBoard';
import { cn } from '../../lib/utils';

interface GameBoardProps {
  boardState: BoardState | null;
  boardWidth: number;
  boardHeight: number;
  selectedPatternId: PatternId | null;
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
  playerSlot: PlayerSlot | null;
  isPlacementMode: boolean;
  showZones?: boolean;
  onPlace?: (row: number, col: number) => void;
  className?: string;
}

export function GameBoard({
  boardState,
  boardWidth,
  boardHeight,
  selectedPatternId,
  rotation,
  mirror,
  playerSlot,
  isPlacementMode,
  showZones = true,
  onPlace,
  className,
}: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    zoom,
    panX,
    panY,
    hoverCells,
    isHoverValid,
    isPanning,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleClick,
    handleWheel,
    resetView,
    setPan,
    setZoom,
  } = useGameBoard({
    boardWidth,
    boardHeight,
    selectedPatternId,
    rotation,
    mirror,
    playerSlot,
    isPlacementMode,
    onPlace,
    canvasRef,
  });

  // Initialize pan to center board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || panX !== 0 || panY !== 0) return;

    const { panX: initX, panY: initY } = computeInitialPan(
      canvas.width,
      canvas.height,
      boardWidth,
      boardHeight,
      zoom
    );
    setPan(initX, initY);
  }, [boardWidth, boardHeight, zoom, panX, panY, setPan]);

  // Resize canvas to container
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      canvas.width = width;
      canvas.height = height;

      // Re-center on resize
      const { panX: cx, panY: cy } = computeInitialPan(width, height, boardWidth, boardHeight, zoom);
      setPan(cx, cy);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [boardWidth, boardHeight, zoom, setPan]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const showGrid = zoom >= 0.7;

    renderBoard(ctx, {
      boardState,
      width: canvas.width,
      height: canvas.height,
      zoom,
      panX,
      panY,
      showGrid,
      showZones,
      hoverCells: isPlacementMode ? hoverCells : undefined,
      isHoverValid,
      playerSlot: playerSlot ?? undefined,
    });
  }, [boardState, zoom, panX, panY, hoverCells, isHoverValid, isPlacementMode, showZones, playerSlot]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-full rounded-lg overflow-hidden',
        'game-canvas-container',
        isPanning && 'panning',
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setZoom(zoom + 0.2)}
          className="w-8 h-8 bg-card/80 border border-border rounded-md flex items-center justify-center text-foreground hover:bg-accent transition-colors text-lg leading-none"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="w-8 h-8 bg-card/80 border border-border rounded-md flex items-center justify-center text-xs text-muted-foreground hover:bg-accent transition-colors"
          title="Reset view"
        >
          ⊡
        </button>
        <button
          onClick={() => setZoom(zoom - 0.2)}
          className="w-8 h-8 bg-card/80 border border-border rounded-md flex items-center justify-center text-foreground hover:bg-accent transition-colors text-lg leading-none"
          title="Zoom out"
        >
          −
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-3 left-3 text-xs text-muted-foreground bg-card/60 px-2 py-1 rounded">
        {Math.round(zoom * 100)}%
      </div>

      {/* Placement hint */}
      {isPlacementMode && selectedPatternId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-card/80 px-3 py-1.5 rounded-full border border-border">
          Click to place • Right-drag to pan • Scroll to zoom
        </div>
      )}
    </div>
  );
}
