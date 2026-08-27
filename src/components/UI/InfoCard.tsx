import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CelestialBodyData } from '../../types/orbitalElements';
import { SurfaceRegionInfo } from '../../components/SurfaceTerrain';
import { useFocusTrap, generateId, ariaLabels } from '@/hooks/useAccessibility';

interface InfoCardProps {
  object: {
    id: string;
    name: string;
    type: string;
    position: THREE.Vector3;
    data: CelestialBodyData | any;
  };
  onClose: () => void;
  /** Surface region info when zoomed to surface level */
  surfaceRegion?: SurfaceRegionInfo | null;
}

export function InfoCard({ object, onClose, surfaceRegion }: InfoCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // Focus trap for accessibility
  const focusTrapRef = useFocusTrap(true);

  // Animate in
  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  // Generate unique IDs for ARIA
  const cardId = generateId('infocard');
  const contentId = generateId('infocard-content');

  const data = object.data;
  const physical = data.physical || {};
  const orbit = data.orbit || {};

  // Format numbers
  const formatNumber = (num: number, unit: string = '', precision: number = 2) => {
    if (!num && num !== 0) return 'Unknown';
    if (num >= 1e12) return (num / 1e12).toFixed(precision) + ' T' + unit;
    if (num >= 1e9) return (num / 1e9).toFixed(precision) + ' B' + unit;
    if (num >= 1e6) return (num / 1e6).toFixed(precision) + ' M' + unit;
    if (num >= 1e3) return (num / 1e3).toFixed(precision) + ' K' + unit;
    return num.toFixed(precision) + unit;
  };

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

  const formatMass = (kg: number) => {
    const earthMass = 5.972e24;
    const solarMass = 1.989e30;

    if (kg >= solarMass) return (kg / solarMass).toFixed(3) + ' M☉';
    if (kg >= earthMass) return (kg / earthMass).toFixed(3) + ' M⊕';
    return formatNumber(kg, ' kg');
  };

  const formatRadius = (meters: number) => {
    const earthRadius = 6.371e6;
    const solarRadius = 6.957e8;

    if (meters >= solarRadius) return (meters / solarRadius).toFixed(3) + ' R☉';
    if (meters >= earthRadius) return (meters / earthRadius).toFixed(3) + ' R⊕';
    return formatDistance(meters);
  };

  const formatPeriod = (seconds: number) => {
    if (!seconds) return 'N/A';
    const day = 86400;
    const year = 365.25 * day;

    if (seconds >= year) return (seconds / year).toFixed(2) + ' years';
    if (seconds >= day) return (seconds / day).toFixed(2) + ' days';
    if (seconds >= 3600) return (seconds / 3600).toFixed(2) + ' hours';
    if (seconds >= 60) return (seconds / 60).toFixed(2) + ' min';
    return seconds.toFixed(2) + ' s';
  };

  const formatTemp = (k: number) => {
    if (!k) return 'Unknown';
    const c = k - 273.15;
    return `${k.toFixed(0)} K (${c.toFixed(0)}°C)`;
  };

  // Get type-specific info
  const getTypeIcon = () => {
    switch (object.type) {
      case 'planet': return '🪐';
      case 'dwarf': return '🪨';
      case 'moon': return '🌙';
      case 'star': return '⭐';
      case 'galaxy': return '🌌';
      case 'asteroid': return '☄️';
      case 'comet': return '☄️';
      default: return '🌌';
    }
  };

  const getTypeLabel = () => {
    switch (object.type) {
      case 'planet': return 'Planet';
      case 'dwarf': return 'Dwarf Planet';
      case 'moon': return 'Moon';
      case 'star': return 'Star';
      case 'galaxy': return 'Galaxy';
      case 'asteroid': return 'Asteroid';
      case 'comet': return 'Comet';
      default: return 'Object';
    }
  };

  return (
    <div
      ref={cardRef}
      className={`info-card glass-panel ${isVisible ? 'visible' : ''}`}
      role="dialog"
      aria-label={`${object.name} information`}
    >
      <div className="info-card-header">
        <div className="info-card-title">
          <span className="info-card-icon">{getTypeIcon()}</span>
          <h2>{object.name}</h2>
          <span className="info-card-type">{getTypeLabel()}</span>
        </div>
        <button className="info-card-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="info-card-content">
        {/* Overview */}
        <div className="info-section">
          <h3>Overview</h3>
          <div className="info-grid">
            {data.designation && (
              <div className="info-item">
                <span className="info-label">Designation</span>
                <span className="info-value">{data.designation}</span>
              </div>
            )}
            {physical.mass && (
              <div className="info-item">
                <span className="info-label">Mass</span>
                <span className="info-value">{formatMass(physical.mass)}</span>
              </div>
            )}
            {physical.radius && (
              <div className="info-item">
                <span className="info-label">Radius</span>
                <span className="info-value">{formatRadius(physical.radius)}</span>
              </div>
            )}
            {physical.density && (
              <div className="info-item">
                <span className="info-label">Density</span>
                <span className="info-value">{physical.density.toFixed(2)} g/cm³</span>
              </div>
            )}
            {physical.gravity && (
              <div className="info-item">
                <span className="info-label">Surface Gravity</span>
                <span className="info-value">{physical.gravity.toFixed(2)} m/s²</span>
              </div>
            )}
            {physical.escapeVelocity && (
              <div className="info-item">
                <span className="info-label">Escape Velocity</span>
                <span className="info-value">{formatNumber(physical.escapeVelocity, ' m/s')}</span>
              </div>
            )}
            {physical.temperature && (
              <div className="info-item">
                <span className="info-label">Temperature</span>
                <span className="info-value">{formatTemp(physical.temperature)}</span>
              </div>
            )}
            {physical.albedo !== undefined && (
              <div className="info-item">
                <span className="info-label">Albedo</span>
                <span className="info-value">{physical.albedo.toFixed(3)}</span>
              </div>
            )}
            {physical.rotationPeriod && (
              <div className="info-item">
                <span className="info-label">Rotation Period</span>
                <span className="info-value">{formatPeriod(physical.rotationPeriod)}</span>
              </div>
            )}
            {physical.axialTilt !== undefined && (
              <div className="info-item">
                <span className="info-label">Axial Tilt</span>
                <span className="info-value">{physical.axialTilt.toFixed(2)}°</span>
              </div>
            )}
          </div>
        </div>

        {/* Orbital Information */}
        {(orbit.semiMajorAxis || orbit.period) && (
          <div className="info-section">
            <h3>Orbital Parameters</h3>
            <div className="info-grid">
              {orbit.semiMajorAxis && (
                <div className="info-item">
                  <span className="info-label">Semi-major Axis</span>
                  <span className="info-value">{formatDistance(orbit.semiMajorAxis)}</span>
                </div>
              )}
              {orbit.eccentricity !== undefined && (
                <div className="info-item">
                  <span className="info-label">Eccentricity</span>
                  <span className="info-value">{orbit.eccentricity.toFixed(4)}</span>
                </div>
              )}
              {orbit.inclination !== undefined && (
                <div className="info-item">
                  <span className="info-label">Inclination</span>
                  <span className="info-value">{orbit.inclination.toFixed(2)}°</span>
                </div>
              )}
              {orbit.longitudeOfAscendingNode !== undefined && (
                <div className="info-item">
                  <span className="info-label">Long. Asc. Node</span>
                  <span className="info-value">{orbit.longitudeOfAscendingNode.toFixed(2)}°</span>
                </div>
              )}
              {orbit.argumentOfPeriapsis !== undefined && (
                <div className="info-item">
                  <span className="info-label">Arg. of Periapsis</span>
                  <span className="info-value">{orbit.argumentOfPeriapsis.toFixed(2)}°</span>
                </div>
              )}
              {data.period && (
                <div className="info-item">
                  <span className="info-label">Orbital Period</span>
                  <span className="info-value">{data.period.toFixed(2)} years</span>
                </div>
              )}
              {data.lastPerihelion && (
                <div className="info-item">
                  <span className="info-label">Last Perihelion</span>
                  <span className="info-value">{data.lastPerihelion.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</span>
                </div>
              )}
              {data.nextPerihelion && (
                <div className="info-item">
                  <span className="info-label">Next Perihelion</span>
                  <span className="info-value">{data.nextPerihelion.toString().replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Data for Stars */}
        {object.type === 'star' && (
          <div className="info-section">
            <h3>Stellar Properties</h3>
            <div className="info-grid">
              {data.spectralType && (
                <div className="info-item">
                  <span className="info-label">Spectral Type</span>
                  <span className="info-value">{data.spectralType}</span>
                </div>
              )}
              {data.luminosity && (
                <div className="info-item">
                  <span className="info-label">Luminosity</span>
                  <span className="info-value">{data.luminosity.toFixed(2)} L☉</span>
                </div>
              )}
              {data.magnitude !== undefined && (
                <div className="info-item">
                  <span className="info-label">Apparent Magnitude</span>
                  <span className="info-value">{data.magnitude.toFixed(2)}</span>
                </div>
              )}
              {data.distance && (
                <div className="info-item">
                  <span className="info-label">Distance</span>
                  <span className="info-value">{data.distance.toFixed(2)} ly</span>
                </div>
              )}
              {data.bv !== undefined && (
                <div className="info-item">
                  <span className="info-label">B-V Color Index</span>
                  <span className="info-value">{data.bv.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Data for Galaxies */}
        {object.type === 'galaxy' && (
          <div className="info-section">
            <h3>Galaxy Properties</h3>
            <div className="info-grid">
              {data.type && (
                <div className="info-item">
                  <span className="info-label">Morphological Type</span>
                  <span className="info-value">{data.type}</span>
                </div>
              )}
              {data.size && (
                <div className="info-item">
                  <span className="info-label">Diameter</span>
                  <span className="info-value">{(data.size / 1000).toFixed(1)} kly</span>
                </div>
              )}
              {data.apparentMagnitude !== undefined && (
                <div className="info-item">
                  <span className="info-label">Apparent Magnitude</span>
                  <span className="info-value">{data.apparentMagnitude.toFixed(2)}</span>
                </div>
              )}
              {data.velocity !== undefined && (
                <div className="info-item">
                  <span className="info-label">Radial Velocity</span>
                  <span className="info-value">{(data.velocity > 0 ? '+' : '') + data.velocity.toFixed(0)} km/s</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="info-section">
            <h3>Description</h3>
            <p className="info-description">{data.description}</p>
          </div>
        )}

        {/* Surface Region Info (when zoomed to surface) */}
        {surfaceRegion && (
          <div className="info-section surface-region-section">
            <h3>Surface Region</h3>
            <div className="info-grid">
              <div className="info-item surface-region-name">
                <span className="info-label">Feature</span>
                <span className="info-value">{surfaceRegion.name}</span>
              </div>
              <div className="info-item surface-region-type">
                <span className="info-label">Type</span>
                <span className="info-value">{surfaceRegion.type.replace('_', ' ')}</span>
              </div>
              <div className="info-item surface-region-coords">
                <span className="info-label">Coordinates</span>
                <span className="info-value">
                  Lat: {surfaceRegion.coordinates.lat.toFixed(4)}°
                  {surfaceRegion.coordinates.lat >= 0 ? ' N' : ' S'} |
                  Lon: {Math.abs(surfaceRegion.coordinates.lon).toFixed(4)}°
                  {surfaceRegion.coordinates.lon >= 0 ? ' E' : ' W'}
                </span>
              </div>
              <div className="info-item surface-region-elevation">
                <span className="info-label">Elevation</span>
                <span className="info-value">
                  {surfaceRegion.elevation >= 0 ? '+' : ''}{surfaceRegion.elevation.toLocaleString()} m
                </span>
              </div>
            </div>
            <div className="surface-region-description">
              {surfaceRegion.description}
            </div>
            <div className="surface-region-note">
              📍 Real elevation data from {' '}
              {object.data.id === 'earth' ? 'NASA SRTM/ASTER GDEM' :
               object.data.id === 'moon' ? 'NASA LRO LOLA' :
               object.data.id === 'mars' ? 'NASA MGS MOLA' : 'space agency data'}
            </div>
          </div>
        )}

        {/* No Surface Data Notice for gas giants, stars, etc. */}
        {object.data && !surfaceRegion &&
         ['jupiter', 'saturn', 'uranus', 'neptune', 'sun'].includes(object.data.id) && (
          <div className="info-section no-surface-section">
            <h3>⚠️ No Surface Data Available</h3>
            <p className="info-description">
              {object.data.id === 'sun'
                ? 'The Sun is a ball of plasma with no solid surface.'
                : 'This gas/ice giant has no solid surface to explore.'}
              Surface zoom is only available for bodies with real elevation data (Earth, Moon, Mars).
            </p>
          </div>
        )}

        {/* Current Position */}
        <div className="info-section">
          <h3>Current Position</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Distance from Camera</span>
              <span className="info-value">{formatDistance(object.position.length())}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Coordinates</span>
              <span className="info-value">
                X: {formatNumber(object.position.x)}<br/>
                Y: {formatNumber(object.position.y)}<br/>
                Z: {formatNumber(object.position.z)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="info-card-actions">
        <button
          className="glass-btn primary"
          onClick={() => {}}
          aria-label={ariaLabels.focusObject(object.name)}
        >
          Focus Camera
        </button>
        <button
          className="glass-btn secondary"
          onClick={onClose}
          aria-label={ariaLabels.closeDialog}
        >
          Close
        </button>
      </div>
    </div>
  );
}