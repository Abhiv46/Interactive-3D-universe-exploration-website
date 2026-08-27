import { useMemo } from 'react';
import { getSimulatedSolarActivity } from '../../shaders/AuroraShader';

interface AuroraIndicatorProps {
  julianDate: number;
  enabled?: boolean;
}

export function AuroraIndicator({ julianDate, enabled = true }: AuroraIndicatorProps) {
  if (!enabled) return null;

  const solarActivity = useMemo(() => getSimulatedSolarActivity(julianDate), [julianDate]);

  // Determine aurora visibility likelihood
  let visibility = 'None';
  let visibilityColor = '#666';
  let kpIndex = 0;

  if (solarActivity > 0.7) {
    visibility = 'High - Visible at mid-latitudes';
    visibilityColor = '#00ff00';
    kpIndex = 7;
  } else if (solarActivity > 0.5) {
    visibility = 'Moderate - Visible at high latitudes';
    visibilityColor = '#ffaa00';
    kpIndex = 5;
  } else if (solarActivity > 0.3) {
    visibility = 'Low - Polar regions only';
    visibilityColor = '#ff8800';
    kpIndex = 3;
  } else {
    visibility = 'Minimal - Subvisual';
    visibilityColor = '#888';
    kpIndex = 1;
  }

  return (
    <div className="aurora-indicator" style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.85)',
      border: '1px solid #00ff88',
      borderRadius: '8px',
      padding: '16px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      minWidth: '260px',
      boxShadow: '0 4px 20px rgba(0,255,136,0.2)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #00ff8844'
      }}>
        <span style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '14px' }}>🌌 AURORA FORECAST</span>
        <span style={{
          color: visibilityColor,
          fontSize: '10px',
          fontWeight: 'bold'
        }}>
          Kp {kpIndex}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>Solar Activity: </span>
        <span style={{ color: visibilityColor, fontWeight: 'bold' }}>
          {(solarActivity * 100).toFixed(0)}%
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>Visibility: </span>
        <span style={{ color: visibilityColor }}>
          {visibility}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>Northern Lights: </span>
        <span style={{ color: solarActivity > 0.3 ? '#00ff88' : '#666' }}>
          {solarActivity > 0.5 ? 'Likely' : solarActivity > 0.3 ? 'Possible' : 'Unlikely'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: '#888' }}>Southern Lights: </span>
        <span style={{ color: solarActivity > 0.4 ? '#ff3366' : '#666' }}>
          {solarActivity > 0.6 ? 'Likely' : solarActivity > 0.4 ? 'Possible' : 'Unlikely'}
        </span>
      </div>

      <div style={{ fontSize: '10px', color: '#666', marginTop: '8px', lineHeight: 1.4 }}>
        <div>📍 Best viewing: 60°-75° magnetic latitude</div>
        <div>⏰ Peak: Local midnight ± 2 hours</div>
        <div>☀️ Based on simulated solar cycle (11 yr)</div>
        <div style={{ color: '#888', marginTop: '4px' }}>
          ⚠️ Stylized representation — not real-time space weather data
        </div>
      </div>
    </div>
  );
}