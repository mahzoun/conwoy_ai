'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { api } from '../../lib/api';
import { ProfileResponse, MatchHistoryItem } from '@conwoy/shared';
import { LoadingPage } from '../../components/ui/LoadingSpinner';
import { WalletButton } from '../../components/ui/WalletButton';
import { truncateAddress, formatRelativeTime } from '../../lib/utils';
import { cn } from '../../lib/utils';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.profile.get(address!);
        if (response.data) {
          setProfile(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [address]);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-6">👤</div>
        <h1 className="text-3xl font-bold mb-4">Your Profile</h1>
        <p className="text-muted-foreground mb-8">
          Connect your wallet to view your match history and stats
        </p>
        <WalletButton size="lg" label="Connect Wallet" />
      </div>
    );
  }

  if (isLoading) return <LoadingPage message="Loading profile..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-8">Your Profile</h1>

      {/* Wallet info */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
            {address?.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <div className="font-mono text-sm text-muted-foreground">{address}</div>
            {profile && (
              <div className="text-sm text-muted-foreground mt-1">
                {profile.totalMatches} matches played
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      {profile && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Matches', value: profile.totalMatches, color: 'text-foreground' },
            { label: 'Wins', value: profile.wins, color: 'text-green-400' },
            { label: 'Losses', value: profile.losses, color: 'text-red-400' },
            { label: 'Draws', value: profile.draws, color: 'text-yellow-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-4 text-center">
              <div className={cn('text-3xl font-bold font-mono', stat.color)}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Win rate */}
      {profile && profile.totalMatches > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium">Win Rate</span>
            <span className="text-sm font-bold text-green-400">
              {((profile.wins / profile.totalMatches) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${(profile.wins / profile.totalMatches) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Match history */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Matches</h2>

        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : !profile || profile.recentMatches.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <div className="text-4xl mb-3">🎮</div>
            <p className="text-muted-foreground">No matches played yet</p>
            <Link href="/lobby" className="text-primary hover:underline text-sm mt-2 block">
              Play your first match →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {profile.recentMatches.map(match => (
              <MatchHistoryRow key={match.matchId} match={match} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchHistoryRow({ match }: { match: MatchHistoryItem }) {
  return (
    <Link href={`/results/${match.matchId}`}>
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer">
        <div className={cn(
          'w-16 text-center py-1.5 rounded-md text-xs font-bold',
          match.result === 'win' ? 'bg-green-500/20 text-green-400' :
          match.result === 'loss' ? 'bg-red-500/20 text-red-400' :
          'bg-yellow-500/20 text-yellow-400'
        )}>
          {match.result.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            vs {truncateAddress(match.opponentAddress)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Score: {match.finalScoreSelf} — {match.finalScoreOpponent}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {formatRelativeTime(match.finishedAt)}
          </div>
        </div>
      </div>
    </Link>
  );
}
