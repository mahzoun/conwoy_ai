'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Match, PlayerSlot } from '@conwoy/shared';
import { api } from '../../../lib/api';
import { LoadingPage } from '../../../components/ui/LoadingSpinner';
import { truncateAddress, formatRelativeTime } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

export default function ResultsPage() {
  const params = useParams();
  const matchId = params['id'] as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMatch() {
      try {
        setIsLoading(true);
        const response = await api.matches.get(matchId);
        if (response.data?.match) {
          setMatch(response.data.match);
        } else {
          setError('Match not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    }

    loadMatch();
  }, [matchId]);

  if (isLoading) return <LoadingPage message="Loading results..." />;

  if (error || !match) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error ?? 'Results not found'}</p>
          <Link href="/lobby" className="text-primary hover:underline">← Back to Lobby</Link>
        </div>
      </div>
    );
  }

  if (match.phase !== 'finished') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">This match is still in progress</p>
        <Link href={`/match/${matchId}`} className="text-primary hover:underline">
          Watch the match →
        </Link>
      </div>
    );
  }

  const winner = match.winner;
  const total = match.finalScoreP1 + match.finalScoreP2;
  const p1Percent = total > 0 ? (match.finalScoreP1 / total) * 100 : 50;
  const p2Percent = 100 - p1Percent;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back nav */}
      <Link href="/lobby" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6">
        ← Back to Lobby
      </Link>

      {/* Winner banner */}
      <div className={cn(
        'rounded-xl p-8 text-center mb-8 border',
        winner === 1 ? 'bg-blue-500/10 border-blue-500/30' :
        winner === 2 ? 'bg-red-500/10 border-red-500/30' :
        'bg-card border-border'
      )}>
        <div className="text-6xl mb-4">
          {winner === 'draw' ? '🤝' : '🏆'}
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {winner === 'draw' ? 'Draw!' :
           winner === 1 ? 'Player 1 Wins!' : 'Player 2 Wins!'}
        </h1>
        {match.finishedAt && (
          <p className="text-muted-foreground text-sm">
            Finished {formatRelativeTime(match.finishedAt)}
          </p>
        )}
      </div>

      {/* Score breakdown */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold mb-6">Final Score</h2>

        <div className="flex justify-around mb-6">
          <div className="text-center">
            <div className={cn(
              'text-5xl font-bold font-mono mb-2',
              winner === 1 ? 'text-yellow-400' : 'text-blue-400'
            )}>
              {match.finalScoreP1}
            </div>
            <div className="text-sm font-mono text-muted-foreground">
              {truncateAddress(match.player1?.walletAddress ?? 'Unknown')}
            </div>
            <div className="text-xs text-blue-400 mt-1">
              Player 1 {match.player1?.agentId ? `(${match.player1.agentId})` : ''}
            </div>
          </div>

          <div className="self-center text-2xl text-muted-foreground">vs</div>

          <div className="text-center">
            <div className={cn(
              'text-5xl font-bold font-mono mb-2',
              winner === 2 ? 'text-yellow-400' : 'text-red-400'
            )}>
              {match.finalScoreP2}
            </div>
            <div className="text-sm font-mono text-muted-foreground">
              {truncateAddress(match.player2?.walletAddress ?? 'Unknown')}
            </div>
            <div className="text-xs text-red-400 mt-1">
              Player 2 {match.player2?.agentId ? `(${match.player2.agentId})` : ''}
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-4 rounded-full overflow-hidden flex">
          <div className="bg-blue-500 transition-all" style={{ width: `${p1Percent}%` }} />
          <div className="bg-red-500 transition-all" style={{ width: `${p2Percent}%` }} />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{p1Percent.toFixed(1)}%</span>
          <span>{p2Percent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Cumulative P1', value: match.cumulativeScoreP1.toLocaleString() },
          { label: 'Cumulative P2', value: match.cumulativeScoreP2.toLocaleString() },
          { label: 'Entry Fee', value: match.config.entryFeeWei === '0' ? 'Free' : `${Number(match.config.entryFeeWei) / 1e18} ETH` },
          { label: 'Board Size', value: `${match.config.boardWidth}×${match.config.boardHeight}` },
        ].map(stat => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-4 text-center">
            <div className="text-xl font-bold font-mono">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Result signature */}
      {match.resultSignature && (
        <div className="bg-muted/30 rounded-lg p-4 text-xs">
          <div className="text-muted-foreground mb-1">Result Signature (cryptographic proof):</div>
          <div className="font-mono text-green-400/70 break-all">{match.resultSignature}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link
          href="/lobby"
          className="flex-1 py-3 text-center bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Play Again
        </Link>
        <Link
          href={`/match/${matchId}`}
          className="flex-1 py-3 text-center border border-border rounded-lg text-sm hover:bg-accent transition-colors"
        >
          View Match Replay
        </Link>
      </div>
    </div>
  );
}
