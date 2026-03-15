'use client';

import { cn } from '../../lib/utils';
import { SIMULATION_SPEEDS } from '../../lib/constants';

interface SimulationControlsProps {
  isPlaying: boolean;
  speed: number;
  currentGeneration: number;
  maxGenerations: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}

export function SimulationControls({
  isPlaying,
  speed,
  currentGeneration,
  maxGenerations,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSpeedChange,
  disabled,
}: SimulationControlsProps) {
  const progress = maxGenerations > 0 ? (currentGeneration / maxGenerations) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 p-3 bg-card rounded-lg border border-border">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Generation {currentGeneration}</span>
          <span>Max {maxGenerations}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Step back */}
        <button
          onClick={onStepBackward}
          disabled={disabled || currentGeneration <= 0}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-secondary hover:bg-accent transition-colors disabled:opacity-40 text-sm"
          title="Step backward"
        >
          ⏮
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={disabled}
          className={cn(
            'flex-1 h-9 flex items-center justify-center gap-2 rounded-md font-medium text-sm transition-colors disabled:opacity-40',
            isPlaying
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <>
              <span>⏸</span>
              <span>Pause</span>
            </>
          ) : (
            <>
              <span>▶</span>
              <span>Play</span>
            </>
          )}
        </button>

        {/* Step forward */}
        <button
          onClick={onStepForward}
          disabled={disabled}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-border bg-secondary hover:bg-accent transition-colors disabled:opacity-40 text-sm"
          title="Step forward"
        >
          ⏭
        </button>
      </div>

      {/* Speed controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Speed:</span>
        {SIMULATION_SPEEDS.map(s => (
          <button
            key={s.ms}
            onClick={() => onSpeedChange(s.ms)}
            className={cn(
              'flex-1 h-7 text-xs rounded-md border transition-colors',
              speed === s.ms
                ? 'border-primary bg-primary/20 text-primary'
                : 'border-border bg-secondary text-muted-foreground hover:bg-accent'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
