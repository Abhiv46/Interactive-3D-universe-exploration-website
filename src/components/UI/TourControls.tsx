import { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  MapPin,
  Info,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useTour } from './Tour';
import { useI18n } from '../../i18n/index';
import styles from './TourControls.module.css';

export function TourControls() {
  const {
    isPlaying,
    currentStopIndex,
    stops,
    startTour,
    pauseTour,
    resumeTour,
    stopTour,
    nextStop,
    previousStop,
    goToStop,
  } = useTour();

  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNarration, setShowNarration] = useState(true);
  const [muted, setMuted] = useState(false);
  const narrationRef = useRef<HTMLDivElement>(null);

  const currentStop = stops[currentStopIndex];

  // Auto-scroll narration into view
  useEffect(() => {
    if (narrationRef.current && currentStop) {
      narrationRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStopIndex]);

  // Speak narration using Web Speech API
  useEffect(() => {
    if (!muted && currentStop && isPlaying && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(currentStop.narration);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } else if (muted || !isPlaying) {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
      }
    }
  }, [currentStopIndex, isPlaying, muted]);

  const handleStart = () => {
    startTour();
    setIsExpanded(true);
  };

  const handlePause = () => {
    pauseTour();
  };

  const handleResume = () => {
    resumeTour();
  };

  const handleStop = () => {
    stopTour();
    setIsExpanded(false);
  };

  const handleNext = () => {
    nextStop();
  };

  const handlePrevious = () => {
    previousStop();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isExpanded) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (isPlaying) handlePause();
        else handleResume();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNext();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handlePrevious();
        break;
      case 'Escape':
        handleStop();
        break;
      case 'm':
        setMuted(!muted);
        break;
      case 'n':
        setShowNarration(!showNarration);
        break;
    }
  };

  useEffect(() => {
    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, isPlaying]);

  if (!isExpanded && !isPlaying) {
    // Collapsed state - just show start button
    return (
      <div className={styles.container}>
        <button
          className={styles.startButton}
          onClick={handleStart}
          aria-label={t('tour.start')}
          type="button"
        >
          <MapPin size={20} aria-hidden="true" />
          <span>{t('tour.start')}</span>
        </button>
      </div>
    );
  }

  const progress = stops.length > 0 ? ((currentStopIndex + 1) / stops.length) * 100 : 0;

  return (
    <div className={`${styles.container} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.headerLeft}>
          <MapPin size={20} aria-hidden="true" />
          <span className={styles.tourTitle}>{t('tour.title')}</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.progressBar} role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>
            {t('tour.stopTitle', { current: currentStopIndex + 1, total: stops.length })}
          </span>
          <button
            className={styles.toggleButton}
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
            type="button"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            className={styles.closeButton}
            onClick={handleStop}
            aria-label={t('tour.stop')}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles.content}>
          {/* Current Stop Card */}
          <div className={styles.currentStopCard}>
            <div className={styles.stopNumber}>
              <span className={styles.stopLabel}>{t('tour.stops').toUpperCase()}</span>
              <span className={styles.stopIndex}>{currentStopIndex + 1} / {stops.length}</span>
            </div>
            <h3 className={styles.stopName}>{currentStop?.name}</h3>

            {showNarration && currentStop && (
              <div ref={narrationRef} className={styles.narration} role="region" aria-live="polite" aria-label={t('tour.narration')}>
                <p>{currentStop.narration}</p>
              </div>
            )}

            <div className={styles.stopActions}>
              <button
                className={`${styles.actionButton} ${styles.narrationToggle}`}
                onClick={() => setShowNarration(!showNarration)}
                aria-pressed={showNarration}
                aria-label={showNarration ? 'Hide narration' : 'Show narration'}
                type="button"
              >
                <Info size={16} aria-hidden="true" />
                <span>{showNarration ? 'Hide' : 'Show'} Narration</span>
              </button>
              <button
                className={`${styles.actionButton} ${styles.muteToggle}`}
                onClick={() => setMuted(!muted)}
                aria-pressed={muted}
                aria-label={muted ? 'Unmute' : 'Mute'}
                type="button"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{muted ? 'Unmute' : 'Mute'}</span>
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <button
              className={`${styles.controlButton} ${styles.prevButton}`}
              onClick={handlePrevious}
              disabled={currentStopIndex === 0}
              aria-label={t('tour.previous')}
              type="button"
            >
              <SkipBack size={20} aria-hidden="true" />
            </button>

            <button
              className={`${styles.controlButton} ${styles.playPauseButton} ${isPlaying ? styles.playing : ''}`}
              onClick={isPlaying ? handlePause : handleResume}
              aria-label={isPlaying ? t('tour.pause') : t('tour.resume')}
              type="button"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              className={`${styles.controlButton} ${styles.nextButton}`}
              onClick={handleNext}
              disabled={currentStopIndex === stops.length - 1}
              aria-label={t('tour.next')}
              type="button"
            >
              <SkipForward size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Stop List */}
          <div className={styles.stopList}>
            <h4 className={styles.stopListTitle}>{t('tour.stops')}</h4>
            <ul className={styles.stopListItems}>
              {stops.map((stop, index) => (
                <li key={stop.id} className={`${styles.stopListItem} ${index === currentStopIndex ? styles.active : ''} ${index < currentStopIndex ? styles.completed : ''}`}>
                  <button
                    className={styles.stopListButton}
                    onClick={() => goToStop(index)}
                    aria-current={index === currentStopIndex ? 'step' : undefined}
                    type="button"
                  >
                    <span className={styles.stopListIndex}>
                      {index < currentStopIndex ? (
                        <span className={styles.checkIcon}>✓</span>
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className={styles.stopListName}>{stop.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}