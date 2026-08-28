import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Lock, Award, X } from 'lucide-react';
import { useAchievements } from '@/context/AchievementsContext';
import { useI18n } from '@/i18n/index';
import styles from './AchievementsPanel.module.css';

export function AchievementsPanel() {
  const { achievements, getProgress } = useAchievements();
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const { unlocked, total } = getProgress();
  const progressPercent = total > 0 ? (unlocked / total) * 100 : 0;

  const filteredAchievements = achievements.filter(ach => {
    if (filter === 'unlocked') return ach.unlocked;
    if (filter === 'locked') return !ach.unlocked;
    return true;
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isExpanded) return;
    if (e.key === 'Escape') {
      setIsExpanded(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (!isExpanded) {
    return (
      <div className={styles.container}>
        <button
          className={styles.startButton}
          onClick={() => setIsExpanded(true)}
          aria-label={t('achievements.title')}
          type="button"
        >
          <Award size={20} aria-hidden="true" />
          <span>{t('achievements.title')}</span>
          <span className={styles.badge}>{unlocked}/{total}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${styles.expanded}`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Award size={24} aria-hidden="true" />
          <h2 className={styles.title}>{t('achievements.title')}</h2>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar} role="progressbar" aria-valuenow={Math.round(progressPercent)} aria-valuemin={0} aria-valuemax={100} aria-label={t('achievements.progress')}>
              <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <span className={styles.progressText}>
              {t('achievements.unlocked', { count: unlocked, total })}
            </span>
          </div>
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded(false)}
            aria-label={t('common.collapse')}
            type="button"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className={styles.filters} role="tablist" aria-label={t('achievements.filter')}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
          role="tab"
          aria-selected={filter === 'all'}
          type="button"
        >
          {t('achievements.filter.all')}
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'unlocked' ? styles.active : ''}`}
          onClick={() => setFilter('unlocked')}
          role="tab"
          aria-selected={filter === 'unlocked'}
          type="button"
        >
          {t('achievements.filter.unlocked')} ({achievements.filter(a => a.unlocked).length})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'locked' ? styles.active : ''}`}
          onClick={() => setFilter('locked')}
          role="tab"
          aria-selected={filter === 'locked'}
          type="button"
        >
          {t('achievements.filter.locked')} ({achievements.filter(a => !a.unlocked).length})
        </button>
      </div>

      <div className={styles.content}>
        {filteredAchievements.length === 0 ? (
          <div className={styles.empty}>
            <Lock size={32} aria-hidden="true" />
            <p>{t('achievements.empty.' + filter)}</p>
          </div>
        ) : (
          <ul className={styles.list} role="list">
            {filteredAchievements.map(ach => (
              <li key={ach.id} className={`${styles.item} ${ach.unlocked ? styles.unlocked : styles.locked}`}>
                <div className={styles.iconWrapper}>
                  <span className={styles.icon} aria-hidden="true">{ach.icon}</span>
                  {!ach.unlocked && <Lock className={styles.lockIcon} size={16} aria-hidden="true" />}
                </div>
                <div className={styles.info}>
                  <h3 className={styles.name}>{ach.name}</h3>
                  <p className={styles.description}>{ach.description}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <span className={styles.unlockedAt}>
                      {t('achievements.unlockedAt', { date: new Date(ach.unlockedAt).toLocaleDateString() })}
                    </span>
                  )}
                </div>
                <div className={styles.status}>
                  {ach.unlocked ? (
                    <span className={styles.unlockedBadge}>{t('achievements.unlocked')}</span>
                  ) : (
                    <span className={styles.lockedBadge}>{t('achievements.locked')}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}