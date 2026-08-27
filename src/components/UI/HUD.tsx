import { useSimulationClock } from '../../hooks/useSimulationClock';
import { useCameraController } from '../../hooks/useCameraController';
import * as THREE from 'three';

export function HUD({
  focusedObject,
  cameraPosition,
  targetPosition,
  distance,
}: {
  focusedObject: { name: string; type: string; distance: number } | null;
  cameraPosition: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  distance: number | null;
}) {
  const clockState = useSimulationClock();
  const cameraState = useCameraController();

  const formatDistance = (meters: number) => {
    const AU = 1.496e11;
    const ly = 9.461e15;
    const pc = 3.086e16;

    if (meters >= pc) return (meters / pc).toFixed(2) + ' pc';
    if (meters >= ly) return (meters / ly).toFixed(2) + ' ly';
    if (meters >= AU) return (meters / AU).toFixed(2) + ' AU';
    if (meters >= 1e6) return (meters / 1e6).toFixed(2) + ' Mm';
    if (meters >= 1e3) return (meters / 1e3).toFixed(2) + ' km';
    return meters.toFixed(2) + ' m';
  };

  const formatSpeed = (speed: number) => {
    if (speed === 0) return 'Paused';
    if (speed < 1000) return `${speed}×`;
    if (speed < 1000000) return `${speed / 1000}K×`;
    return `${speed / 1000000}M×`;
  };

  const getCameraModeLabel = (mode: string) => {
    return mode === 'free' ? 'FREE FLY' : 'ORBIT FOCUS';
  };

  return (
    <div className="hud glass-panel">
      {/* Top Left: Time & Simulation */}
      <div className="hud-section hud-time">
        <div className="hud-row">
          <span className="hud-label">SIM TIME</span>
          <span className="hud-value">{clockState.date.toISOString().replace('T', ' ').substring(0, 19)} UTC</span>
        </div>
        <div className="hud-row">
          <span className="hud-label">JULIAN DATE</span>
          <span className="hud-value">JD {clockState.julianDate.toFixed(5)}</span>
        </div>
        <div className="hud-row">
          <span className="hud-label">SPEED</span>
          <span className={`hud-value hud-speed ${clockState.isRunning ? 'playing' : 'paused'}`}>
            {formatSpeed(clockState.speed)}
          </span>
        </div>
      </div>

      {/* Top Right: Camera Info */}
      <div className="hud-section hud-camera">
        <div className="hud-row">
          <span className="hud-label">MODE</span>
          <span className="hud-value">{getCameraModeLabel(cameraState.state.mode)}</span>
        </div>
        <div className="hud-row">
          <span className="hud-label">POSITION</span>
          <span className="hud-value mono">
            X: {formatDistance(cameraPosition.x)}<br/>
            Y: {formatDistance(cameraPosition.y)}<br/>
            Z: {formatDistance(cameraPosition.z)}
          </span>
        </div>
        <div className="hud-row">
          <span className="hud-label">DISTANCE</span>
          <span className="hud-value">
            {distance ? formatDistance(distance) : '∞'}
          </span>
        </div>
      </div>

      {/* Bottom Left: Focused Object */}
      {focusedObject && (
        <div className="hud-section hud-focus">
          <div className="hud-focus-header">
            <span className="hud-focus-icon">{getTypeIcon(focusedObject.type)}</span>
            <span className="hud-focus-name">{focusedObject.name}</span>
            <span className="hud-focus-type">{focusedObject.type.toUpperCase()}</span>
          </div>
          <div className="hud-row">
            <span className="hud-label">DISTANCE</span>
            <span className="hud-value">{formatDistance(focusedObject.distance)}</span>
          </div>
          {targetPosition && (
            <div className="hud-row">
              <span className="hud-label">TARGET</span>
              <span className="hud-value mono">
                X: {formatDistance(targetPosition.x)}<br/>
                Y: {formatDistance(targetPosition.y)}<br/>
                Z: {formatDistance(targetPosition.z)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Right: Coordinates */}
      <div className="hud-section hud-coords">
        <div className="hud-row">
          <span className="hud-label">GALACTIC</span>
          <span className="hud-value mono">
            {getGalacticCoords(cameraPosition)}
          </span>
        </div>
        <div className="hud-row">
          <span className="hud-label">ECLIPTIC</span>
          <span className="hud-value mono">
            {getEclipticCoords(cameraPosition)}
          </span>
        </div>
      </div>

      {/* Controls Help */}
      <div className="hud-section hud-controls">
        <div className="hud-controls-title">CONTROLS</div>
        <div className="hud-controls-grid">
          <div className="hud-control">
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move
          </div>
          <div className="hud-control">
            <kbd>Shift</kbd> Boost
          </div>
          <div className="hud-control">
            <kbd>Space</kbd> Up
          </div>
          <div className="hud-control">
            <kbd>Ctrl</kbd> Down
          </div>
          <div className="hud-control">
            <kbd>Mouse</kbd> Look
          </div>
          <div className="hud-control">
            <kbd>Click</kbd> Focus
          </div>
          <div className="hud-control">
            <kbd>F</kbd> Follow
          </div>
          <div className="hud-control">
            <kbd>Esc</kbd> Release
          </div>
          <div className="hud-control">
            <kbd>Tab</kbd> Mode
          </div>
          <div className="hud-control">
            <kbd>Space</kbd> Play/Pause
          </div>
          <div className="hud-control">
            <kbd>[</kbd><kbd>]</kbd> Speed
          </div>
        </div>
      </div>
    </div>
  );
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'planet': return '🪐';
    case 'dwarf': return '🪨';
    case 'moon': return '🌙';
    case 'star': return '⭐';
    case 'galaxy': return '🌌';
    case 'asteroid': return '☄️';
    case 'comet': return '☄️';
    default: return '🌌';
  }
}

function getGalacticCoords(position: THREE.Vector3): string {
  // Simplified galactic coordinates
  const x = position.x, y = position.y, z = position.z;
  const r = Math.sqrt(x*x + y*y + z*z);
  if (r === 0) return 'Center';

  const l = Math.atan2(y, x) * 180 / Math.PI;
  const b = Math.asin(z / r) * 180 / Math.PI;

  return `l=${(l+360)%360|0}° b=${b|0}°`;
}

function getEclipticCoords(position: THREE.Vector3): string {
  // Simplified ecliptic coordinates
  const x = position.x, y = position.y, z = position.z;
  const r = Math.sqrt(x*x + y*y + z*z);
  if (r === 0) return 'Center';

  const lambda = Math.atan2(y, x) * 180 / Math.PI;
  const beta = Math.asin(z / r) * 180 / Math.PI;

  return `λ=${(lambda+360)%360|0}° β=${beta|0}°`;
}