import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useI18n } from '../i18n/index';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

interface AchievementsContextValue {
  achievements: Achievement[];
  unlockAchievement: (id: string) => boolean;
  isUnlocked: (id: string) => boolean;
  getProgress: () => { unlocked: number; total: number };
  resetAchievements: () => void;
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null);

const STORAGE_KEY = 'universe-explorer-achievements';

const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
  {
    id: 'visitedAllPlanets',
    name: 'Solar System Explorer',
    description: 'Visited all 8 planets',
    icon: '🪐',
  },
  {
    id: 'foundAndromeda',
    name: 'Galaxy Hunter',
    description: 'Found the Andromeda Galaxy',
    icon: '🌌',
  },
  {
    id: 'timeTraveler100',
    name: 'Time Traveler',
    description: 'Traveled through time 100 years',
    icon: '⏳',
  },
  {
    id: 'screenshotTaken',
    name: 'Photographer',
    description: 'Took your first screenshot',
    icon: '📸',
  },
  {
    id: 'sharedView',
    name: 'Sharer',
    description: 'Shared a view with a friend',
    icon: '🔗',
  },
  {
    id: 'completedTour',
    name: 'Tourist',
    description: 'Completed the guided tour',
    icon: '🗺️',
  },
  {
    id: 'visitedISS',
    name: 'Space Station Visitor',
    description: 'Tracked the ISS in real-time',
    icon: '🛰️',
  },
  {
    id: 'witnessedEclipse',
    name: 'Eclipse Chaser',
    description: 'Witnessed a solar eclipse',
    icon: '🌑',
  },
  {
    id: 'sawAurora',
    name: 'Aurora Watcher',
    description: 'Saw the aurora at Earth\'s poles',
    icon: '💚',
  },
  {
    id: 'deepSpaceZoom',
    name: 'Deep Space Explorer',
    description: 'Zoomed to the Milky Way view',
    icon: '✨',
  },
];

export function AchievementsProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return DEFAULT_ACHIEVEMENTS.map(def => {
            const storedAch = parsed.find((a: Achievement) => a.id === def.id);
            return storedAch ? { ...def, ...storedAch } : { ...def, unlocked: false };
          });
        }
      } catch (e) {
        console.warn('Failed to load achievements from localStorage:', e);
      }
    }
    return DEFAULT_ACHIEVEMENTS.map(def => ({ ...def, unlocked: false }));
  });

  // Save to localStorage whenever achievements change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
      } catch (e) {
        console.warn('Failed to save achievements to localStorage:', e);
      }
    }
  }, [achievements]);

  // Localize achievement names and descriptions
  const localizedAchievements = achievements.map(ach => ({
    ...ach,
    name: t(`achievements.list.${ach.id}.name`),
    description: t(`achievements.list.${ach.id}.description`),
  }));

  const unlockAchievement = useCallback((id: string): boolean => {
    setAchievements(prev => {
      const existing = prev.find(a => a.id === id);
      if (existing?.unlocked) return prev;

      return prev.map(a => a.id === id
        ? { ...a, unlocked: true, unlockedAt: Date.now() }
        : a
      );
    });
    return true;
  }, []);

  const isUnlocked = useCallback((id: string): boolean => {
    return achievements.find(a => a.id === id)?.unlocked ?? false;
  }, [achievements]);

  const getProgress = useCallback(() => {
    const unlocked = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;
    return { unlocked, total };
  }, [achievements]);

  const resetAchievements = useCallback(() => {
    setAchievements(DEFAULT_ACHIEVEMENTS.map(def => ({ ...def, unlocked: false })));
  }, []);

  const value: AchievementsContextValue = {
    achievements: localizedAchievements,
    unlockAchievement,
    isUnlocked,
    getProgress,
    resetAchievements,
  };

  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementsProvider');
  }
  return context;
}