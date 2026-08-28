import { useSyncExternalStore, useCallback } from 'react';
import {
  TimeSpeed,
  SimulationClockState,
  SimulationClockControls,
  getSimulationClock,
  createSimulationClock,
} from '../engine/SimulationClock';

// Get or create the global clock instance
let globalClock: ReturnType<typeof createSimulationClock> | null = null;

function getGlobalClock() {
  if (!globalClock) {
    globalClock = createSimulationClock();
  }
  return globalClock;
}

// Base hook that only subscribes to the clock - use specific hooks for specific values
function useClockState<T>(selector: (state: SimulationClockState) => T): T {
  const clock = getGlobalClock();

  const subscribe = useCallback((callback: () => void) => clock.subscribe(callback), [clock]);
  const getSnapshot = useCallback(() => selector(clock.getState()), [clock]);
  const getServerSnapshot = useCallback(() => selector(clock.getState()), [clock]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Full clock state + controls - use sparingly as it re-renders on every tick
export function useSimulationClock(): SimulationClockState & SimulationClockControls {
  const clock = getGlobalClock();

  const state = useSyncExternalStore(
    useCallback((callback) => clock.subscribe(callback), [clock]),
    useCallback(() => clock.getState(), [clock]),
    useCallback(() => clock.getState(), [clock])
  );

  const controls: SimulationClockControls = {
    play: useCallback(() => clock.play(), [clock]),
    pause: useCallback(() => clock.pause(), [clock]),
    toggle: useCallback(() => clock.toggle(), [clock]),
    setSpeed: useCallback((speed: TimeSpeed) => clock.setSpeed(speed), [clock]),
    speedUp: useCallback(() => clock.speedUp(), [clock]),
    speedDown: useCallback(() => clock.speedDown(), [clock]),
    setDate: useCallback((date: Date | number) => clock.setDate(date), [clock]),
    setJulianDate: useCallback((jd: number) => clock.setJulianDate(jd), [clock]),
    jumpForward: useCallback((days: number) => clock.jumpForward(days), [clock]),
    jumpBackward: useCallback((days: number) => clock.jumpBackward(days), [clock]),
    resetToNow: useCallback(() => clock.resetToNow(), [clock]),
    resetToEpoch: useCallback(() => clock.resetToEpoch(), [clock]),
    getState: useCallback(() => clock.getState(), [clock]),
    subscribe: useCallback((callback: (state: SimulationClockState) => void) => clock.subscribe(callback), [clock]),
  };

  return { ...state, ...controls };
}

// Specific selectors that only re-render when their specific value changes
// Return primitives to ensure stable references
export function useJulianDate(): number {
  return useClockState(state => state.julianDate);
}

export function useTimeSpeed(): TimeSpeed {
  return useClockState(state => state.speed);
}

export function useSimulationTime(): number {
  // Return timestamp (number) instead of Date object for stable reference
  return useClockState(state => state.date.getTime());
}

export function useSimulationPlaying(): boolean {
  return useClockState(state => state.isRunning);
}

// Controls that don't cause re-renders
export function useSimulationControls(): SimulationClockControls {
  const clock = getGlobalClock();
  return {
    play: useCallback(() => clock.play(), [clock]),
    pause: useCallback(() => clock.pause(), [clock]),
    toggle: useCallback(() => clock.toggle(), [clock]),
    setSpeed: useCallback((speed: TimeSpeed) => clock.setSpeed(speed), [clock]),
    speedUp: useCallback(() => clock.speedUp(), [clock]),
    speedDown: useCallback(() => clock.speedDown(), [clock]),
    setDate: useCallback((date: Date | number) => clock.setDate(date), [clock]),
    setJulianDate: useCallback((jd: number) => clock.setJulianDate(jd), [clock]),
    jumpForward: useCallback((days: number) => clock.jumpForward(days), [clock]),
    jumpBackward: useCallback((days: number) => clock.jumpBackward(days), [clock]),
    resetToNow: useCallback(() => clock.resetToNow(), [clock]),
    resetToEpoch: useCallback(() => clock.resetToEpoch(), [clock]),
    getState: useCallback(() => clock.getState(), [clock]),
    subscribe: useCallback((callback: (state: SimulationClockState) => void) => clock.subscribe(callback), [clock]),
  };
}

// Re-export TIME_SPEEDS from the engine
export { TIME_SPEEDS, TIME_SPEED_LABELS } from '../engine/SimulationClock';