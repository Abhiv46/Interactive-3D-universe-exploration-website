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

export function useJulianDate(): number {
  const { julianDate } = useSimulationClock();
  return julianDate;
}

export function useTimeSpeed(): TimeSpeed {
  const { speed } = useSimulationClock();
  return speed;
}

export function useSimulationTime(): Date {
  const { date } = useSimulationClock();
  return date;
}

export function useSimulationPlaying(): boolean {
  const { isRunning } = useSimulationClock();
  return isRunning;
}

// Re-export TIME_SPEEDS from the engine
export { TIME_SPEEDS, TIME_SPEED_LABELS } from '../engine/SimulationClock';