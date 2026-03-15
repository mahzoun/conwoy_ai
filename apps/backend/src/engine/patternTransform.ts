/**
 * Transform pattern cell coordinates by rotation and/or mirroring.
 * All transforms are applied relative to the pattern's bounding box.
 */
export function transformPattern(
  cells: [number, number][],
  rotation: 0 | 90 | 180 | 270,
  mirror: boolean,
  originalWidth: number,
  originalHeight: number
): [number, number][] {
  let transformed = cells.map(([r, c]) => [r, c] as [number, number]);

  // Apply mirror first (horizontal flip: negate column)
  if (mirror) {
    transformed = transformed.map(([r, c]) => [r, originalWidth - 1 - c]);
  }

  // Apply rotation
  if (rotation === 90) {
    // 90 degrees clockwise: [r,c] -> [c, height-1-r]
    const h = mirror ? originalWidth : originalWidth;
    const w = originalHeight;
    transformed = transformed.map(([r, c]) => [c, originalHeight - 1 - r]);
  } else if (rotation === 180) {
    // 180 degrees: [r,c] -> [height-1-r, width-1-c]
    const h = originalHeight;
    const w = mirror ? originalWidth : originalWidth;
    transformed = transformed.map(([r, c]) => [h - 1 - r, originalWidth - 1 - c]);
  } else if (rotation === 270) {
    // 270 degrees clockwise (90 counter-clockwise): [r,c] -> [width-1-c, r]
    transformed = transformed.map(([r, c]) => [originalWidth - 1 - c, r]);
  }

  // Normalize to ensure top-left is at (0,0)
  const minRow = Math.min(...transformed.map(([r]) => r));
  const minCol = Math.min(...transformed.map(([, c]) => c));

  return transformed.map(([r, c]) => [r - minRow, c - minCol]);
}

/**
 * Get the bounding box of transformed pattern cells.
 */
export function getTransformedBounds(
  cells: [number, number][]
): { width: number; height: number } {
  if (cells.length === 0) return { width: 0, height: 0 };

  const minRow = Math.min(...cells.map(([r]) => r));
  const maxRow = Math.max(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));
  const maxCol = Math.max(...cells.map(([, c]) => c));

  return {
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}
