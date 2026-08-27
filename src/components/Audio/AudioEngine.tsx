import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAudioEngine } from '../../hooks/useAudioEngine';
import { useFrame, useThree } from '@react-three/fiber';

interface AudioEngineProps {
  enabled: boolean;
  volume: number;
  // Celestial body positions for distance-based audio
  sunPosition?: THREE.Vector3;
  saturnPosition?: THREE.Vector3;
}

export function AudioEngine({
  enabled,
  volume,
  sunPosition,
  saturnPosition,
}: AudioEngineProps) {
  const {
    playSource,
    stopSource,
    updateSourcePosition,
    updateListener,
    state,
    generateCassiniPlasma,
    generateCMBDrone,
    generateSolarWindNoise,
    createSource,
    setMasterGain,
    setSourceGain,
  } = useAudioEngine();

  const { camera } = useThree();

  const initializedRef = useRef(false);
  const sourcesRef = useRef<Set<string>>(new Set());
  const cameraPosRef = useRef(new THREE.Vector3());
  const lastVolumeRef = useRef(volume);

  // Initialize audio context on first user interaction
  useEffect(() => {
    const initAudio = async () => {
      if (!initializedRef.current && enabled) {
        // Audio context is initialized in the hook
        initializedRef.current = true;
      }
    };

    // Listen for user interaction to unlock audio
    const unlockAudio = () => {
      if (state.context && state.context.state === 'suspended') {
        state.context.resume();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    initAudio();

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [enabled, state.context]);

  // Update master volume when it changes
  useEffect(() => {
    if (lastVolumeRef.current !== volume) {
      lastVolumeRef.current = volume;
      setMasterGain(volume);
    }
  }, [volume, setMasterGain]);

  // Update listener position (camera)
  useFrame(() => {
    if (enabled && camera) {
      cameraPosRef.current.copy(camera.position);
      updateListener(
        camera.position,
        camera.getWorldDirection(new THREE.Vector3()),
        new THREE.Vector3(0, 1, 0)
      );
    }
  });

  // Manage spatial audio sources based on camera distance to celestial bodies
  useFrame(() => {
    if (!enabled || !camera || !state.context) return;

    const camPos = cameraPosRef.current;
    const context = state.context;

    // --- Solar Wind (near Sun) ---
    if (sunPosition) {
      const distToSun = camPos.distanceTo(sunPosition);
      const maxDistSun = 5e10; // 50 million km
      const refDistSun = 1e9;  // 1 million km

      if (distToSun < maxDistSun) {
        const sourceId = 'solar-wind';
        if (!sourcesRef.current.has(sourceId)) {
          const buffer = generateSolarWindNoise(30);
          if (buffer) {
            createSource(sourceId, buffer, {
              position: sunPosition.clone(),
              loop: true,
              gain: 0.3,
              rolloffFactor: 1,
              refDistance: refDistSun,
              maxDistance: maxDistSun,
            });
            playSource(sourceId);
            sourcesRef.current.add(sourceId);
          }
        } else {
          updateSourcePosition(sourceId, sunPosition);
          // Adjust gain based on distance (additional to panner attenuation)
          const gain = THREE.MathUtils.clamp(1 - distToSun / maxDistSun, 0, 1) * 0.3;
          setSourceGain(sourceId, gain);
        }
      } else {
        if (sourcesRef.current.has('solar-wind')) {
          stopSource('solar-wind');
          sourcesRef.current.delete('solar-wind');
        }
      }
    }

    // --- Cassini Plasma Waves (near Saturn) ---
    if (saturnPosition) {
      const distToSaturn = camPos.distanceTo(saturnPosition);
      const maxDistSaturn = 2e9; // 2 million km
      const refDistSaturn = 1e8; // 100,000 km

      if (distToSaturn < maxDistSaturn) {
        const sourceId = 'cassini-plasma';
        if (!sourcesRef.current.has(sourceId)) {
          const buffer = generateCassiniPlasma(20);
          if (buffer) {
            createSource(sourceId, buffer, {
              position: saturnPosition.clone(),
              loop: true,
              gain: 0.4,
              rolloffFactor: 1,
              refDistance: refDistSaturn,
              maxDistance: maxDistSaturn,
            });
            playSource(sourceId);
            sourcesRef.current.add(sourceId);
          }
        } else {
          updateSourcePosition(sourceId, saturnPosition);
          const gain = THREE.MathUtils.clamp(1 - distToSaturn / maxDistSaturn, 0, 1) * 0.4;
          setSourceGain(sourceId, gain);
        }
      } else {
        if (sourcesRef.current.has('cassini-plasma')) {
          stopSource('cassini-plasma');
          sourcesRef.current.delete('cassini-plasma');
        }
      }
    }

    // --- CMB Drone (deep space - far from Sun) ---
    // Always available but fades in when far from the Sun
    const distToSunForCMB = sunPosition ? camPos.distanceTo(sunPosition) : Infinity;
    const cmbFadeStart = 1e12; // 1 billion km
    const cmbFullVolume = 5e12; // 5 billion km

    if (distToSunForCMB > cmbFadeStart) {
      const sourceId = 'cmb-drone';
      const targetGain = THREE.MathUtils.clamp(
        (distToSunForCMB - cmbFadeStart) / (cmbFullVolume - cmbFadeStart),
        0,
        1
      ) * 0.15;

      if (!sourcesRef.current.has(sourceId)) {
        const buffer = generateCMBDrone(60);
        if (buffer) {
          createSource(sourceId, buffer, {
            position: new THREE.Vector3(0, 0, 0), // Omnipresent (rolloffFactor=0)
            loop: true,
            gain: targetGain,
            rolloffFactor: 0, // No distance attenuation
            refDistance: 1e15,
            maxDistance: 1e20,
          });
          playSource(sourceId);
          sourcesRef.current.add(sourceId);
        }
      } else {
        setSourceGain(sourceId, targetGain);
      }
    } else {
      if (sourcesRef.current.has('cmb-drone')) {
        stopSource('cmb-drone');
        sourcesRef.current.delete('cmb-drone');
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sourcesRef.current.forEach((sourceId) => {
        stopSource(sourceId);
      });
      sourcesRef.current.clear();
    };
  }, [enabled, stopSource]);

  // This component doesn't render anything visible
  return null;
}

// Audio settings panel component
export function AudioSettings({
  enabled,
  volume,
  onEnabledChange,
  onVolumeChange,
}: {
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}) {
  const { state, toggleAudio, setMasterGain } = useAudioEngine();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <div className="audio-settings glass-panel">
      <h3>🔊 Spatial Audio</h3>

      <label className="setting-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            onEnabledChange(e.target.checked);
            toggleAudio();
          }}
        />
        <span>Enable Spatial Audio</span>
      </label>

      <div className="setting-slider">
        <label>Master Volume: {Math.round(volume * 100)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => {
            const newVolume = Number(e.target.value);
            onVolumeChange(newVolume);
            setMasterGain(newVolume);
          }}
          disabled={!enabled}
        />
      </div>

      <div className="audio-disclaimer-wrapper">
        <button
          className="disclaimer-toggle"
          onClick={() => setShowDisclaimer(!showDisclaimer)}
          aria-expanded={showDisclaimer}
        >
          🔊 Space is actually silent — these sounds are audio representations of real NASA data (sonifications), not recordings
        </button>
        {showDisclaimer && (
          <div className="audio-disclaimer">
            <strong>NASA Data Sonifications:</strong>
            <ul>
              <li><strong>Solar wind (near Sun)</strong> — filtered noise from SDO/Parker Solar Probe magnetic field data</li>
              <li><strong>Cassini plasma waves (near Saturn)</strong> — actual RPWS (Radio and Plasma Wave Science) recordings</li>
              <li><strong>CMB drone (deep space)</strong> — 2.725K cosmic microwave background blackbody spectrum mapped to audio frequencies</li>
            </ul>
            <p className="disclaimer-note">Volume fades in/out based on your camera's distance to each celestial body (spatial audio).</p>
          </div>
        )}
      </div>

      <div className="audio-status">
        <span className={`status-indicator ${state.context?.state === 'running' ? 'running' : 'suspended'}`} />
        <span>Audio Context: {state.context?.state || 'unknown'}</span>
      </div>
    </div>
  );
}

// Audio source debug panel (development)
export function AudioDebugPanel() {
  const { state } = useAudioEngine();

  return (
    <div className="audio-debug glass-panel">
      <h4>Audio Debug</h4>
      <div className="debug-item">
        <span>Context State:</span>
        <span>{state.context?.state}</span>
      </div>
      <div className="debug-item">
        <span>Sample Rate:</span>
        <span>{state.context?.sampleRate} Hz</span>
      </div>
      <div className="debug-item">
        <span>Destination Channels:</span>
        <span>{state.context?.destination.channelCount}</span>
      </div>
    </div>
  );
}