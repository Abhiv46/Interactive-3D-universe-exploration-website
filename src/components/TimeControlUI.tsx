import { useState, useContext, createContext, useCallback } from 'react';
import { useSimulationClock, TIME_SPEEDS } from '../hooks/useSimulationClock';
import { useScale } from '../context/ScaleContext';

// Context for star field controls
interface StarFieldControlsContextValue {
  showConstellations: boolean;
  toggleConstellations: () => void;
  starMagnitudeLimit: number;
  setStarMagnitudeLimit: (limit: number) => void;
}

const StarFieldControlsContext = createContext<StarFieldControlsContextValue | null>(null);

export function useStarFieldControls() {
  const context = useContext(StarFieldControlsContext);
  if (!context) {
    throw new Error('useStarFieldControls must be used within StarFieldControlsProvider');
  }
  return context;
}

interface StarFieldControlsProviderProps {
  children: React.ReactNode;
}

export function StarFieldControlsProvider({ children }: StarFieldControlsProviderProps) {
  const [showConstellations, setShowConstellations] = useState(false);
  const [starMagnitudeLimit, setStarMagnitudeLimit] = useState(6.5);

  const toggleConstellations = useCallback(() => {
    setShowConstellations(prev => !prev);
  }, []);

  const value: StarFieldControlsContextValue = {
    showConstellations,
    toggleConstellations,
    starMagnitudeLimit,
    setStarMagnitudeLimit,
  };

  return (
    <StarFieldControlsContext.Provider value={value}>
      {children}
    </StarFieldControlsContext.Provider>
  );
}

export function TimeControlUI() {
  const {
    julianDate,
    date,
    speed,
    isRunning,
    play,
    pause,
    setSpeed,
    resetToNow,
    resetToEpoch,
  } = useSimulationClock();

  const { trueScale, toggleScale } = useScale();
  const { showConstellations, toggleConstellations, starMagnitudeLimit, setStarMagnitudeLimit } = useStarFieldControls();

  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (date: Date): string => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const formatJulianDate = (jd: number): string => {
    return `JD ${jd.toFixed(5)}`;
  };

  const getSpeedLabel = (s: number, running: boolean): string => {
    if (s === 0) return '⏸ Paused';
    if (!running) return '⏸ Paused';
    if (s === 1) return '▶ 1×';
    if (s < 1000) return `⏩ ${s}×`;
    if (s < 1000000) return `⏩ ${s / 1000}K×`;
    return `⏩ ${s / 1000000}M×`;
  };

  return (
    <div className={`time-control-ui ${isExpanded ? 'expanded' : ''}`}>
      {/* Compact View */}
      <div className="time-control-compact" onClick={() => setIsExpanded(true)}>
        <div className="time-display">
          <span className="time-date">{formatDate(date)}</span>
          <span className="time-julian">{formatJulianDate(julianDate)}</span>
        </div>
        <div className="time-speed-display">
          <span className={`speed-indicator ${isRunning ? 'playing' : 'paused'}`}>
            {getSpeedLabel(speed, isRunning)}
          </span>
        </div>
        <button className="time-expand-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
          ⌄
        </button>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="time-control-expanded">
          <div className="time-header">
            <h3>Time Control</h3>
            <button className="time-close" onClick={() => setIsExpanded(false)}>✕</button>
          </div>

          {/* Scale Toggle */}
          <div className="time-scale-control">
            <label className="scale-toggle">
              <input
                type="checkbox"
                checked={trueScale}
                onChange={(e) => toggleScale()}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {trueScale ? '📏 True Scale' : '🔍 Visual Scale'}
              </span>
            </label>
            <p className="scale-hint">
              {trueScale
                ? 'Real physical sizes and distances (planets nearly invisible)'
                : 'Enlarged planet sizes for visibility'}
            </p>
          </div>

          {/* Play/Pause/Reset */}
          <div className="time-playback">
            <button
              className={`btn ${isRunning ? 'secondary' : 'primary'}`}
              onClick={isRunning ? pause : play}
            >
              {isRunning ? '⏸ Pause' : '▶ Play'}
            </button>
            <button className="btn secondary" onClick={resetToNow}>📅 Now</button>
            <button className="btn secondary" onClick={resetToEpoch}>🔄 J2000</button>
          </div>

          {/* Speed Slider */}
          <div className="time-speed-control">
            <label>Speed: {getSpeedLabel(speed, isRunning)}</label>
            <input
              type="range"
              min="0"
              max={TIME_SPEEDS.length - 1}
              step="1"
              value={TIME_SPEEDS.indexOf(speed)}
              onChange={(e) => setSpeed(TIME_SPEEDS[Number(e.target.value)])}
              className="speed-slider"
            />
            <div className="speed-labels">
              {TIME_SPEEDS.map((s, i) => (
                <span key={s} className={i === TIME_SPEEDS.indexOf(speed) ? 'active' : ''}>
                  {s === 0 ? '0' : s < 1000 ? `${s}×` : s < 1000000 ? `${s/1000}K×` : `${s/1000000}M×`}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Speed Buttons */}
          <div className="speed-quick">
            {TIME_SPEEDS.map(s => (
              <button
                key={s}
                className={`btn ${speed === s ? 'primary' : 'secondary'}`}
                onClick={() => setSpeed(s)}
              >
                {getSpeedLabel(s, isRunning)}
              </button>
            ))}
          </div>

          {/* Star Field Controls */}
          <div className="time-starfield-control">
            <h4>Background Stars</h4>
            <label className="scale-toggle">
              <input
                type="checkbox"
                checked={showConstellations}
                onChange={toggleConstellations}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {showConstellations ? '✦ Constellations On' : '✧ Constellations Off'}
              </span>
            </label>
            <div className="magnitude-control">
              <label>Magnitude Limit: {starMagnitudeLimit.toFixed(1)}</label>
              <input
                type="range"
                min="2"
                max="8"
                step="0.5"
                value={starMagnitudeLimit}
                onChange={(e) => setStarMagnitudeLimit(Number(e.target.value))}
                className="speed-slider"
              />
              <p className="scale-hint">
                {starMagnitudeLimit <= 3 ? 'Bright stars only' : starMagnitudeLimit <= 5 ? 'Naked eye visible' : 'Includes faint stars'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="time-control-backdrop" onClick={() => setIsExpanded(false)} />
      )}
    </div>
  );
}