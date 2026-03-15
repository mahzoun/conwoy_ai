'use client';

import { Match, PlayerSlot } from '@conwoy/shared';
import { truncateAddress } from '../../lib/utils';
import { cn } from '../../lib/utils';
import Link from 'next/link';

interface ResultModalProps {
  match: Match;
  playerSlot: PlayerSlot | null;
  isOpen: boolean;
  onClose: () => void;
  onRematch?: () => void;
}

export function ResultModal({ match, playerSlot, isOpen, onClose, onRematch }: ResultModalProps) {
  if (!isOpen || match.phase !== 'finished') return null;

  const winner = match.winner;
  const isWinner = winner !== 'draw' && winner === playerSlot;
  const isDraw = winner === 'draw';
  const isLoser = !isDraw && !isWinner && winner !== null && playerSlot !== null;

  const myScore = playerSlot === 1 ? match.finalScoreP1 : match.finalScoreP2;
  const opponentScore = playerSlot === 1 ? match.finalScoreP2 : match.finalScoreP1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-card rounded-xl border border-border shadow-2xl overflow-hidden">
        {/* Header band */}
        <div className={cn(
          'py-8 px-6 text-center',
          isWinner ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-700/20 border-b border-yellow-500/20' :
          isDraw ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-b border-border' :
          'bg-gradient-to-br from-red-500/10 to-red-700/10 border-b border-red-500/10'
        )}>
          <div className="text-5xl mb-3">
            {isWinner ? '🏆' : isDraw ? '🤝' : '💀'}
          </div>
          <h2 className={cn(
            'text-2xl font-bold',
            isWinner ? 'text-yellow-400' :
            isDraw ? 'text-blue-400' :
            'text-red-400'
          )}>
            {isWinner ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat'}
          </h2>
          {!playerSlot && (
            <p className="text-sm text-muted-foreground mt-1">
              {winner === 'draw' ? 'Match ended in a draw' :
               winner === 1 ? 'Player 1 wins!' : 'Player 2 wins!'}
            </p>
          )}
        </div>

        {/* Scores */}
        <div className="p-6 space-y-4">
          <div className="flex justify-around text-center">
            <div>
              <div className="text-3xl font-bold font-mono text-blue-400">{match.finalScoreP1}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {truncateAddress(match.player1?.walletAddress ?? 'P1')}
              </div>
              <div className="text-xs text-blue-400/60">Player 1</div>
            </div>
            <div className="text-muted-foreground self-center text-xl">vs</div>
            <div>
              <div className="text-3xl font-bold font-mono text-red-400">{match.finalScoreP2}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {truncateAddress(match.player2?.walletAddress ?? 'P2')}
              </div>
              <div className="text-xs text-red-400/60">Player 2</div>
            </div>
          </div>

          <div className="h-2 rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500"
              style={{
                width: `${(match.finalScoreP1 / Math.max(match.finalScoreP1 + match.finalScoreP2, 1)) * 100}%`
              }}
            />
            <div
              className="bg-red-500"
              style={{
                width: `${(match.finalScoreP2 / Math.max(match.finalScoreP1 + match.finalScoreP2, 1)) * 100}%`
              }}
            />
          </div>

          <div className="text-xs text-center text-muted-foreground">
            After {match.currentGeneration || 'all'} generations
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 px-6 pb-6">
          {onRematch && playerSlot && (
            <button
              onClick={onRematch}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Request Rematch
            </button>
          )}
          <Link
            href={`/results/${match.id}`}
            className="w-full py-2.5 bg-secondary text-secondary-foreground rounded-lg font-semibold text-sm hover:bg-accent transition-colors text-center"
          >
            View Full Results
          </Link>
          <Link
            href="/lobby"
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Back to Lobby
          </Link>
        </div>
      </div>
    </div>
  );
}
