'use client';

import { useEffect, useRef } from 'react';
import { PatternId } from '@conwoy/shared';
import { PATTERNS } from '@conwoy/shared';
import { transformPattern } from '../../lib/patternUtils';

interface PatternPreviewProps {
  patternId: PatternId;
  rotation?: 0 | 90 | 180 | 270;
  mirror?: boolean;
  playerSlot?: 1 | 2;
  size?: number;
}

const PLAYER1_COLOR = '#3b82f6';
const PLAYER2_COLOR = '#ef4444';

export function PatternPreview({
  patternId,
  rotation = 0,
  mirror = false,
  playerSlot = 1,
  size = 80,
}: PatternPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pattern = PATTERNS[patternId];
    if (!pattern) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, size, size);

    // Transform cells
    const cells = transformPattern(pattern.cells, rotation, mirror, pattern.width, pattern.height);

    // Compute bounding box
    const maxRow = Math.max(...cells.map(([r]) => r));
    const maxCol = Math.max(...cells.map(([, c]) => c));

    const patternH = maxRow + 1;
    const patternW = maxCol + 1;

    // Cell size that fits in canvas with padding
    const padding = 8;
    const availableSize = size - padding * 2;
    const cellSize = Math.min(
      Math.floor(availableSize / Math.max(patternW, patternH)),
      16
    );

    const startX = Math.floor((size - patternW * cellSize) / 2);
    const startY = Math.floor((size - patternH * cellSize) / 2);

    const color = playerSlot === 1 ? PLAYER1_COLOR : PLAYER2_COLOR;

    // Draw cells
    ctx.fillStyle = color;
    for (const [r, c] of cells) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;

      if (cellSize > 4) {
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 2);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    // Add glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    for (const [r, c] of cells) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      if (cellSize > 4) {
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, cellSize - 2, cellSize - 2, 2);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  }, [patternId, rotation, mirror, playerSlot, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded"
    />
  );
}
