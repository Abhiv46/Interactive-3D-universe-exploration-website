import { useMemo } from 'react';
import { CelestialBodyData } from '@/types/orbitalElements';
import { AU, SECONDS_PER_DAY, SECONDS_PER_YEAR } from '@/engine/Constants';
import { formatDistance, formatPeriod, formatMass, formatRadius } from '@/utils/formatters';

interface InfoCardProps {
  /** Selected celestial body data */
  data: CelestialBodyData | null;
  /** Callback when close button clicked */
  onClose: () => void;
  /** Current simulation date for distance calculation */
  currentDate?: Date;
}

export function InfoCard({ data, onClose, currentDate }: InfoCardProps) {
  if (!data) return null;

  const content = useMemo(() => {
    // Calculate distance from Sun
    let distanceFromSun = 'N/A';
    let distanceValue = 0;

    if (data.orbital) {
      distanceValue = data.orbital.semiMajorAxis;
      distanceFromSun = formatDistance(distanceValue);
    } else if (data.id === 'sun') {
      distanceFromSun = '0 AU (Center)';
    }

    // Format orbital period
    let orbitalPeriod = 'N/A';
    if (data.orbital && data.orbital.orbitalPeriod > 0) {
      orbitalPeriod = formatPeriod(data.orbital.orbitalPeriod);
    } else if (data.id === 'sun') {
      orbitalPeriod = 'N/A (Central star)';
    }

    // Format rotation period
    const rotationPeriod = data.physical.rotationPeriod > 0
      ? formatPeriod(data.physical.rotationPeriod)
      : 'Tidally locked / N/A';

    // Format mass and radius
    const mass = formatMass(data.physical.mass);
    const radius = formatRadius(data.physical.radius);

    // Get description
    const description = data.metadata.description || 'No description available.';

    // Get discovery info
    const discovered = data.metadata.discoveryDate && data.metadata.discoverer
      ? `Discovered: ${data.metadata.discoveryDate} by ${data.metadata.discoverer}`
      : data.metadata.discoveryDate
        ? `Known since: ${data.metadata.discoveryDate}`
        : 'Discovery: Ancient / Unknown';

    // Get designations
    const designations = data.metadata.designations?.length
      ? data.metadata.designations.join(', ')
      : 'None';

    return {
      distanceFromSun,
      distanceValue,
      orbitalPeriod,
      rotationPeriod,
      mass,
      radius,
      description,
      discovered,
      designations,
    };
  }, [data, currentDate]);

  return (
    <div className="info-card">
      <div className="info-card-header">
        <div className="info-card-title">
          <span className="info-card-name">{data.name}</span>
          <span className="info-card-type">{data.type}</span>
        </div>
        <button className="info-card-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="info-card-body">
        {/* Quick facts grid */}
        <div className="info-card-facts">
          <div className="fact-row">
            <span className="fact-label">Mass</span>
            <span className="fact-value">{content.mass}</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Radius</span>
            <span className="fact-value">{content.radius}</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Distance from Sun</span>
            <span className="fact-value">{content.distanceFromSun}</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Orbital Period</span>
            <span className="fact-value">{content.orbitalPeriod}</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Rotation Period</span>
            <span className="fact-value">{content.rotationPeriod}</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Surface Gravity</span>
            <span className="fact-value">{data.physical.surfaceGravity.toFixed(2)} m/s²</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Escape Velocity</span>
            <span className="fact-value">{(data.physical.escapeVelocity / 1000).toFixed(2)} km/s</span>
          </div>
          <div className="fact-row">
            <span className="fact-label">Density</span>
            <span className="fact-value">{data.physical.density.toLocaleString()} kg/m³</span>
          </div>
          {data.physical.effectiveTemperature && (
            <div className="fact-row">
              <span className="fact-label">Temperature</span>
              <span className="fact-value">{data.physical.effectiveTemperature} K</span>
            </div>
          )}
          {data.physical.albedo !== undefined && (
            <div className="fact-row">
              <span className="fact-label">Albedo</span>
              <span className="fact-value">{data.physical.albedo.toFixed(2)}</span>
            </div>
          )}
          <div className="fact-row">
            <span className="fact-label">Designations</span>
            <span className="fact-value designations">{content.designations}</span>
          </div>
        </div>

        {/* Description */}
        <div className="info-card-description">
          <h4>Description</h4>
          <p>{content.description}</p>
        </div>

        {/* Discovery info */}
        <div className="info-card-discovery">
          <span className="discovery-label">Discovery</span>
          <span className="discovery-value">{content.discovered}</span>
        </div>

        {/* Orbital group */}
        {data.metadata.orbitalGroup && (
          <div className="info-card-group">
            <span className="group-label">Orbital Group</span>
            <span className="group-value">{data.metadata.orbitalGroup}</span>
          </div>
        )}
      </div>

      {data.metadata.url && (
        <a
          href={data.metadata.url}
          target="_blank"
          rel="noopener noreferrer"
          className="info-card-link"
        >
          More info →
        </a>
      )}
    </div>
  );
}