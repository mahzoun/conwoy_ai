'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
  Match,
  ServerMessage,
  ClientMessage,
  AgentId,
  PatternId,
  PlayerSlot,
} from '@conwoy/shared';
import { useWebSocket } from './useWebSocket';
import { api } from '../lib/api';

interface UseMatchOptions {
  matchId: string;
}

interface UseMatchReturn {
  match: Match | null;
  playerSlot: PlayerSlot | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  wsError: string | null;
  send: (message: ClientMessage) => void;
  joinRoom: () => void;
  selectAgent: (agentId: AgentId) => void;
  selectPattern: (patternId: PatternId, rotation: 0 | 90 | 180 | 270, mirror: boolean) => void;
  placePattern: (row: number, col: number) => void;
  confirmReady: () => void;
  requestRematch: () => void;
}

export function useMatch({ matchId }: UseMatchOptions): UseMatchReturn {
  const { address } = useAccount();
  const [match, setMatch] = useState<Match | null>(null);
  const [playerSlot, setPlayerSlot] = useState<PlayerSlot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsError, setWsError] = useState<string | null>(null);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'MATCH_UPDATED': {
        setMatch(message.match);

        // Determine player slot
        if (address) {
          const addr = address.toLowerCase();
          if (message.match.player1?.walletAddress === addr) {
            setPlayerSlot(1);
          } else if (message.match.player2?.walletAddress === addr) {
            setPlayerSlot(2);
          }
        }
        break;
      }

      case 'SIMULATION_TICK': {
        setMatch(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            boardState: message.boardState,
            currentGeneration: message.generation,
          };
        });
        break;
      }

      case 'MATCH_FINISHED': {
        setMatch(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            phase: 'finished',
            winner: message.winner,
            finalScoreP1: message.finalScoreP1,
            finalScoreP2: message.finalScoreP2,
            cumulativeScoreP1: message.cumulativeScoreP1,
            cumulativeScoreP2: message.cumulativeScoreP2,
            resultSignature: message.resultSignature,
          };
        });
        break;
      }

      case 'ERROR': {
        setWsError(message.message);
        setTimeout(() => setWsError(null), 5000);
        break;
      }
    }
  }, [address]);

  const { send, isConnected } = useWebSocket({
    onMessage: handleMessage,
  });

  // Load initial match data
  useEffect(() => {
    async function loadMatch() {
      try {
        setIsLoading(true);
        const response = await api.matches.get(matchId);
        if (response.data?.match) {
          setMatch(response.data.match);

          // Determine slot
          if (address) {
            const addr = address.toLowerCase();
            const m = response.data.match;
            if (m.player1?.walletAddress === addr) setPlayerSlot(1);
            else if (m.player2?.walletAddress === addr) setPlayerSlot(2);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match');
      } finally {
        setIsLoading(false);
      }
    }

    loadMatch();
  }, [matchId, address]);

  // Auto-join room when connected
  useEffect(() => {
    if (isConnected && address) {
      send({ type: 'PLAYER_JOIN', matchId, walletAddress: address });
    }
  }, [isConnected, matchId, address, send]);

  const joinRoom = useCallback(() => {
    if (address) {
      send({ type: 'PLAYER_JOIN', matchId, walletAddress: address });
    }
  }, [send, matchId, address]);

  const selectAgent = useCallback((agentId: AgentId) => {
    if (!address) return;
    send({ type: 'SELECT_AGENT', matchId, walletAddress: address, agentId });
  }, [send, matchId, address]);

  const selectPattern = useCallback((
    patternId: PatternId,
    rotation: 0 | 90 | 180 | 270,
    mirror: boolean
  ) => {
    if (!address) return;
    send({ type: 'SELECT_PATTERN', matchId, walletAddress: address, patternId, rotation, mirror });
  }, [send, matchId, address]);

  const placePattern = useCallback((row: number, col: number) => {
    if (!address) return;
    send({ type: 'PLACE_PATTERN', matchId, walletAddress: address, row, col });
  }, [send, matchId, address]);

  const confirmReady = useCallback(() => {
    if (!address) return;
    send({ type: 'CONFIRM_READY', matchId, walletAddress: address });
  }, [send, matchId, address]);

  const requestRematch = useCallback(() => {
    if (!address) return;
    send({ type: 'REQUEST_REMATCH', matchId, walletAddress: address });
  }, [send, matchId, address]);

  return {
    match,
    playerSlot,
    isConnected,
    isLoading,
    error,
    wsError,
    send,
    joinRoom,
    selectAgent,
    selectPattern,
    placePattern,
    confirmReady,
    requestRematch,
  };
}
