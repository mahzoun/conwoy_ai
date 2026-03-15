'use client';

import { useState } from 'react';
import { cn } from '../../lib/utils';

interface RematchButtonProps {
  onRematch: () => void;
  opponentRequestedRematch?: boolean;
  className?: string;
}

export function RematchButton({ onRematch, opponentRequestedRematch, className }: RematchButtonProps) {
  const [hasRequested, setHasRequested] = useState(false);

  const handleClick = () => {
    setHasRequested(true);
    onRematch();
  };

  if (hasRequested) {
    return (
      <div className={cn(
        'flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30',
        className
      )}>
        <span className="text-sm text-blue-400 font-medium">
          {opponentRequestedRematch ? 'Creating rematch...' : 'Waiting for opponent...'}
        </span>
        {!opponentRequestedRematch && (
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'relative px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm transition-all hover:bg-primary/90 active:scale-95',
        opponentRequestedRematch && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-background',
        className
      )}
    >
      {opponentRequestedRematch && (
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-yellow-400 text-black text-xs flex items-center justify-center font-bold">
          1
        </span>
      )}
      {opponentRequestedRematch ? '🔥 Accept Rematch' : 'Request Rematch'}
    </button>
  );
}
