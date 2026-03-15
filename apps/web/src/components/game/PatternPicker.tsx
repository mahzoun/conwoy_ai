'use client';

import { AgentId, PatternId } from '@conwoy/shared';
import { AGENTS, PATTERNS } from '@conwoy/shared';
import { PatternPreview } from './PatternPreview';
import { cn } from '../../lib/utils';

interface PatternPickerProps {
  agentId: AgentId | null;
  selectedPatternId: PatternId | null;
  rotation: 0 | 90 | 180 | 270;
  mirror: boolean;
  playerSlot: 1 | 2;
  onSelectPattern: (patternId: PatternId) => void;
  onRotate: () => void;
  onMirror: () => void;
  disabled?: boolean;
}

export function PatternPicker({
  agentId,
  selectedPatternId,
  rotation,
  mirror,
  playerSlot,
  onSelectPattern,
  onRotate,
  onMirror,
  disabled,
}: PatternPickerProps) {
  if (!agentId) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Select an agent first to see available patterns
      </div>
    );
  }

  const agent = AGENTS[agentId];
  if (!agent) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Select Pattern
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {agent.allowedPatterns.map(patternId => {
          const pattern = PATTERNS[patternId];
          if (!pattern) return null;
          const isSelected = selectedPatternId === patternId;

          return (
            <button
              key={patternId}
              onClick={() => !disabled && onSelectPattern(patternId)}
              disabled={disabled}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                isSelected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-accent/30',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <PatternPreview
                patternId={patternId}
                rotation={isSelected ? rotation : 0}
                mirror={isSelected ? mirror : false}
                playerSlot={playerSlot}
                size={60}
              />
              <div className="text-center">
                <div className="text-xs font-medium text-foreground">{pattern.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {pattern.cells.length} cells
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Transform controls */}
      {selectedPatternId && (agent.canRotate || agent.canMirror) && (
        <div className="flex gap-2 pt-2">
          {agent.canRotate && (
            <button
              onClick={onRotate}
              disabled={disabled}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
              title={`Rotate 90° (current: ${rotation}°)`}
            >
              <span>↻</span>
              <span>Rotate {rotation}°</span>
            </button>
          )}
          {agent.canMirror && (
            <button
              onClick={onMirror}
              disabled={disabled}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-md border transition-colors disabled:opacity-50',
                mirror
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card hover:bg-accent text-foreground'
              )}
              title="Mirror horizontally"
            >
              <span>⇔</span>
              <span>Mirror{mirror ? ' (on)' : ''}</span>
            </button>
          )}
        </div>
      )}

      {/* Pattern description */}
      {selectedPatternId && PATTERNS[selectedPatternId] && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          {PATTERNS[selectedPatternId]!.description}
        </p>
      )}
    </div>
  );
}
