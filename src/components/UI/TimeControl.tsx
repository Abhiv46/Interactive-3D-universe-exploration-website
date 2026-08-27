import { useState, useEffect, useRef } from 'react';
import { SimulationClockState, SimulationClockControls, PRESET_DATES, TimeSpeed } from '../../engine/SimulationClock';

interface TimeControlProps {
  state: SimulationClockState;
  controls: SimulationClockControls;
}

export function TimeControl({ state, controls }: TimeControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localDate, setLocalDate] = useState(state.date);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Sync local date with simulation clock
  useEffect(() => {
    setLocalDate(state.date);
  }, [state.date]);

  const handleDateChange = (date: Date) => {
    setLocalDate(date);
  };

  const applyDate = () => {
    controls.setDate(localDate);
  };

  const handleSpeedChange = (speed: TimeSpeed) => {
    controls.setSpeed(speed);
  };

  const formatDate = (date: Date): string => {
    return date.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  };

  const formatJulianDate = (jd: number): string => {
    return `JD ${jd.toFixed(5)}`;
  };

  const getSpeedLabel = (speed: TimeSpeed, isRunning: boolean): string => {
    if (speed === 0) return '⏸️ Paused';
    if (!isRunning) return '⏸️ Paused';
    if (speed === 1) return '▶️ 1×';
    if (speed < 1000) return `⏩ ${speed}×`;
    if (speed < 1000000) return `⏩ ${speed / 1000}K×`;
    return `⏩ ${speed / 1000000}M×`;
  };

  return (
    <div className={`time-control ${isExpanded ? 'expanded' : ''}`}>
      {/* Compact View */}
      <div className="time-control-compact" onClick={() => setIsExpanded(true)}>
        <div className="time-display">
          <span className="time-date">{formatDate(state.date)}</span>
          <span className="time-julian">{formatJulianDate(state.julianDate)}</span>
        </div>
        <div className="time-speed-display">
          <span className={`speed-indicator ${state.isRunning ? 'playing' : 'paused'}`}>
            {getSpeedLabel(state.speed, state.isRunning)}
          </span>
        </div>
        <button className="time-expand-btn" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
          ⌄
        </button>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="time-control-expanded glass-panel">
          <div className="time-header">
            <h3>Time Control</h3>
            <button className="time-close" onClick={() => setIsExpanded(false)}>✕</button>
          </div>

          {/* Current Time Display */}
          <div className="time-current">
            <div className="time-field">
              <label>Date (UTC)</label>
              <input
                ref={dateInputRef}
                type="datetime-local"
                value={localDate.toISOString().slice(0, 16)}
                onChange={(e) => handleDateChange(new Date(e.target.value + ':00Z'))}
              />
            </div>
            <div className="time-field">
              <label>Julian Date</label>
              <input
                type="text"
                value={formatJulianDate(state.julianDate)}
                readOnly
              />
            </div>
            <button className="glass-btn primary" onClick={applyDate}>
              Apply Date
            </button>
          </div>

          {/* Play/Pause */}
          <div className="time-playback">
            <button
              className={`glass-btn ${state.isRunning ? 'secondary' : 'primary'} time-play-btn`}
              onClick={state.isRunning ? controls.pause : controls.play}
            >
              {state.isRunning ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button className="glass-btn secondary" onClick={controls.resetToNow}>
              📅 Now
            </button>
            <button className="glass-btn secondary" onClick={controls.resetToEpoch}>
              🔄 J2000.0
            </button>
          </div>

          {/* Speed Control */}
          <div className="time-speed-control">
            <label>Simulation Speed</label>
            <div className="speed-slider-container">
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={TIME_SPEEDS.indexOf(state.speed)}
                onChange={(e) => handleSpeedChange(TIME_SPEEDS[Number(e.target.value)])}
                className="speed-slider"
              />
              <div className="speed-labels">
                {TIME_SPEEDS.map((speed, i) => (
                  <span key={speed} className={i === TIME_SPEEDS.indexOf(state.speed) ? 'active' : ''}>
                    {speed === 0 ? '0' : speed < 1000 ? `${speed}×` : speed < 1000000 ? `${speed/1000}K×` : `${speed/1000000}M×`}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Speed Buttons */}
            <div className="speed-quick">
              {TIME_SPEEDS.map(speed => (
                <button
                  key={speed}
                  className={`speed-quick-btn ${state.speed === speed ? 'active' : ''}`}
                  onClick={() => handleSpeedChange(speed)}
                >
                  {getSpeedLabel(speed, state.isRunning)}
                </button>
              ))}
            </div>
          </div>

          {/* Time Navigation */}
          <div className="time-nav">
            <button className="glass-btn" onClick={() => controls.jumpBackward(86400)} title="Back 1 day">
              ⏪ 1 Day
            </button>
            <button className="glass-btn" onClick={() => controls.jumpBackward(3600)} title="Back 1 hour">
              ⏪ 1 Hour
            </button>
            <button className="glass-btn" onClick={() => controls.jumpForward(3600)} title="Forward 1 hour">
              1 Hour ⏩
            </button>
            <button className="glass-btn" onClick={() => controls.jumpForward(86400)} title="Forward 1 day">
              1 Day ⏩
            </button>
          </div>

          {/* Preset Dates */}
          <div className="time-presets">
            <h4>Historical Events</h4>
            <div className="preset-grid">
              {Object.entries(PRESET_DATES).map(([key, dateFn]) => {
                const date = dateFn();
                return (
                  <button
                    key={key}
                    className={`preset-btn ${state.date.getTime() === date.getTime() ? 'active' : ''}`}
                    onClick={() => controls.setDate(date)}
                    title={key}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for closing expanded view */}
      {isExpanded && (
        <div className="time-control-backdrop" onClick={() => setIsExpanded(false)} />
      )}
    </div>
  );
}

const TIME_SPEEDS: TimeSpeed[] = [0, 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000];