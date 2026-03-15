'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_FEES = [
  { label: 'Free', wei: '0' },
  { label: '0.001 ETH', wei: '1000000000000000' },
  { label: '0.01 ETH', wei: '10000000000000000' },
  { label: '0.1 ETH', wei: '100000000000000000' },
];

export function CreateMatchModal({ isOpen, onClose }: CreateMatchModalProps) {
  const { address } = useAccount();
  const router = useRouter();
  const [selectedFee, setSelectedFee] = useState(PRESET_FEES[0]!.wei);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!address) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await api.matches.create(address, { entryFeeWei: selectedFee });
      if (response.data?.match) {
        router.push(`/match/${response.data.match.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-1">Create Match</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Set up your competitive Conway&apos;s Game of Life match
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Entry Fee</label>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_FEES.map(fee => (
                  <button
                    key={fee.wei}
                    onClick={() => setSelectedFee(fee.wei)}
                    className={cn(
                      'py-2 px-3 rounded-lg border text-sm transition-colors',
                      selectedFee === fee.wei
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary hover:bg-accent text-foreground'
                    )}
                  >
                    {fee.label}
                  </button>
                ))}
              </div>
              {selectedFee !== '0' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Opponent must match this fee. Winner takes all (minus gas).
                </p>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Board size:</span>
                <span>60 × 40</span>
              </div>
              <div className="flex justify-between">
                <span>Max generations:</span>
                <span>500</span>
              </div>
              <div className="flex justify-between">
                <span>Setup time:</span>
                <span>2 minutes</span>
              </div>
              <div className="flex justify-between">
                <span>Max initial cells:</span>
                <span>50 per player</span>
              </div>
            </div>

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
            onClick={handleCreate}
            disabled={isCreating || !address}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Match'}
          </button>
        </div>
      </div>
    </div>
  );
}
