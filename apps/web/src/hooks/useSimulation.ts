'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationTickMessage } from '@conwoy/shared';

interface UseSimulationOptions {
  initialSpeed?: number;
}

interface UseSimulationReturn {
  isPlaying: boolean;
  speed: number;
  currentIndex: number;
  totalFrames: number;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  seekTo: (index: number) => void;
  setSpeed: (speed: number) => void;
  addFrame: (tick: SimulationTickMessage) => void;
  clearHistory: () => void;
  currentTick: SimulationTickMessage | null;
}

export function useSimulation(options: UseSimulationOptions = {}): UseSimulationReturn {
  const { initialSpeed = 100 } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<SimulationTickMessage[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const historyRef = useRef<SimulationTickMessage[]>([]);
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(speed);

  // Keep refs in sync
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      const idx = currentIndexRef.current;
      const hist = historyRef.current;

      if (idx >= hist.length - 1) {
        setIsPlaying(false);
        return;
      }

      const next = idx + 1;
      currentIndexRef.current = next;
      setCurrentIndex(next);
      scheduleNext();
    }, speedRef.current);
  }, []);

  const play = useCallback(() => {
    if (currentIndexRef.current >= historyRef.current.length - 1) {
      currentIndexRef.current = 0;
      setCurrentIndex(0);
    }
    setIsPlaying(true);
    isPlayingRef.current = true;
    scheduleNext();
  }, [scheduleNext]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const stepForward = useCallback(() => {
    pause();
    const next = Math.min(currentIndexRef.current + 1, historyRef.current.length - 1);
    currentIndexRef.current = next;
    setCurrentIndex(next);
  }, [pause]);

  const stepBackward = useCallback(() => {
    pause();
    const prev = Math.max(currentIndexRef.current - 1, 0);
    currentIndexRef.current = prev;
    setCurrentIndex(prev);
  }, [pause]);

  const seekTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, historyRef.current.length - 1));
    currentIndexRef.current = clamped;
    setCurrentIndex(clamped);
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    speedRef.current = newSpeed;
    // Restart timer if playing
    if (isPlayingRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);
      scheduleNext();
    }
  }, [scheduleNext]);

  const addFrame = useCallback((tick: SimulationTickMessage) => {
    setHistory(prev => {
      const updated = [...prev, tick];
      historyRef.current = updated;
      return updated;
    });
    // Auto-advance if playing
    if (!isPlayingRef.current) {
      const latestIndex = historyRef.current.length;
      currentIndexRef.current = latestIndex;
      setCurrentIndex(latestIndex);
    }
  }, []);

  const clearHistory = useCallback(() => {
    pause();
    setHistory([]);
    historyRef.current = [];
    currentIndexRef.current = 0;
    setCurrentIndex(0);
  }, [pause]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const currentTick = history[currentIndex] ?? null;

  return {
    isPlaying,
    speed,
    currentIndex,
    totalFrames: history.length,
    play,
    pause,
    stepForward,
    stepBackward,
    seekTo,
    setSpeed,
    addFrame,
    clearHistory,
    currentTick,
  };
}
