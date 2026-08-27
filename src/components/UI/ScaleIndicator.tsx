import { useMemo } from 'react';
import * as THREE from 'three';

interface ScaleIndicatorProps {
  cameraPosition: THREE.Vector3;
  cameraDistance: number; // Distance to focus point or origin
  focusedObject?: {
    name: string;
    type: string;
    radius: number;
    distance: number;
  } | null;
}

export function ScaleIndicator({
  cameraPosition: _cameraPosition,
  cameraDistance,
  focusedObject: _focusedObject,
}: ScaleIndicatorProps) {
  const scales = useMemo(() => calculateScales(cameraDistance, _focusedObject), [cameraDistance, _focusedObject]);

  return (
    <div className="scale-indicator glass-panel">
      <div className="scale-header">
        <span className="scale-title">SCALE REFERENCE</span>
        <span className="scale-distance">Distance: {formatDistance(cameraDistance)}</span>
      </div>

      <div className="scale-bar-container">
        <div className="scale-bar" role="img" aria-label="Logarithmic scale bar">
          {scales.map((scale, _i) => (
            <div key={scale.label} className="scale-mark" style={{ left: `${scale.position}%` }}>
              <div className="scale-tick" />
              <span className="scale-label">{scale.label}</span>
            </div>
          ))}
          <div
            className="scale-camera-marker"
            style={{ left: `${getCameraPositionPercent(cameraDistance)}%` }}
            aria-label="Camera position"
          >
            ▼
          </div>
        </div>
      </div>

      {/* Focused object size comparison */}
      {_focusedObject && (
        <div className="scale-comparison">
          <div className="comparison-item">
            <span className="comparison-label">Camera to {_focusedObject.name}</span>
            <span className="comparison-value">{formatDistance(_focusedObject.distance)}</span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">{_focusedObject.name} radius</span>
            <span className="comparison-value">{formatDistance(_focusedObject.radius)}</span>
          </div>
          <div className="comparison-item">
            <span className="comparison-label">Angular size</span>
            <span className="comparison-value">{getAngularSize(_focusedObject.radius, _focusedObject.distance)}</span>
          </div>
        </div>
      )}

      {/* Scale markers reference */}
      <div className="scale-reference">
        <div className="reference-row">
          <span className="ref-label">1 m</span>
          <span className="ref-value">Human scale</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 km</span>
          <span className="ref-value">City block</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 Mm (10³ km)</span>
          <span className="ref-value">Earth radius ~6.4 Mm</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 AU (1.5×10⁸ km)</span>
          <span className="ref-value">Earth-Sun distance</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 ly (9.5×10¹² km)</span>
          <span className="ref-value">Light year</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 pc (3.26 ly)</span>
          <span className="ref-value">Parsec</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 kpc</span>
          <span className="ref-value">Galactic scale</span>
        </div>
        <div className="reference-row">
          <span className="ref-label">1 Mpc</span>
          <span className="ref-value">Intergalactic</span>
        </div>
      </div>
    </div>
  );
}

function calculateScales(
  cameraDistance: number,
  _focusedObject: ScaleIndicatorProps['focusedObject']
): Array<{ label: string; position: number; value: number }> {
  const scales = [
    { label: '1 m', value: 1 },
    { label: '1 km', value: 1e3 },
    { label: '1 Mm', value: 1e6 },
    { label: '10 Mm', value: 1e7 },
    { label: '100 Mm', value: 1e8 },
    { label: '1 AU', value: 1.496e11 },
    { label: '10 AU', value: 1.496e12 },
    { label: '100 AU', value: 1.496e13 },
    { label: '1 ly', value: 9.461e15 },
    { label: '10 ly', value: 9.461e16 },
    { label: '100 ly', value: 9.461e17 },
    { label: '1 kly', value: 9.461e18 },
    { label: '10 kly', value: 9.461e19 },
    { label: '100 kly', value: 9.461e20 },
    { label: '1 Mly', value: 9.461e21 },
    { label: '10 Mly', value: 9.461e22 },
    { label: '100 Mly', value: 9.461e23 },
  ];

  // Filter scales relevant to current camera distance
  const minScale = cameraDistance / 1e6; // Show 6 orders of magnitude around camera
  const maxScale = cameraDistance * 1e6;

  const relevantScales = scales.filter(s => s.value >= minScale && s.value <= maxScale);

  // Map to 0-100% positions on log scale
  const logMin = Math.log10(minScale);
  const logMax = Math.log10(maxScale);

  return relevantScales.map(s => ({
    ...s,
    position: ((Math.log10(s.value) - logMin) / (logMax - logMin)) * 100,
  }));
}

function getCameraPositionPercent(cameraDistance: number): number {
  const minScale = cameraDistance / 1e6;
  const maxScale = cameraDistance * 1e6;
  const logMin = Math.log10(minScale);
  const logMax = Math.log10(maxScale);
  const logCam = Math.log10(cameraDistance);

  return Math.max(0, Math.min(100, ((logCam - logMin) / (logMax - logMin)) * 100));
}

function formatDistance(meters: number): string {
  const AU = 1.496e11;
  const ly = 9.461e15;
  const pc = 3.086e16;

  if (meters >= pc) return (meters / pc).toFixed(2) + ' pc';
  if (meters >= ly) return (meters / ly).toFixed(2) + ' ly';
  if (meters >= AU) return (meters / AU).toFixed(2) + ' AU';
  if (meters >= 1e6) return (meters / 1e6).toFixed(2) + ' Mm';
  if (meters >= 1e3) return (meters / 1e3).toFixed(2) + ' km';
  return meters.toFixed(2) + ' m';
}

function getAngularSize(radius: number, distance: number): string {
  if (distance === 0) return '∞';
  const radians = 2 * Math.atan(radius / distance);
  const arcseconds = radians * (180 / Math.PI) * 3600;

  if (arcseconds >= 3600) return `${(arcseconds / 3600).toFixed(2)}°`;
  if (arcseconds >= 60) return `${(arcseconds / 60).toFixed(2)}'`;
  return `${arcseconds.toFixed(2)}"`;
}

// Compact scale indicator for HUD
export function CompactScaleIndicator({ cameraDistance }: { cameraDistance: number }) {
  const getScaleLabel = (distance: number): string => {
    const AU = 1.496e11;
    const ly = 9.461e15;
    const pc = 3.086e16;

    if (distance >= pc) return `${(distance / pc).toFixed(1)} pc`;
    if (distance >= ly) return `${(distance / ly).toFixed(1)} ly`;
    if (distance >= AU) return `${(distance / AU).toFixed(1)} AU`;
    if (distance >= 1e6) return `${(distance / 1e6).toFixed(1)} Mm`;
    if (distance >= 1e3) return `${(distance / 1e3).toFixed(1)} km`;
    return `${distance.toFixed(1)} m`;
  };

  return (
    <div className="compact-scale glass-panel">
      <span className="scale-icon">📏</span>
      <span className="scale-value">{getScaleLabel(cameraDistance)}</span>
    </div>
  );
}