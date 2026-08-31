import { useMemo, useEffect, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '../../types/orbitalElements';
import { useScale } from '@/context/ScaleContext';
import { VISUAL_RADIUS_SCALE, MIN_VISUAL_RADIUS } from '@/engine/Constants';

interface ISSPosition {
  latitude: number;
  longitude: number;
  altitude: number; // km
  velocity: number; // km/s
  timestamp: number;
}

/**
 * Fetches real-time ISS position from Open Notify API
 */
async function fetchISSPosition(): Promise<ISSPosition | null> {
  try {
    const response = await fetch('https://api.open-notify.org/iss-now.json');
    if (!response.ok) throw new Error('Failed to fetch ISS position');

    const data = await response.json();
    if (data.message !== 'success') throw new Error('API returned error');

    return {
      latitude: parseFloat(data.iss_position.latitude),
      longitude: parseFloat(data.iss_position.longitude),
      altitude: 408, // Average ISS altitude in km
      velocity: 7.66, // Orbital velocity km/s
      timestamp: data.timestamp * 1000, // Convert to milliseconds
    };
  } catch {
    // Fail silently - the panel shows a connection hint when data is unavailable
    return null;
  }
}

/**
 * Converts lat/lon/alt to 3D position on Earth
 */
function latLonAltToVector3(latitude: number, longitude: number, altitudeKm: number, earthRadius: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latitude);
  const lon = THREE.MathUtils.degToRad(longitude);
  const radius = earthRadius + altitudeKm; // Earth radius + altitude

  const x = radius * Math.cos(lat) * Math.cos(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(lon);

  return new THREE.Vector3(x, y, z);
}

/**
 * ISS Tracker component - fetches real-time position and displays ISS orbiting Earth
 */
interface ISSTrackerProps {
  earthBody: CelestialBodyData;
  enabled: boolean;
  julianDate: number;
  timeScale: number;
}

export function ISSTracker({ earthBody, enabled, julianDate, timeScale }: ISSTrackerProps) {
  const { scene } = useThree();
  const { trueScale } = useScale();
  const [issPosition, setISSPosition] = useState<ISSPosition | null>(null);
  const [issMesh, setISSMesh] = useState<THREE.Mesh | null>(null);
  const [orbitLine, setOrbitLine] = useState<THREE.Line | null>(null);
  const [lastFetch, setLastFetch] = useState(0);
  const fetchIntervalRef = useRef<number>();

  // Fetch ISS position periodically
  useEffect(() => {
    if (!enabled) return;

    const fetchAndUpdate = async () => {
      const pos = await fetchISSPosition();
      if (pos) setISSPosition(pos);
      setLastFetch(Date.now());
    };

    // Initial fetch
    fetchAndUpdate();

    // Set up interval (every 10 seconds)
    fetchIntervalRef.current = window.setInterval(fetchAndUpdate, 10000);

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [enabled]);

  // Create ISS mesh and orbit path
  useEffect(() => {
    if (!enabled || !earthBody) return;

    // ISS model (simple box with solar panels)
    const issGeometry = new THREE.Group();

    // Main body
    const bodyGeom = new THREE.BoxGeometry(10, 4, 6); // 10m x 4m x 6m (scaled up for visibility)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.8,
      roughness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
    issGeometry.add(bodyMesh);

    // Solar panels
    const panelGeom = new THREE.BoxGeometry(35, 0.5, 12); // Large solar arrays
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.5,
      roughness: 0.3,
    });

    const leftPanel = new THREE.Mesh(panelGeom, panelMat);
    leftPanel.position.set(-22.5, 0, 0);
    issGeometry.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeom, panelMat);
    rightPanel.position.set(22.5, 0, 0);
    issGeometry.add(rightPanel);

    // Radiators
    const radGeom = new THREE.BoxGeometry(8, 0.3, 3);
    const radMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const radiator = new THREE.Mesh(radGeom, radMat);
    radiator.position.set(0, 2.5, 0);
    issGeometry.add(radiator);

    // Convert Earth radius to scene units (matches the rendered Planet globe)
    const bodyScale = trueScale ? 1 : VISUAL_RADIUS_SCALE;
    const earthRadius = earthBody.physical.radius * bodyScale;
    const visualEarthRadius = trueScale ? earthRadius : Math.max(earthRadius, MIN_VISUAL_RADIUS);

    // Create orbit line (pre-calculated path)
    const orbitPoints: THREE.Vector3[] = [];
    const orbitRadius = visualEarthRadius + 408 * bodyScale; // ISS altitude (negligible at visual scale)

    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      // ISS orbit inclination ~51.6 degrees
      const inc = THREE.MathUtils.degToRad(51.6);
      const x = orbitRadius * Math.cos(angle);
      const y = orbitRadius * Math.sin(angle) * Math.sin(inc);
      const z = orbitRadius * Math.sin(angle) * Math.cos(inc);
      orbitPoints.push(new THREE.Vector3(x, y, z));
    }

    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      linewidth: 1,
    });
    const orbit = new THREE.Line(orbitGeom, orbitMat);
    orbit.renderOrder = 5;

    // Scale the ISS wire-model (~40 unit extent) to stay proportional to the
    // rendered Earth globe instead of dwarfing it.
    issGeometry.scale.setScalar((visualEarthRadius * 0.2) / 40);

    scene.add(issGeometry);
    scene.add(orbit);

    setISSMesh(issGeometry as any);
    setOrbitLine(orbit);

    return () => {
      scene.remove(issGeometry);
      scene.remove(orbit);
      issGeometry.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      orbit.geometry.dispose();
      orbit.material.dispose();
      setISSMesh(null);
      setOrbitLine(null);
    };
  }, [enabled, earthBody, scene, trueScale]);

  // Update ISS position and orientation
  useFrame(() => {
    if (!enabled || !issMesh || !issPosition) return;

    const bodyScale = trueScale ? 1 : VISUAL_RADIUS_SCALE;
    const earthRadius = earthBody.physical.radius * bodyScale;
    const visualEarthRadius = trueScale ? earthRadius : Math.max(earthRadius, MIN_VISUAL_RADIUS);

    // Convert ISS lat/lon/alt to 3D position
    const pos = latLonAltToVector3(
      issPosition.latitude,
      issPosition.longitude,
      issPosition.altitude,
      visualEarthRadius
    );

    issMesh.position.copy(pos);

    // Orient ISS to face direction of motion (tangent to orbit)
    // Calculate velocity vector (perpendicular to radius and orbit normal)
    const orbitNormal = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(51.6)), Math.cos(THREE.MathUtils.degToRad(51.6)));
    const radialDir = pos.clone().normalize();
    const velocityDir = new THREE.Vector3().crossVectors(orbitNormal, radialDir).normalize();

    // Point ISS forward along velocity (lookAt takes target position, not direction)
    issMesh.lookAt(pos.clone().add(velocityDir));

    // Sun direction (simplified - assume Sun is at origin)
    const sunDir = new THREE.Vector3().negate().normalize(); // From Earth to Sun

    // Rotate solar panels to track Sun (simplified)
    issMesh.traverse(child => {
      if (child instanceof THREE.Mesh && child.geometry.type === 'BoxGeometry') {
        const geom = child.geometry as THREE.BoxGeometry;
        if (geom.parameters.width > 20) { // Solar panels
          // Panels should be perpendicular to Sun direction
          child.lookAt(pos.clone().add(sunDir));
        }
      }
    });
  });

  return null; // We manipulate scene directly
}

/**
 * ISS Info Panel UI component
 */
export function ISSInfoPanel({ enabled, issPosition }: { enabled: boolean; issPosition: ISSPosition | null }) {
  if (!enabled) return null;

  return (
    <div className="iss-info-panel" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.85)',
      border: '1px solid #00ffff',
      borderRadius: '8px',
      padding: '16px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      minWidth: '240px',
      boxShadow: '0 4px 20px rgba(0,255,255,0.2)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #00ffff44'
      }}>
        <span style={{ color: '#00ffff', fontWeight: 'bold', fontSize: '14px' }}>🛰️ ISS TRACKER</span>
        <span style={{
          color: issPosition ? '#00ff00' : '#ffaa00',
          fontSize: '10px'
        }}>
          {issPosition ? 'LIVE' : 'CONNECTING...'}
        </span>
      </div>

      {issPosition ? (
        <>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#888' }}>Latitude: </span>
            <span>{issPosition.latitude.toFixed(4)}°</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#888' }}>Longitude: </span>
            <span>{issPosition.longitude.toFixed(4)}°</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#888' }}>Altitude: </span>
            <span>{issPosition.altitude} km</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: '#888' }}>Velocity: </span>
            <span>{issPosition.velocity.toFixed(2)} km/s</span>
          </div>
          <div style={{ marginBottom: '6px', fontSize: '10px', color: '#666' }}>
            Updated: {new Date(issPosition.timestamp).toISOString().slice(11, 19)} UTC
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
            Data: Open Notify API (open-notify.org)
          </div>
        </>
      ) : (
        <div style={{ color: '#ffaa00', textAlign: 'center' }}>
          Fetching ISS position...
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage ISS tracker state
 */
export function useISSTracker() {
  const [enabled, setEnabled] = useState(false);
  const [issPosition, setISSPosition] = useState<ISSPosition | null>(null);

  const toggle = () => setEnabled(!enabled);

  return { enabled, issPosition, setISSPosition, toggle };
}