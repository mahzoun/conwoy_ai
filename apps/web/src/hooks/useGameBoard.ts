'use client';

import { useState, useCallback, useRef } from 'react';
import { PatternId } from '@conwoy/shared';
import { getAbsoluteCells, isPlacementInBounds } from '../lib/patternUtils';
import { pixelToCell } from '../lib/boardRenderer';
import { clampNumber } from '../lib/utils';
import { ZOOM_MIN, ZOOM_MAX } from '../lib/constants';

interface UseGameBoardOptions {
  boardWidth: number;
  boardHeight: number;
  selectedPatternId: PatternId | null;
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
  playerSlot: 1 | 2 | null;
  isPlacementMode: boolean;
  onPlace?: (row: number, col: number) => void;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

interface UseGameBoardReturn {
  zoom: number;
  panX: number;
  panY: number;
  hoverCells: [number, number][];
  isHoverValid: boolean;
  isPanning: boolean;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleMouseLeave: () => void;
  handleClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
  resetView: () => void;
}

export function useGameBoard({
  boardWidth,
  boardHeight,
  selectedPatternId,
  rotation,
  mirror,
  playerSlot,
  isPlacementMode,
  onPlace,
  canvasRef,
}: UseGameBoardOptions): UseGameBoardReturn {
  const [zoom, setZoomState] = useState(1);
  const [panX, setPanXState] = useState(0);
  const [panY, setPanYState] = useState(0);
  const [hoverCells, setHoverCells] = useState<[number, number][]>([]);
  const [isHoverValid, setIsHoverValid] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const setZoom = useCallback((newZoom: number) => {
    setZoomState(clampNumber(newZoom, ZOOM_MIN, ZOOM_MAX));
  }, []);

  const setPan = useCallback((x: number, y: number) => {
    setPanXState(x);
    setPanYState(y);
  }, []);

  const resetView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = 12;
    const boardPixelW = boardWidth * cellSize;
    const boardPixelH = boardHeight * cellSize;
    setZoomState(1);
    setPanXState((canvas.width - boardPixelW) / 2);
    setPanYState((canvas.height - boardPixelH) / 2);
  }, [boardWidth, boardHeight, canvasRef]);

  const getHoverInfo = useCallback((
    pixelX: number,
    pixelY: number,
    currentPanX: number,
    currentPanY: number,
    currentZoom: number
  ) => {
    if (!isPlacementMode || !selectedPatternId || !playerSlot) {
      return { cells: [], valid: false };
    }

    const { row, col } = pixelToCell(pixelX, pixelY, currentPanX, currentPanY, currentZoom);
    const cells = getAbsoluteCells(selectedPatternId, row, col, rotation, mirror);

    const inBounds = isPlacementInBounds(cells, boardWidth, boardHeight);

    // Zone check
    const validZone = cells.every(([r]) => {
      if (playerSlot === 1) return r <= Math.floor(boardHeight / 2) - 1;
      return r >= Math.floor(boardHeight / 2);
    });

    return { cells, valid: inBounds && validZone };
  }, [isPlacementMode, selectedPatternId, playerSlot, rotation, mirror, boardWidth, boardHeight]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle panning
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setPanXState(panStart.current.panX + dx);
      setPanYState(panStart.current.panY + dy);
      return;
    }

    lastMousePos.current = { x, y };

    // Update hover cells
    const { cells, valid } = getHoverInfo(x, y, panX, panY, zoom);
    setHoverCells(cells);
    setIsHoverValid(valid);
  }, [isPanning, panX, panY, zoom, getHoverInfo, canvasRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle click or right click = pan mode
    if (e.button === 1 || e.button === 2 || !isPlacementMode) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX, panY };
    }
  }, [isPlacementMode, panX, panY]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverCells([]);
    setIsPanning(false);
    panStart.current = null;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPlacementMode || !selectedPatternId || !playerSlot || e.button !== 0) return;
    if (isPanning) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const { row, col } = pixelToCell(x, y, panX, panY, zoom);
    const { valid } = getHoverInfo(x, y, panX, panY, zoom);

    if (valid) {
      onPlace?.(row, col);
    }
  }, [isPlacementMode, selectedPatternId, playerSlot, isPanning, panX, panY, zoom, getHoverInfo, onPlace, canvasRef]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = clampNumber(zoom + delta, ZOOM_MIN, ZOOM_MAX);
    const zoomFactor = newZoom / zoom;

    // Zoom toward mouse position
    const newPanX = mouseX - (mouseX - panX) * zoomFactor;
    const newPanY = mouseY - (mouseY - panY) * zoomFactor;

    setZoomState(newZoom);
    setPanXState(newPanX);
    setPanYState(newPanY);
  }, [zoom, panX, panY, canvasRef]);

  return {
    zoom,
    panX,
    panY,
    hoverCells,
    isHoverValid,
    isPanning,
    setZoom,
    setPan,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleMouseLeave,
    handleClick,
    handleWheel,
    resetView,
  };
}
