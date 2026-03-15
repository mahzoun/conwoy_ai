'use client';

import { cn } from '../../lib/utils';

interface GenerationCounterProps {
  current: number;
  max: number;
  className?: string;
}

export function GenerationCounter({ current, max, className }: GenerationCounterProps) {
  const progress = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="text-sm font-mono">
        <span className="text-foreground font-bold">{current}</span>
        <span className="text-muted-foreground"> / {max}</span>
      </div>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-100"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">gen</span>
    </div>
  );
}
