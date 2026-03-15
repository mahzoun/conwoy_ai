'use client';

import { Match, PlayerSlot } from '@conwoy/shared';
import { truncateAddress } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface ScoreboardProps {
  match: Match;
  scoreP1: number;
  scoreP2: number;
  currentGeneration: number;
  playerSlot?: PlayerSlot | null;
}

export function Scoreboard({ match, scoreP1, scoreP2, currentGeneration, playerSlot }: ScoreboardProps) {
  const total = scoreP1 + scoreP2;
  const p1Percent = total > 0 ? (scoreP1 / total) * 100 : 50;
  const p2Percent = 100 - p1Percent;

  const p1Address = match.player1?.walletAddress ?? 'Player 1';
  const p2Address = match.player2?.walletAddress ?? 'Player 2';

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Live Score</span>
        <span>Gen {currentGeneration}</span>
      </div>

      {/* Score numbers */}
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div
            className={cn(
              'text-2xl font-bold font-mono',
              playerSlot === 1 ? 'text-blue-400' : 'text-blue-300'
            )}
          >
            {scoreP1}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate max-w-[80px]">
            {truncateAddress(p1Address)}
          </div>
          {playerSlot === 1 && (
            <div className="text-xs text-blue-400 font-medium">(You)</div>
          )}
        </div>

        <div className="text-muted-foreground text-sm font-medium">vs</div>

        <div className="text-center">
          <div
            className={cn(
              'text-2xl font-bold font-mono',
              playerSlot === 2 ? 'text-red-400' : 'text-red-300'
            )}
          >
            {scoreP2}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate max-w-[80px]">
            {truncateAddress(p2Address)}
          </div>
          {playerSlot === 2 && (
            <div className="text-xs text-red-400 font-medium">(You)</div>
          )}
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-3 rounded-full overflow-hidden flex">
        <div
          className="bg-blue-500 transition-all duration-300"
          style={{ width: `${p1Percent}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-300"
          style={{ width: `${p2Percent}%` }}
        />
      </div>

      {/* Percentages */}
      <div className="flex justify-between text-xs">
        <span className="text-blue-400 font-medium">{p1Percent.toFixed(1)}%</span>
        <span className="text-red-400 font-medium">{p2Percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
