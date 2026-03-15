'use client';

import { PlayerState, AgentId, PatternId, PlayerSlot } from '@conwoy/shared';
import { MAX_INITIAL_CELLS } from '@conwoy/shared';
import { cn } from '../../lib/utils';

interface PlacementModeProps {
  playerState: PlayerState | null;
  playerSlot: PlayerSlot;
  onConfirmReady: () => void;
  isReady: boolean;
  otherPlayerReady: boolean;
}

export function PlacementMode({
  playerState,
  playerSlot,
  onConfirmReady,
  isReady,
  otherPlayerReady,
}: PlacementModeProps) {
  const placedCount = playerState?.placedCells.length ?? 0;
  const maxCells = MAX_INITIAL_CELLS;
  const progress = (placedCount / maxCells) * 100;
  const canReady = placedCount > 0 && playerState?.agentId !== null;

  return (
    <div className="space-y-4">
      {/* Cell counter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Cells Placed</span>
          <span className={cn(
            'font-mono font-medium',
            placedCount >= maxCells ? 'text-red-400' : 'text-foreground'
          )}>
            {placedCount} / {maxCells}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              placedCount >= maxCells ? 'bg-red-500' : playerSlot === 1 ? 'bg-blue-500' : 'bg-red-500'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status indicators */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isReady ? 'bg-green-500' : 'bg-muted-foreground'
          )} />
          <span className={isReady ? 'text-green-400' : 'text-muted-foreground'}>
            You — {isReady ? 'Ready!' : 'Setting up...'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={cn(
            'w-2 h-2 rounded-full',
            otherPlayerReady ? 'bg-green-500' : 'bg-muted-foreground animate-pulse'
          )} />
          <span className={otherPlayerReady ? 'text-green-400' : 'text-muted-foreground'}>
            Opponent — {otherPlayerReady ? 'Ready!' : 'Waiting...'}
          </span>
        </div>
      </div>

      {/* Ready button */}
      <button
        onClick={onConfirmReady}
        disabled={!canReady || isReady}
        className={cn(
          'w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all',
          isReady
            ? 'bg-green-500/20 text-green-400 border border-green-500/40 cursor-default'
            : canReady
            ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isReady ? '✓ Ready!' : canReady ? 'Confirm Ready' : 'Place patterns first'}
      </button>

      {/* Tips */}
      {!isReady && (
        <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-3">
          <p className="font-medium text-foreground/60">Tips:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              You can only place in the{' '}
              <span className={playerSlot === 1 ? 'text-blue-400' : 'text-red-400'}>
                {playerSlot === 1 ? 'top' : 'bottom'} half
              </span>
            </li>
            <li>Scroll to zoom, right-drag to pan</li>
            <li>Stable patterns survive longer</li>
            <li>Oscillators create expansion zones</li>
          </ul>
        </div>
      )}
    </div>
  );
}
