'use client';

import Link from 'next/link';
import { Match } from '@conwoy/shared';
import { truncateAddress, formatRelativeTime } from '../../lib/utils';
import { StakeDisplay } from '../ui/StakeDisplay';
import { cn } from '../../lib/utils';

interface MatchCardProps {
  match: Match;
  currentUserAddress?: string;
}

const PHASE_LABELS: Record<string, string> = {
  waiting: 'Open',
  setup: 'Setting Up',
  ready: 'Starting',
  running: 'Live',
  finished: 'Finished',
};

const PHASE_COLORS: Record<string, string> = {
  waiting: 'text-green-400 bg-green-400/10 border-green-400/30',
  setup: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  ready: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  running: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  finished: 'text-muted-foreground bg-muted/50 border-border',
};

export function MatchCard({ match, currentUserAddress }: MatchCardProps) {
  const isParticipant =
    currentUserAddress &&
    (match.player1?.walletAddress === currentUserAddress.toLowerCase() ||
      match.player2?.walletAddress === currentUserAddress.toLowerCase());

  return (
    <Link href={`/match/${match.id}`}>
      <div
        className={cn(
          'p-4 rounded-lg border bg-card hover:bg-accent/30 transition-all cursor-pointer',
          isParticipant ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={cn(
                  'text-xs font-medium px-2 py-0.5 rounded-full border',
                  PHASE_COLORS[match.phase] ?? PHASE_COLORS['waiting']!
                )}
              >
                {PHASE_LABELS[match.phase] ?? match.phase}
              </span>
              {isParticipant && (
                <span className="text-xs text-primary font-medium">Your match</span>
              )}
            </div>

            {/* Players */}
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-foreground/80">
                  {match.player1?.walletAddress
                    ? truncateAddress(match.player1.walletAddress)
                    : 'Open'}
                </span>
              </div>
              <span className="text-muted-foreground text-xs">vs</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-foreground/80">
                  {match.player2?.walletAddress
                    ? truncateAddress(match.player2.walletAddress)
                    : '???'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StakeDisplay entryFeeWei={match.config.entryFeeWei} showLabel={false} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(match.createdAt)}
            </span>
          </div>
        </div>

        {/* Result for finished matches */}
        {match.phase === 'finished' && match.winner !== null && (
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">Result:</span>
            <span className={cn(
              'font-medium text-xs',
              match.winner === 'draw' ? 'text-yellow-400' :
              match.winner === 1 ? 'text-blue-400' : 'text-red-400'
            )}>
              {match.winner === 'draw' ? 'Draw' :
               match.winner === 1 ? `P1 Wins (${match.finalScoreP1} vs ${match.finalScoreP2})` :
               `P2 Wins (${match.finalScoreP2} vs ${match.finalScoreP1})`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
