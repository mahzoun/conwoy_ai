'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Match } from '@conwoy/shared';
import { api } from '../../lib/api';
import { MatchCard } from './MatchCard';
import { CreateMatchModal } from './CreateMatchModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { cn } from '../../lib/utils';

export function MatchLobby() {
  const { address } = useAccount();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'open' | 'live' | 'finished'>('open');

  async function loadMatches() {
    setIsLoading(true);
    setError(null);
    try {
      const phaseMap = { open: 'waiting', live: 'running', finished: 'finished' };
      const response = await api.matches.list({ phase: phaseMap[activeTab], pageSize: 30 });
      setMatches(response.data?.matches ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [activeTab]);

  const tabs = [
    { id: 'open' as const, label: 'Open', description: 'Join a match' },
    { id: 'live' as const, label: 'Live', description: 'Watch ongoing' },
    { id: 'finished' as const, label: 'Finished', description: 'View results' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Lobby</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create a new match or join an existing one
          </p>
        </div>
        <button
          onClick={() => {
            if (!address) {
              alert('Please connect your wallet first');
              return;
            }
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          + New Match
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-3">{error}</p>
            <button
              onClick={loadMatches}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="text-4xl mb-4">🎮</div>
            <p className="text-lg font-medium mb-2">
              {activeTab === 'open' ? 'No open matches' :
               activeTab === 'live' ? 'No live matches' :
               'No finished matches'}
            </p>
            {activeTab === 'open' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-sm text-primary hover:underline mt-2"
              >
                Create the first one!
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                currentUserAddress={address}
              />
            ))}
          </div>
        )}
      </div>

      <CreateMatchModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
