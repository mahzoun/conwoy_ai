'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Match,
  BoardState,
  AgentId,
  PatternId,
  PlayerSlot,
  SimulationTickMessage,
} from '@conwoy/shared';

interface GameContextValue {
  match: Match | null;
  setMatch: (match: Match | null) => void;
  updateMatch: (updater: (prev: Match | null) => Match | null) => void;

  playerSlot: PlayerSlot | null;
  setPlayerSlot: (slot: PlayerSlot | null) => void;

  selectedAgent: AgentId | null;
  setSelectedAgent: (agent: AgentId | null) => void;

  selectedPattern: PatternId | null;
  setSelectedPattern: (pattern: PatternId | null) => void;

  patternRotation: 0 | 90 | 180 | 270;
  setPatternRotation: (rotation: 0 | 90 | 180 | 270) => void;

  patternMirror: boolean;
  setPatternMirror: (mirror: boolean) => void;

  currentBoardState: BoardState | null;
  setCurrentBoardState: (board: BoardState | null) => void;

  scoreP1: number;
  scoreP2: number;
  setScores: (p1: number, p2: number) => void;

  currentGeneration: number;
  setCurrentGeneration: (gen: number) => void;

  isSimulationRunning: boolean;
  setIsSimulationRunning: (running: boolean) => void;

  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;

  // Playback for recorded history
  playbackHistory: SimulationTickMessage[];
  addToPlaybackHistory: (tick: SimulationTickMessage) => void;
  clearPlaybackHistory: () => void;
  playbackIndex: number;
  setPlaybackIndex: (index: number) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [match, setMatchState] = useState<Match | null>(null);
  const [playerSlot, setPlayerSlot] = useState<PlayerSlot | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<PatternId | null>(null);
  const [patternRotation, setPatternRotation] = useState<0 | 90 | 180 | 270>(0);
  const [patternMirror, setPatternMirror] = useState(false);
  const [currentBoardState, setCurrentBoardState] = useState<BoardState | null>(null);
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);
  const [currentGeneration, setCurrentGeneration] = useState(0);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(100);
  const [playbackHistory, setPlaybackHistory] = useState<SimulationTickMessage[]>([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);

  const setMatch = useCallback((match: Match | null) => {
    setMatchState(match);
    if (match?.boardState) {
      setCurrentBoardState(match.boardState);
    }
  }, []);

  const updateMatch = useCallback((updater: (prev: Match | null) => Match | null) => {
    setMatchState(prev => {
      const updated = updater(prev);
      if (updated?.boardState) {
        setCurrentBoardState(updated.boardState);
      }
      return updated;
    });
  }, []);

  const setScores = useCallback((p1: number, p2: number) => {
    setScoreP1(p1);
    setScoreP2(p2);
  }, []);

  const addToPlaybackHistory = useCallback((tick: SimulationTickMessage) => {
    setPlaybackHistory(prev => [...prev, tick]);
  }, []);

  const clearPlaybackHistory = useCallback(() => {
    setPlaybackHistory([]);
    setPlaybackIndex(0);
  }, []);

  return (
    <GameContext.Provider value={{
      match,
      setMatch,
      updateMatch,
      playerSlot,
      setPlayerSlot,
      selectedAgent,
      setSelectedAgent,
      selectedPattern,
      setSelectedPattern,
      patternRotation,
      setPatternRotation,
      patternMirror,
      setPatternMirror,
      currentBoardState,
      setCurrentBoardState,
      scoreP1,
      scoreP2,
      setScores,
      currentGeneration,
      setCurrentGeneration,
      isSimulationRunning,
      setIsSimulationRunning,
      simulationSpeed,
      setSimulationSpeed,
      playbackHistory,
      addToPlaybackHistory,
      clearPlaybackHistory,
      playbackIndex,
      setPlaybackIndex,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
