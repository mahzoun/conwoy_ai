'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Match } from '@conwoy/shared';
import { api } from '../../lib/api';
import { truncateAddress, formatWei } from '../../lib/utils';

interface JoinMatchModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
}

export function JoinMatchModal({ match, isOpen, onClose }: JoinMatchModalProps) {
  const { address } = useAccount();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const entryFee = match.config.entryFeeWei;
  const isFree = entryFee === '0';

  const handleJoin = async () => {
    if (!address) return;

    setIsJoining(true);
    setError(null);

    try {
      const response = await api.matches.join(match.id, address);
      if (response.data?.match) {
        router.push(`/match/${match.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join match');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">Join Match</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Challenge{' '}
            <span className="text-blue-400 font-medium">
              {truncateAddress(match.player1?.walletAddress ?? '')}
            </span>{' '}
            to a game
          </p>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opponent:</span>
                <span className="font-mono text-blue-400">
                  {truncateAddress(match.player1?.walletAddress ?? '')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry fee:</span>
                <span className={isFree ? 'text-green-400' : 'text-yellow-400'}>
                  {formatWei(entryFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Board:</span>
                <span>60 × 40</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Your role:</span>
                <span className="text-red-400">Player 2 (bottom half)</span>
              </div>
            </div>

            {!isFree && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-xs text-yellow-300">
                You will need to send {formatWei(entryFee)} to join this match. Winner takes the pot.
              </div>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={isJoining || !address}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isJoining ? 'Joining...' : isFree ? 'Join Free' : `Join (${formatWei(entryFee)})`}
          </button>
        </div>
      </div>
    </div>
  );
}
