'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import {
  AgentId,
  PatternId,
  PlayerSlot,
  SimulationTickMessage,
} from '@conwoy/shared';
import { useMatch } from '../../../hooks/useMatch';
import { useSimulation } from '../../../hooks/useSimulation';
import { GameBoard } from '../../../components/game/GameBoard';
import { AgentSelector } from '../../../components/game/AgentSelector';
import { PatternPicker } from '../../../components/game/PatternPicker';
import { PlacementMode } from '../../../components/game/PlacementMode';
import { Scoreboard } from '../../../components/game/Scoreboard';
import { GenerationCounter } from '../../../components/game/GenerationCounter';
import { SimulationControls } from '../../../components/game/SimulationControls';
import { ResultModal } from '../../../components/match/ResultModal';
import { LoadingPage } from '../../../components/ui/LoadingSpinner';
import { truncateAddress } from '../../../lib/utils';
import { cn } from '../../../lib/utils';

export default function MatchPage() {
  const params = useParams();
  const matchId = params['id'] as string;
  const { address } = useAccount();

  const [selectedAgentLocal, setSelectedAgentLocal] = useState<AgentId | null>(null);
  const [selectedPatternLocal, setSelectedPatternLocal] = useState<PatternId | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [mirror, setMirror] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [scoreP1, setScoreP1] = useState(0);
  const [scoreP2, setScoreP2] = useState(0);

  const simulation = useSimulation({ initialSpeed: 100 });

  const {
    match,
    playerSlot,
    isConnected,
    isLoading,
    error,
    wsError,
    send,
    selectAgent,
    selectPattern,
    placePattern,
    confirmReady,
    requestRematch,
  } = useMatch({ matchId });

  // Handle WS messages for simulation
  useEffect(() => {
    if (!match) return;

    if (match.phase === 'running' && match.boardState) {
      setScoreP1(match.finalScoreP1);
      setScoreP2(match.finalScoreP2);
    }

    if (match.phase === 'finished') {
      setShowResultModal(true);
    }
  }, [match]);

  // Listen for simulation ticks via websocket - we receive them through match updates
  // The board state is already in match.boardState when phase === 'running'

  const handleSelectAgent = useCallback((agentId: AgentId) => {
    setSelectedAgentLocal(agentId);
    selectAgent(agentId);
  }, [selectAgent]);

  const handleSelectPattern = useCallback((patternId: PatternId) => {
    setSelectedPatternLocal(patternId);
    selectPattern(patternId, rotation, mirror);
  }, [selectPattern, rotation, mirror]);

  const handleRotate = useCallback(() => {
    const newRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    setRotation(newRotation);
    if (selectedPatternLocal) {
      selectPattern(selectedPatternLocal, newRotation, mirror);
    }
  }, [rotation, mirror, selectedPatternLocal, selectPattern]);

  const handleMirror = useCallback(() => {
    const newMirror = !mirror;
    setMirror(newMirror);
    if (selectedPatternLocal) {
      selectPattern(selectedPatternLocal, rotation, newMirror);
    }
  }, [mirror, rotation, selectedPatternLocal, selectPattern]);

  const handlePlace = useCallback((row: number, col: number) => {
    placePattern(row, col);
  }, [placePattern]);

  if (isLoading) {
    return <LoadingPage message="Loading match..." />;
  }

  if (error || !match) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error ?? 'Match not found'}</p>
          <a href="/lobby" className="text-primary hover:underline">← Back to Lobby</a>
        </div>
      </div>
    );
  }

  const isSetupPhase = match.phase === 'setup';
  const isRunningPhase = match.phase === 'running';
  const isFinished = match.phase === 'finished';
  const isWaiting = match.phase === 'waiting';

  const myPlayer = playerSlot === 1 ? match.player1 : match.player2;
  const opponentPlayer = playerSlot === 1 ? match.player2 : match.player1;

  const isPlacementMode = isSetupPhase && !!myPlayer && !myPlayer.isReady && !!selectedPatternLocal;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
            )}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>

        <div className="flex-1 text-center">
          <span className="text-sm font-mono text-muted-foreground">
            Match #{matchId.slice(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">
              {truncateAddress(match.player1?.walletAddress ?? '???')}
            </span>
          </div>
          <span className="text-muted-foreground">vs</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">
              {truncateAddress(match.player2?.walletAddress ?? '???')}
            </span>
          </div>
        </div>
      </div>

      {/* Phase banner */}
      {isWaiting && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-sm text-yellow-300">
          Waiting for an opponent to join... Share this URL to invite someone!
        </div>
      )}

      {wsError && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-center text-sm text-red-400">
          {wsError}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col border-r border-border bg-card/30 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Phase indicator */}
            <div className="flex items-center gap-2">
              <div className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border',
                isWaiting ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' :
                isSetupPhase ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' :
                isRunningPhase ? 'border-purple-500/30 bg-purple-500/10 text-purple-300' :
                'border-green-500/30 bg-green-500/10 text-green-300'
              )}>
                {isWaiting ? 'Waiting' : isSetupPhase ? 'Setup Phase' : isRunningPhase ? 'Running' : 'Finished'}
              </div>
              {playerSlot && (
                <span className={cn(
                  'text-xs font-medium',
                  playerSlot === 1 ? 'text-blue-400' : 'text-red-400'
                )}>
                  You: P{playerSlot}
                </span>
              )}
            </div>

            {/* Setup phase controls */}
            {isSetupPhase && playerSlot && (
              <>
                <AgentSelector
                  selectedAgentId={myPlayer?.agentId ?? null}
                  onSelect={handleSelectAgent}
                  playerSlot={playerSlot}
                  disabled={myPlayer?.isReady}
                />

                {myPlayer?.agentId && (
                  <PatternPicker
                    agentId={myPlayer.agentId}
                    selectedPatternId={selectedPatternLocal}
                    rotation={rotation}
                    mirror={mirror}
                    playerSlot={playerSlot}
                    onSelectPattern={handleSelectPattern}
                    onRotate={handleRotate}
                    onMirror={handleMirror}
                    disabled={myPlayer?.isReady}
                  />
                )}

                <PlacementMode
                  playerState={myPlayer ?? null}
                  playerSlot={playerSlot}
                  onConfirmReady={confirmReady}
                  isReady={myPlayer?.isReady ?? false}
                  otherPlayerReady={opponentPlayer?.isReady ?? false}
                />
              </>
            )}

            {/* Running phase: scoreboard */}
            {(isRunningPhase || isFinished) && match.boardState && (
              <>
                <Scoreboard
                  match={match}
                  scoreP1={scoreP1}
                  scoreP2={scoreP2}
                  currentGeneration={match.currentGeneration}
                  playerSlot={playerSlot}
                />

                <GenerationCounter
                  current={match.currentGeneration}
                  max={match.config.maxGenerations}
                />
              </>
            )}

            {/* Waiting phase - opponent info */}
            {isWaiting && (
              <div className="bg-muted/30 rounded-lg p-4 text-center space-y-2">
                <div className="text-4xl">⏳</div>
                <p className="text-sm text-muted-foreground">
                  Share this match URL with an opponent to start
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.href)}
                  className="text-xs text-primary hover:underline"
                >
                  Copy match URL
                </button>
              </div>
            )}

            {/* Finished: rematch */}
            {isFinished && playerSlot && (
              <button
                onClick={() => {
                  setShowResultModal(true);
                }}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                View Results
              </button>
            )}
          </div>
        </div>

        {/* Game board */}
        <div className="flex-1 relative">
          <GameBoard
            boardState={match.boardState}
            boardWidth={match.config.boardWidth}
            boardHeight={match.config.boardHeight}
            selectedPatternId={isPlacementMode ? selectedPatternLocal : null}
            rotation={rotation}
            mirror={mirror}
            playerSlot={playerSlot}
            isPlacementMode={isPlacementMode}
            showZones={isSetupPhase || isWaiting}
            onPlace={handlePlace}
            className="absolute inset-0"
          />
        </div>
      </div>

      {/* Result modal */}
      <ResultModal
        match={match}
        playerSlot={playerSlot}
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        onRematch={playerSlot ? requestRematch : undefined}
      />
    </div>
  );
}
