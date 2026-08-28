import { useState, useEffect, useRef } from 'react';
import { useSimulationClock } from '../../hooks/useSimulationClock';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { TimeSpeed } from '../../engine/SimulationClock';
import { useSettings } from '@/context/SettingsContext';
import { useFocusTrap, generateId } from '@/hooks/useAccessibility';
import { trackEvent, ANALYTICS_EVENTS, trackSettingsChange } from '@/lib/analytics';

export function SettingsPanel() {
  const { settings, setSettings, resetToDefaults } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const clockState = useSimulationClock();
  const clockControls = clockState;
  const { state: audioState, toggleAudio, setMasterGain } = useAudioEngine();

  // Focus trap for accessibility
  const panelRef = useFocusTrap(isOpen);

  // Tab IDs for ARIA
  const tabIds = {
    display: generateId('tab-display'),
    camera: generateId('tab-camera'),
    audio: generateId('tab-audio'),
    quality: generateId('tab-quality'),
    time: generateId('tab-time'),
  };

  const panelIds = {
    display: generateId('panel-display'),
    camera: generateId('panel-camera'),
    audio: generateId('panel-audio'),
    quality: generateId('panel-quality'),
    time: generateId('panel-time'),
  };

  // Sync time speed with simulation clock
  useEffect(() => {
    setSettings({ timeSpeed: clockState.speed });
  }, [clockState.speed, setSettings]);

  const handleTimeSpeedChange = (speed: number) => {
    clockControls.setSpeed(speed as TimeSpeed);
    setSettings({ timeSpeed: speed });
    trackSettingsChange('timeSpeed', speed);
    trackEvent(ANALYTICS_EVENTS.TIME_CONTROL_USED, { speed });
  };

  const formatTimeSpeed = (speed: number): string => {
    if (speed === 0) return 'Paused';
    if (speed < 1000) return `${speed}×`;
    if (speed < 1000000) return `${speed / 1000}K×`;
    return `${speed / 1000000}M×`;
  };

  const [activeTab, setActiveTab] = useState('display');

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    const tabOrder = tabs.map(t => t.id);
    const currentIndex = tabOrder.indexOf(tabId);

    let newIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (currentIndex + 1) % tabOrder.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = tabOrder.length - 1;
        break;
    }

    if (newIndex !== currentIndex) {
      const newTabId = tabOrder[newIndex];
      setActiveTab(newTabId);
      document.getElementById(tabIds[newTabId as keyof typeof tabIds])?.focus();
    }
  };

  const tabs = [
    { id: 'display', label: 'Display', tabId: tabIds.display, panelId: panelIds.display },
    { id: 'camera', label: 'Camera', tabId: tabIds.camera, panelId: panelIds.camera },
    { id: 'audio', label: 'Audio', tabId: tabIds.audio, panelId: panelIds.audio },
    { id: 'quality', label: 'Quality', tabId: tabIds.quality, panelId: panelIds.quality },
    { id: 'time', label: 'Time', tabId: tabIds.time, panelId: panelIds.time },
  ];

  return (
    <div className={`settings-panel ${isOpen ? 'open' : ''}`} ref={panelRef}>
      <button
        className="settings-toggle glass-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close settings' : 'Open settings'}
        aria-expanded={isOpen}
        aria-controls="settings-content"
      >
        ⚙️
      </button>

      <div
        id="settings-content"
        className="settings-content glass-panel panel-responsive"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="settings-header">
          <h2 id="settings-title">Settings</h2>
          <button
            className="settings-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div
          className="settings-tabs"
          role="tablist"
          aria-label="Settings categories"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={tab.tabId}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              data-tab={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={tab.panelId}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-panels">
          {/* Display Panel */}
          <div
            id={panelIds.display}
            className={`settings-panel-content ${activeTab === 'display' ? 'active' : ''}`}
            data-panel="display"
            role="tabpanel"
            aria-labelledby={tabIds.display}
            hidden={activeTab !== 'display'}
          >
            <div className="setting-group">
              <h3>Celestial Objects</h3>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showOrbits}
                  onChange={() => {
                    const value = !settings.showOrbits;
                    setSettings({ showOrbits: value });
                    trackSettingsChange('showOrbits', value);
                  }}
                />
                <span>Show Orbit Lines</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showLabels}
                  onChange={() => {
                    const value = !settings.showLabels;
                    setSettings({ showLabels: value });
                    trackSettingsChange('showLabels', value);
                  }}
                />
                <span>Show Labels</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showConstellations}
                  onChange={() => {
                    const value = !settings.showConstellations;
                    setSettings({ showConstellations: value });
                    trackSettingsChange('showConstellations', value);
                  }}
                />
                <span>Show Constellations</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showMilkyWay}
                  onChange={() => {
                    const value = !settings.showMilkyWay;
                    setSettings({ showMilkyWay: value });
                    trackSettingsChange('showMilkyWay', value);
                  }}
                />
                <span>Show Milky Way</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showAsteroidBelt}
                  onChange={() => {
                    const value = !settings.showAsteroidBelt;
                    setSettings({ showAsteroidBelt: value });
                    trackSettingsChange('showAsteroidBelt', value);
                  }}
                />
                <span>Show Asteroid Belt</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showKuiperBelt}
                  onChange={() => {
                    const value = !settings.showKuiperBelt;
                    setSettings({ showKuiperBelt: value });
                    trackSettingsChange('showKuiperBelt', value);
                  }}
                />
                <span>Show Kuiper Belt</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showComets}
                  onChange={() => {
                    const value = !settings.showComets;
                    setSettings({ showComets: value });
                    trackSettingsChange('showComets', value);
                  }}
                />
                <span>Show Comets</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showISS}
                  onChange={() => {
                    const value = !settings.showISS;
                    setSettings({ showISS: value });
                    trackSettingsChange('showISS', value);
                    trackEvent(ANALYTICS_EVENTS.ISS_TRACKED, { enabled: value });
                  }}
                />
                <span>Show ISS Tracker (Live)</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.showAurora}
                  onChange={() => {
                    const value = !settings.showAurora;
                    setSettings({ showAurora: value });
                    trackSettingsChange('showAurora', value);
                    trackEvent(ANALYTICS_EVENTS.AURORA_VIEWED, { enabled: value });
                  }}
                />
                <span>Show Aurora Effect</span>
              </label>
            </div>

            <div className="setting-group">
              <h3>Scale</h3>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.trueScale}
                  onChange={() => {
                    const value = !settings.trueScale;
                    setSettings({ trueScale: value });
                    trackSettingsChange('trueScale', value);
                  }}
                />
                <span>True Scale (realistic sizes/distances)</span>
              </label>
              <div className="setting-slider">
                <label>Visual Scale Factor: {settings.visualScaleFactor.toLocaleString()}x</label>
                <input
                  type="range"
                  min="100"
                  max="1000000"
                  step="100"
                  value={settings.visualScaleFactor}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ visualScaleFactor: value });
                    trackSettingsChange('visualScaleFactor', value);
                  }}
                  disabled={settings.trueScale}
                />
              </div>
            </div>
          </div>

          {/* Camera Panel */}
          <div
            id={panelIds.camera}
            className={`settings-panel-content ${activeTab === 'camera' ? 'active' : ''}`}
            data-panel="camera"
            role="tabpanel"
            aria-labelledby={tabIds.camera}
            hidden={activeTab !== 'camera'}
          >
            <div className="setting-group">
              <h3>Camera Mode</h3>
              <div className="setting-select">
                <label>Mode</label>
                <select
                  value={settings.cameraMode}
                  onChange={(e) => {
                    const value = e.target.value as 'free' | 'orbit';
                    setSettings({ cameraMode: value });
                    trackSettingsChange('cameraMode', value);
                  }}
                >
                  <option value="free">Free Fly (WASD)</option>
                  <option value="orbit">Orbit Focus (Click to Lock)</option>
                </select>
              </div>
              <div className="setting-slider">
                <label>Camera Speed: {settings.cameraSpeed.toLocaleString()} m/s</label>
                <input
                  type="range"
                  min="100"
                  max="1000000000"
                  step="100"
                  value={settings.cameraSpeed}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ cameraSpeed: value });
                    trackSettingsChange('cameraSpeed', value);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Audio Panel */}
          <div
            id={panelIds.audio}
            className={`settings-panel-content ${activeTab === 'audio' ? 'active' : ''}`}
            data-panel="audio"
            role="tabpanel"
            aria-labelledby={tabIds.audio}
            hidden={activeTab !== 'audio'}
          >
            <div className="setting-group">
              <h3>Audio</h3>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={audioState.enabled}
                  onChange={() => {
                    toggleAudio();
                    trackSettingsChange('audioEnabled', !audioState.enabled);
                  }}
                />
                <span>Enable Spatial Audio</span>
              </label>
              <div className="setting-slider">
                <label>Master Volume: {Math.round(audioState.masterGain * 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={audioState.masterGain}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setMasterGain(value);
                    trackSettingsChange('masterGain', value);
                  }}
                  disabled={!audioState.enabled}
                />
              </div>
              <p className="setting-note">
                🔊 Space is actually silent — these sounds are audio representations of real NASA data (sonifications), not recordings
              </p>
              <div className="audio-status">
                <span className={`status-indicator ${audioState.context?.state === 'running' ? 'running' : 'suspended'}`} />
                <span>Audio Context: {audioState.context?.state || 'unknown'}</span>
              </div>
            </div>
          </div>

          {/* Quality Panel */}
          <div
            id={panelIds.quality}
            className={`settings-panel-content ${activeTab === 'quality' ? 'active' : ''}`}
            data-panel="quality"
            role="tabpanel"
            aria-labelledby={tabIds.quality}
            hidden={activeTab !== 'quality'}
          >
            <div className="setting-group">
              <h3>Quality Preset</h3>
              <div className="setting-select">
                <select
                  value={settings.qualityPreset}
                  onChange={(e) => {
                    const value = e.target.value as 'low' | 'medium' | 'high' | 'ultra';
                    setSettings({ qualityPreset: value });
                    trackSettingsChange('qualityPreset', value);
                  }}
                >
                  <option value="low">Low (Potato)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Default)</option>
                  <option value="ultra">Ultra (RTX 4090)</option>
                </select>
              </div>

              <h3>Rendering</h3>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.enableBloom}
                  onChange={() => {
                    const value = !settings.enableBloom;
                    setSettings({ enableBloom: value });
                    trackSettingsChange('enableBloom', value);
                  }}
                />
                <span>Bloom Effect</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.enableFXAA}
                  onChange={() => {
                    const value = !settings.enableFXAA;
                    setSettings({ enableFXAA: value });
                    trackSettingsChange('enableFXAA', value);
                  }}
                />
                <span>FXAA Anti-aliasing</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.enableGodRays}
                  onChange={() => {
                    const value = !settings.enableGodRays;
                    setSettings({ enableGodRays: value });
                    trackSettingsChange('enableGodRays', value);
                  }}
                />
                <span>God Rays (Volumetric Lighting)</span>
              </label>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.enableVignette}
                  onChange={() => {
                    const value = !settings.enableVignette;
                    setSettings({ enableVignette: value });
                    trackSettingsChange('enableVignette', value);
                  }}
                />
                <span>Vignette</span>
              </label>

              <h3>Bloom Tuning</h3>
              <div className="setting-slider">
                <label>Intensity: {settings.bloomIntensity.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={settings.bloomIntensity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ bloomIntensity: value });
                    trackSettingsChange('bloomIntensity', value);
                  }}
                  disabled={!settings.enableBloom}
                />
              </div>
              <div className="setting-slider">
                <label>Threshold: {settings.bloomThreshold.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.bloomThreshold}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ bloomThreshold: value });
                    trackSettingsChange('bloomThreshold', value);
                  }}
                  disabled={!settings.enableBloom}
                />
              </div>
              <div className="setting-slider">
                <label>Smoothing: {settings.bloomSmoothing.toFixed(2)}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.bloomSmoothing}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ bloomSmoothing: value });
                    trackSettingsChange('bloomSmoothing', value);
                  }}
                  disabled={!settings.enableBloom}
                />
              </div>

              <h3>Color Grading</h3>
              <div className="setting-slider">
                <label>Exposure: {settings.toneMappingExposure.toFixed(2)}</label>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.05"
                  value={settings.toneMappingExposure}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ toneMappingExposure: value });
                    trackSettingsChange('toneMappingExposure', value);
                  }}
                />
              </div>

              <h3>Performance</h3>
              <div className="setting-slider">
                <label>Star Count: {settings.starCount.toLocaleString()}</label>
                <input
                  type="range"
                  min="10000"
                  max="200000"
                  step="5000"
                  value={settings.starCount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setSettings({ starCount: value });
                    trackSettingsChange('starCount', value);
                  }}
                />
              </div>

              <h3>Low Performance Mode</h3>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.lowPerformanceMode}
                  onChange={() => {
                    const value = !settings.lowPerformanceMode;
                    setSettings({ lowPerformanceMode: value });
                    trackSettingsChange('lowPerformanceMode', value);
                    trackEvent(ANALYTICS_EVENTS.LOW_PERFORMANCE_TOGGLED, { enabled: value });
                  }}
                />
                <span>Enable Low Performance Mode</span>
              </label>
              <p className="setting-note">
                ⚡ Reduces star count, disables bloom & post-processing, simplifies asteroid/Kuiper belts for older devices
              </p>

              {settings.lowPerformanceMode && (
                <div className="setting-group low-perf-options">
                  <div className="setting-slider">
                    <label>Reduced Star Count: {settings.reducedStarCount.toLocaleString()}</label>
                    <input
                      type="range"
                      min="1000"
                      max="50000"
                      step="1000"
                      value={settings.reducedStarCount}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setSettings({ reducedStarCount: value });
                        trackSettingsChange('reducedStarCount', value);
                      }}
                    />
                  </div>
                  <label className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={settings.simplifiedBelts}
                      onChange={() => {
                        const value = !settings.simplifiedBelts;
                        setSettings({ simplifiedBelts: value });
                        trackSettingsChange('simplifiedBelts', value);
                      }}
                    />
                    <span>Simplify Asteroid/Kuiper Belts (fewer particles)</span>
                  </label>
                  <label className="setting-toggle">
                    <input
                      type="checkbox"
                      checked={settings.disablePostProcessing}
                      onChange={() => {
                        const value = !settings.disablePostProcessing;
                        setSettings({ disablePostProcessing: value });
                        trackSettingsChange('disablePostProcessing', value);
                      }}
                    />
                    <span>Disable All Post-Processing (bloom, FXAA, vignette, god rays)</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Time Panel */}
          <div
            id={panelIds.time}
            className={`settings-panel-content ${activeTab === 'time' ? 'active' : ''}`}
            data-panel="time"
            role="tabpanel"
            aria-labelledby={tabIds.time}
            hidden={activeTab !== 'time'}
          >
            <div className="setting-group">
              <h3>Simulation Time</h3>
              <div className="time-speed-control">
                <label>Time Speed: {formatTimeSpeed(settings.timeSpeed)}</label>
                <div className="speed-buttons">
                  {[
                    { speed: 0, label: '⏸️ Pause' },
                    { speed: 1, label: '1×' },
                    { speed: 10, label: '10×' },
                    { speed: 100, label: '100×' },
                    { speed: 1000, label: '1K×' },
                    { speed: 10000, label: '10K×' },
                    { speed: 100000, label: '100K×' },
                    { speed: 1000000, label: '1M×' },
                    { speed: 10000000, label: '10M×' },
                  ].map(({ speed, label }) => (
                    <button
                      key={speed}
                      className={`speed-btn ${settings.timeSpeed === speed ? 'active' : ''}`}
                      onClick={() => handleTimeSpeedChange(speed)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <h3>Preset Dates</h3>
                <div className="preset-dates">
                  {Object.entries({
                    'Now': new Date(),
                    'J2000.0': new Date('2000-01-01T12:00:00Z'),
                    'Apollo 11': new Date('1969-07-16T13:32:00Z'),
                    'Voyager 1': new Date('1977-09-05T12:56:00Z'),
                    'JWST Launch': new Date('2021-12-25T12:20:00Z'),
                    'Halley Perihelion': new Date('1986-02-09T00:00:00Z'),
                    'Hale-Bopp': new Date('1997-04-01T00:00:00Z'),
                  }).map(([label, date]) => (
                    <button
                      key={label}
                      className="preset-btn"
                      onClick={() => {
                        clockControls.setDate(date);
                        trackEvent(ANALYTICS_EVENTS.DATE_PICKER_USED, { preset: label });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <button className="glass-btn secondary" onClick={resetToDefaults}>
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}