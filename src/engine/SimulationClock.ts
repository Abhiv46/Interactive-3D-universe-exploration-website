/**
 * Simulation Clock - Time engine for universe simulation
 * Supports real-time, accelerated time (1x to 10,000,000x), pause, and date seeking
 */

import { J2000_EPOCH, J2000_UNIX_TIME, SECONDS_PER_DAY } from './Constants';

export type TimeSpeed = 0 | 1 | 10 | 100 | 1000 | 10000 | 100000 | 1000000 | 10000000;

export const TIME_SPEEDS: TimeSpeed[] = [0, 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];

export const TIME_SPEED_LABELS: Record<TimeSpeed, string> = {
  0: 'PAUSED',
  1: '1× (Real-time)',
  10: '10×',
  100: '100×',
  1000: '1,000×',
  10000: '10,000×',
  100000: '100,000×',
  1000000: '1,000,000×',
  10000000: '10,000,000×',
};

export interface SimulationClockState {
  /** Current simulation time in Julian Date */
  julianDate: number;
  /** Current simulation time as Date */
  date: Date;
  /** Time speed multiplier */
  speed: TimeSpeed;
  /** Whether simulation is running */
  isRunning: boolean;
  /** Real time when last updated (for delta calculation) */
  lastRealTime: number;
  /** Accumulated simulation time offset */
  timeOffset: number;
}

export interface SimulationClockControls {
  /** Play the simulation */
  play: () => void;
  /** Pause the simulation */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Set time speed */
  setSpeed: (speed: TimeSpeed) => void;
  /** Increase speed to next preset */
  speedUp: () => void;
  /** Decrease speed to previous preset */
  speedDown: () => void;
  /** Set simulation to specific date */
  setDate: (date: Date | number) => void;
  /** Set simulation to specific Julian Date */
  setJulianDate: (jd: number) => void;
  /** Jump forward by specified days */
  jumpForward: (days: number) => void;
  /** Jump backward by specified days */
  jumpBackward: (days: number) => void;
  /** Reset to current real time */
  resetToNow: () => void;
  /** Reset to J2000 epoch */
  resetToEpoch: () => void;
  /** Get current state */
  getState: () => SimulationClockState;
  /** Subscribe to state changes */
  subscribe: (callback: (state: SimulationClockState) => void) => () => void;
}

type Subscriber = (state: SimulationClockState) => void;

class SimulationClockImpl implements SimulationClockControls {
  private state: SimulationClockState;
  private subscribers: Set<Subscriber> = new Set();
  private animationFrame: number | null = null;
  private lastFrameTime: number = 0;

  constructor(initialJD?: number) {
    const now = initialJD ?? this.nowToJD();
    this.state = {
      julianDate: now,
      date: SimulationClockImpl.jdToDate(now),
      speed: 1,
      isRunning: true,
      lastRealTime: performance.now(),
      timeOffset: 0,
    };
    this.startLoop();
  }

  private nowToJD(): number {
    return J2000_EPOCH + (Date.now() - J2000_UNIX_TIME) / (SECONDS_PER_DAY * 1000);
  }

  static jdToDate(jd: number): Date {
    const daysSinceJ2000 = jd - J2000_EPOCH;
    const msSinceJ2000 = daysSinceJ2000 * SECONDS_PER_DAY * 1000;
    return new Date(J2000_UNIX_TIME + msSinceJ2000);
  }

  
  private notify(): void {
    const state = { ...this.state };
    this.subscribers.forEach(cb => cb(state));
  }

  private startLoop(): void {
    const loop = (currentTime: number) => {
      if (this.state.isRunning && this.state.speed > 0) {
        const realDelta = (currentTime - this.state.lastRealTime) / 1000; // seconds
        const simDelta = realDelta * this.state.speed; // simulation seconds
        const jdDelta = simDelta / SECONDS_PER_DAY; // Julian days

        this.state.julianDate += jdDelta;
        this.state.date = SimulationClockImpl.jdToDate(this.state.julianDate);
        this.state.lastRealTime = currentTime;
        this.notify();
      } else if (this.state.isRunning && this.state.speed === 0) {
        // Paused but running - just update lastRealTime to prevent jump on resume
        this.state.lastRealTime = currentTime;
      }

      this.lastFrameTime = currentTime;
      this.animationFrame = requestAnimationFrame(loop);
    };

    this.animationFrame = requestAnimationFrame(loop);
  }

  private stopLoop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Public API
  play(): void {
    if (!this.state.isRunning) {
      this.state.isRunning = true;
      this.state.lastRealTime = performance.now();
      this.notify();
    }
  }

  pause(): void {
    if (this.state.isRunning) {
      this.state.isRunning = false;
      this.notify();
    }
  }

  toggle(): void {
    if (this.state.isRunning) {
      this.pause();
    } else {
      this.play();
    }
  }

  setSpeed(speed: TimeSpeed): void {
    if (TIME_SPEEDS.includes(speed)) {
      // Adjust timeOffset to prevent jump when changing speed
      if (this.state.isRunning) {
        const now = performance.now();
        const realDelta = (now - this.state.lastRealTime) / 1000;
        const simDelta = realDelta * this.state.speed;
        this.state.timeOffset += simDelta;
        this.state.lastRealTime = now;
      }
      this.state.speed = speed;
      this.notify();
    }
  }

  speedUp(): void {
    const currentIndex = TIME_SPEEDS.indexOf(this.state.speed);
    if (currentIndex < TIME_SPEEDS.length - 1) {
      this.setSpeed(TIME_SPEEDS[currentIndex + 1]);
    }
  }

  speedDown(): void {
    const currentIndex = TIME_SPEEDS.indexOf(this.state.speed);
    if (currentIndex > 0) {
      this.setSpeed(TIME_SPEEDS[currentIndex - 1]);
    }
  }

  setDate(date: Date | number): void {
    const jd = typeof date === 'number' ? date : this.dateToJD(date);
    this.setJulianDate(jd);
  }

  setJulianDate(jd: number): void {
    this.state.julianDate = jd;
    this.state.date = SimulationClockImpl.jdToDate(jd);
    this.state.lastRealTime = performance.now();
    this.notify();
  }

  dateToJD(date: Date): number {
    return J2000_EPOCH + (date.getTime() - J2000_UNIX_TIME) / (SECONDS_PER_DAY * 1000);
  }

  jumpForward(days: number): void {
    this.state.julianDate += days;
    this.state.date = SimulationClockImpl.jdToDate(this.state.julianDate);
    this.notify();
  }

  jumpBackward(days: number): void {
    this.jumpForward(-days);
  }

  resetToNow(): void {
    const now = this.nowToJD();
    this.setJulianDate(now);
  }

  resetToEpoch(): void {
    this.setJulianDate(J2000_EPOCH);
  }

  getState(): SimulationClockState {
    return { ...this.state };
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current state
    callback(this.getState());
    return () => this.subscribers.delete(callback);
  }

  destroy(): void {
    this.stopLoop();
    this.subscribers.clear();
  }
}

// Singleton instance
let instance: SimulationClockImpl | null = null;

export function createSimulationClock(initialJD?: number): SimulationClockControls {
  if (!instance) {
    instance = new SimulationClockImpl(initialJD);
  }
  return instance;
}

export function getSimulationClock(): SimulationClockControls | null {
  return instance;
}

export function destroySimulationClock(): void {
  if (instance) {
    instance.destroy();
    instance = null;
  }
}

// React hook for using the simulation clock
import { useSyncExternalStore, useCallback } from 'react';

export function useSimulationClock(): SimulationClockState & SimulationClockControls {
  const clock = getSimulationClock() ?? createSimulationClock();

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

// Preset dates for quick navigation
export const PRESET_DATES = {
  NOW: () => new Date(),
  J2000: () => new Date(J2000_UNIX_TIME),
  APOLLO_11_LAUNCH: () => new Date('1969-07-16T13:32:00Z'),
  APOLLO_11_LANDING: () => new Date('1969-07-20T20:17:40Z'),
  VOYAGER_1_LAUNCH: () => new Date('1977-09-05T12:56:00Z'),
  VOYAGER_2_LAUNCH: () => new Date('1977-08-20T14:29:00Z'),
  CASSINI_ARRIVAL: () => new Date('2004-07-01T02:48:00Z'),
  NEW_HORIZONS_PLUTO: () => new Date('2015-07-14T11:49:00Z'),
  PARKER_SOLAR_PROBE: () => new Date('2018-08-12T07:31:00Z'),
  JWST_LAUNCH: () => new Date('2021-12-25T12:20:00Z'),
  VERNAL_EQUINOX_2024: () => new Date('2024-03-20T03:06:00Z'),
  SUMMER_SOLSTICE_2024: () => new Date('2024-06-20T20:50:00Z'),
  AUTUMN_EQUINOX_2024: () => new Date('2024-09-22T12:43:00Z'),
  WINTER_SOLSTICE_2024: () => new Date('2024-12-21T09:20:00Z'),
} as const;

export type PresetDateKey = keyof typeof PRESET_DATES;

export function getPresetDate(key: PresetDateKey): Date {
  return PRESET_DATES[key]();
}

export function formatJulianDate(jd: number): string {
  const date = SimulationClockImpl.jdToDate(jd);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

export function formatDateForDisplay(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }) + ' UTC';
}