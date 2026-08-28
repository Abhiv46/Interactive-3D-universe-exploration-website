import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode, useMemo } from 'react';
import { useCameraControls } from '../../hooks/useCameraControls';
import { useJulianDate, useSimulationControls } from '../../hooks/useSimulationClock';
import { useI18n } from '../../i18n/index';
import { useScale } from '../../context/ScaleContext';
import * as THREE from 'three';
import { BODIES_MAP } from '../../data/bodiesMap';
import { CelestialBodyData } from '../../types/orbitalElements';

// Memoize DEFAULT_STOPS outside the component to avoid recreation

interface TourStop {
  id: string;
  name: string;
  narration: string;
  bodyId: string;
  duration?: number;
  pauseDuration?: number;
  cameraOffset?: THREE.Vector3;
  lookAtOffset?: THREE.Vector3;
}

interface TourContextValue {
  isPlaying: boolean;
  currentStopIndex: number;
  stops: TourStop[];
  startTour: () => void;
  pauseTour: () => void;
  resumeTour: () => void;
  stopTour: () => void;
  nextStop: () => void;
  previousStop: () => void;
  goToStop: (index: number) => void;
  setCurrentStopIndex: (index: number) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

const DEFAULT_STOPS: TourStop[] = [
  {
    id: 'sun',
    name: 'The Sun',
    narration: 'Our star, the Sun, contains 99.8% of the solar system\'s mass. Its gravity holds everything in orbit.',
    bodyId: 'sun',
    duration: 3000,
    pauseDuration: 4000,
  },
  {
    id: 'mercury',
    name: 'Mercury',
    narration: 'Closest to the Sun, Mercury has extreme temperatures from -180°C to 430°C. A year here is just 88 Earth days.',
    bodyId: 'mercury',
    duration: 3000,
    pauseDuration: 3500,
  },
  {
    id: 'venus',
    name: 'Venus',
    narration: 'Earth\'s \'twin\' in size, but with a crushing CO2 atmosphere and surface temperatures hot enough to melt lead.',
    bodyId: 'venus',
    duration: 3000,
    pauseDuration: 3500,
  },
  {
    id: 'earth',
    name: 'Earth',
    narration: 'Our home, the only known world with liquid water on its surface and life. The Moon stabilizes our climate.',
    bodyId: 'earth',
    duration: 3000,
    pauseDuration: 4000,
  },
  {
    id: 'mars',
    name: 'Mars',
    narration: 'The Red Planet, once wet and warm. Now a cold desert with the largest volcano and canyon in the solar system.',
    bodyId: 'mars',
    duration: 3000,
    pauseDuration: 3500,
  },
  {
    id: 'asteroidBelt',
    name: 'Asteroid Belt',
    narration: 'Between Mars and Jupiter, millions of rocky remnants from the solar system\'s formation orbit the Sun.',
    bodyId: 'ceres',
    duration: 4000,
    pauseDuration: 3000,
    cameraOffset: new THREE.Vector3(0, 50000000, 50000000),
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    narration: 'The king of planets. Its Great Red Spot is a storm larger than Earth, raging for at least 350 years.',
    bodyId: 'jupiter',
    duration: 3000,
    pauseDuration: 4000,
  },
  {
    id: 'saturn',
    name: 'Saturn',
    narration: 'Famous for its spectacular rings made of ice and rock. Saturn could float in water—it\'s less dense than water!',
    bodyId: 'saturn',
    duration: 3000,
    pauseDuration: 4000,
  },
  {
    id: 'uranus',
    name: 'Uranus',
    narration: 'An ice giant tilted on its side, rolling through the solar system. Its blue-green color comes from methane.',
    bodyId: 'uranus',
    duration: 3000,
    pauseDuration: 3500,
  },
  {
    id: 'neptune',
    name: 'Neptune',
    narration: 'The windiest world, with supersonic winds over 2,000 km/h. Its deep blue hides a hot, dense core.',
    bodyId: 'neptune',
    duration: 3000,
    pauseDuration: 3500,
  },
  {
    id: 'edgeOfSolarSystem',
    name: 'Edge of the Solar System',
    narration: 'Beyond Neptune lies the Kuiper Belt and the heliopause—where the Sun\'s influence ends and interstellar space begins.',
    bodyId: 'pluto',
    duration: 5000,
    pauseDuration: 3000,
    cameraOffset: new THREE.Vector3(0, 100000000000, 100000000000),
  },
  {
    id: 'milkyWay',
    name: 'The Milky Way',
    narration: 'Our home galaxy, a barred spiral of 100–400 billion stars. We\'re in the Orion Arm, 27,000 light-years from the center.',
    bodyId: 'sun',
    duration: 5000,
    pauseDuration: 3000,
    cameraOffset: new THREE.Vector3(0, 5000000000000, 5000000000000),
  },
];

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const { flyTo, getControls } = useCameraControls();
  const julianDate = useJulianDate();
  const { setSpeed } = useSimulationControls();
  const { trueScale, setTrueScale } = useScale();
  const { t } = useI18n();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [stops] = useState<TourStop[]>(DEFAULT_STOPS);
  const animationRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // Memoize localized stops - only recompute when stops or t function changes
  const localizedStops = useMemo((): TourStop[] => {
    return stops.map(stop => ({
      ...stop,
      name: t(`tour.stops.${stop.id}.name`),
      narration: t(`tour.stops.${stop.id}.narration`),
    }));
  }, [stops, t]);

  const clearAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, []);

  const flyToStop = useCallback(async (stop: TourStop, duration: number) => {
    const controls = getControls();
    if (!controls) return;

    const body = BODIES_MAP.get(stop.bodyId);
    if (!body) return;

    // For the Milky Way stop, we need to enable true scale and zoom out
    if (stop.id === 'milkyWay' || stop.id === 'edgeOfSolarSystem') {
      setTrueScale(true);
    }

    return new Promise<void>((resolve) => {
      flyTo(body, duration);

      // Wait for the flyTo animation to complete
      const checkComplete = () => {
        const camera = controls.object;
        if (!camera) {
          resolve();
          return;
        }

        const targetPos = controls.target.clone();
        const distance = camera.position.distanceTo(targetPos);

        // Check if we're close enough to target
        if (distance < 100) {
          resolve();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };

      requestAnimationFrame(checkComplete);
    });
  }, [flyTo, getControls, setTrueScale]);

  const playStop = useCallback(async (index: number) => {
    if (index >= stops.length) {
      setIsPlaying(false);
      setCurrentStopIndex(0);
      return;
    }

    if (!isPlaying) return;

    const stop = localizedStops[index];
    setCurrentStopIndex(index);

    // Fly to the stop
    await flyToStop(stop, stop.duration || 3000);

    if (!isPlaying) return;

    // Pause at the stop for narration
    isPausedRef.current = true;
    pauseTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying && !isPausedRef.current) return;
      isPausedRef.current = false;
      playStop(index + 1);
    }, stop.pauseDuration || 3000);
  }, [isPlaying, stops, localizedStops, flyToStop]);

  const startTour = useCallback(() => {
    setCurrentStopIndex(0);
    setIsPlaying(true);
    playStop(0);
  }, [playStop]);

  const pauseTour = useCallback(() => {
    setIsPlaying(false);
    isPausedRef.current = true;
    clearAnimation();
  }, [clearAnimation]);

  const resumeTour = useCallback(() => {
    if (isPausedRef.current && currentStopIndex < stops.length) {
      setIsPlaying(true);
      isPausedRef.current = false;
      playStop(currentStopIndex + 1);
    }
  }, [currentStopIndex, playStop]);

  const stopTour = useCallback(() => {
    setIsPlaying(false);
    setCurrentStopIndex(0);
    clearAnimation();
    isPausedRef.current = false;
    // Reset to default view
    setTrueScale(false);
  }, [clearAnimation, setTrueScale]);

  const nextStop = useCallback(() => {
    if (currentStopIndex < stops.length - 1) {
      clearAnimation();
      playStop(currentStopIndex + 1);
    }
  }, [currentStopIndex, stops.length, playStop, clearAnimation]);

  const previousStop = useCallback(() => {
    if (currentStopIndex > 0) {
      clearAnimation();
      playStop(currentStopIndex - 1);
    }
  }, [currentStopIndex, playStop, clearAnimation]);

  const goToStop = useCallback((index: number) => {
    if (index >= 0 && index < stops.length) {
      clearAnimation();
      setCurrentStopIndex(index);
      playStop(index);
    }
  }, [stops.length, playStop, clearAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAnimation();
  }, [clearAnimation]);

  const value: TourContextValue = {
    isPlaying,
    currentStopIndex,
    stops: localizedStops,
    startTour,
    pauseTour,
    resumeTour,
    stopTour,
    nextStop,
    previousStop,
    goToStop,
    setCurrentStopIndex,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}