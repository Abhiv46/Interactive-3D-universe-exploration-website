import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CelestialBodyData } from '../../types/orbitalElements';
import { detectEclipses, EclipseEvent, getEclipseProgress } from '../../engine/EclipseSystem';
import { calculatePosition, fastPosition, precomputeOrbit, PrecomputedOrbit } from '../../engine/KeplerianOrbit';

interface EclipseVisualizerProps {
  bodies: Map<string, CelestialBodyData>;
  julianDate: number;
  timeScale: number;
}

/**
 * Renders eclipse shadows and effects
 * - Solar eclipse: Moon's shadow on Earth
 * - Lunar eclipse: Earth's shadow on Moon (umbra/penumbra)
 */
export function EclipseVisualizer({ bodies, julianDate, timeScale }: EclipseVisualizerProps) {
  const { scene } = useThree();
  const eclipseMeshesRef = useRef<THREE.Mesh[]>([]);

  // Detect eclipses
  const eclipses = useMemo(() => detectEclipses(bodies, julianDate), [bodies, julianDate]);

  // Create eclipse visualization meshes
  useFrame(() => {
    // Clean up old meshes
    eclipseMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose?.();
    });
    eclipseMeshesRef.current = [];

    if (eclipses.length === 0) return;

    const sun = bodies.get('sun');
    const earth = bodies.get('earth');
    const moon = bodies.get('moon');

    if (!sun || !earth || !moon || !sun.orbital || !earth.orbital || !moon.orbital) return;

    const sunPos = new THREE.Vector3(...calculatePosition(sun.orbital, julianDate));
    const earthPos = new THREE.Vector3(...calculatePosition(earth.orbital, julianDate));
    const moonPos = new THREE.Vector3(...calculatePosition(moon.orbital, julianDate));

    const sunRadius = sun.physical.radius;
    const earthRadius = earth.physical.radius;
    const moonRadius = moon.physical.radius;

    eclipses.forEach(eclipse => {
      const progress = getEclipseProgress(eclipse, julianDate);

      if (eclipse.type === 'lunar') {
        // Lunar eclipse: Earth's shadow on Moon
        renderLunarEclipseShadow(
          sunPos, earthPos, moonPos,
          sunRadius, earthRadius, moonRadius,
          eclipse, progress
        );
      } else if (eclipse.type === 'solar') {
        // Solar eclipse: Moon's shadow on Earth
        renderSolarEclipseShadow(
          sunPos, earthPos, moonPos,
          sunRadius, earthRadius, moonRadius,
          eclipse, progress
        );
      }
    });
  }, 1); // Run after render

  function renderLunarEclipseShadow(
    sunPos: THREE.Vector3,
    earthPos: THREE.Vector3,
    moonPos: THREE.Vector3,
    sunRadius: number,
    earthRadius: number,
    moonRadius: number,
    eclipse: EclipseEvent,
    progress: number
  ) {
    // Earth's shadow at Moon's distance
    const earthMoonDist = earthPos.distanceTo(moonPos);
    const earthSunDist = earthPos.distanceTo(sunPos);

    // Umbra cone
    const umbraAngle = Math.atan2(earthRadius - sunRadius, earthSunDist);
    const umbraLength = earthRadius / Math.tan(umbraAngle);

    if (earthMoonDist > umbraLength) return; // Moon beyond umbra

    // Umbra radius at Moon distance
    const umbraRadiusAtMoon = earthRadius - earthMoonDist * Math.tan(umbraAngle);

    // Penumbra
    const penumbraAngle = Math.atan2(earthRadius + sunRadius, earthSunDist);
    const penumbraRadiusAtMoon = earthRadius + earthMoonDist * Math.tan(penumbraAngle);

    // Direction from Earth to Moon (shadow center)
    const shadowDir = new THREE.Vector3().subVectors(moonPos, earthPos).normalize();
    const shadowCenter = new THREE.Vector3().addVectors(earthPos, shadowDir.clone().multiplyScalar(earthMoonDist));

    // Create umbra mesh (dark core)
    if (umbraRadiusAtMoon > 0) {
      const umbraGeometry = new THREE.CircleGeometry(umbraRadiusAtMoon, 64);
      const umbraMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.9 * eclipse.magnitude,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
      });
      const umbraMesh = new THREE.Mesh(umbraGeometry, umbraMaterial);
      umbraMesh.position.copy(shadowCenter);
      umbraMesh.lookAt(earthPos); // Face Earth
      umbraMesh.renderOrder = 100;
      scene.add(umbraMesh);
      eclipseMeshesRef.current.push(umbraMesh);
    }

    // Create penumbra mesh (lighter outer shadow)
    const penumbraGeometry = new THREE.RingGeometry(
      Math.max(0, umbraRadiusAtMoon),
      penumbraRadiusAtMoon,
      64
    );
    const penumbraMaterial = new THREE.MeshBasicMaterial({
      color: 0x332211, // Reddish tint for Earth's atmosphere filtering
      transparent: true,
      opacity: 0.4 * eclipse.magnitude,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    });
    const penumbraMesh = new THREE.Mesh(penumbraGeometry, penumbraMaterial);
    penumbraMesh.position.copy(shadowCenter);
    penumbraMesh.lookAt(earthPos);
    penumbraMesh.renderOrder = 99;
    scene.add(penumbraMesh);
    eclipseMeshesRef.current.push(penumbraMesh);
  }

  function renderSolarEclipseShadow(
    sunPos: THREE.Vector3,
    earthPos: THREE.Vector3,
    moonPos: THREE.Vector3,
    sunRadius: number,
    earthRadius: number,
    moonRadius: number,
    eclipse: EclipseEvent,
    progress: number
  ) {
    // Moon's shadow on Earth
    const sunMoonDist = sunPos.distanceTo(moonPos);
    const moonEarthDist = moonPos.distanceTo(earthPos);

    // Umbra cone from Moon
    const umbraAngle = Math.atan2(moonRadius - sunRadius, sunMoonDist);
    const umbraLength = moonRadius / Math.tan(Math.abs(umbraAngle));

    // Only render if umbra reaches Earth
    if (moonEarthDist > umbraLength) return;

    const umbraRadiusAtEarth = moonRadius - moonEarthDist * Math.tan(Math.abs(umbraAngle));

    // Penumbra
    const penumbraAngle = Math.atan2(moonRadius + sunRadius, sunMoonDist);
    const penumbraRadiusAtEarth = moonRadius + moonEarthDist * Math.tan(penumbraAngle);

    // Direction from Moon to Earth
    const shadowDir = new THREE.Vector3().subVectors(earthPos, moonPos).normalize();
    const shadowCenter = new THREE.Vector3().addVectors(moonPos, shadowDir.clone().multiplyScalar(moonEarthDist));

    // Create umbra spot on Earth
    if (umbraRadiusAtEarth > 0) {
      const umbraGeometry = new THREE.CircleGeometry(umbraRadiusAtEarth, 64);
      const umbraMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.95 * eclipse.magnitude,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.MultiplyBlending,
      });
      const umbraMesh = new THREE.Mesh(umbraGeometry, umbraMaterial);
      umbraMesh.position.copy(shadowCenter);
      umbraMesh.lookAt(moonPos);
      umbraMesh.renderOrder = 100;
      scene.add(umbraMesh);
      eclipseMeshesRef.current.push(umbraMesh);
    }

    // Penumbra ring
    const penumbraGeometry = new THREE.RingGeometry(
      Math.max(0, umbraRadiusAtEarth),
      penumbraRadiusAtEarth,
      64
    );
    const penumbraMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.3 * eclipse.magnitude,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
    });
    const penumbraMesh = new THREE.Mesh(penumbraGeometry, penumbraMaterial);
    penumbraMesh.position.copy(shadowCenter);
    penumbraMesh.lookAt(moonPos);
    penumbraMesh.renderOrder = 99;
    scene.add(penumbraMesh);
    eclipseMeshesRef.current.push(penumbraMesh);
  }

  return null; // This component doesn't render JSX directly, it manipulates the scene
}

/**
 * Eclipse indicator UI component - shows eclipse status in the UI
 */
export function EclipseIndicator({ bodies, julianDate }: { bodies: Map<string, CelestialBodyData>; julianDate: number }) {
  const eclipses = useMemo(() => detectEclipses(bodies, julianDate), [bodies, julianDate]);

  if (eclipses.length === 0) return null;

  return (
    <div className="eclipse-indicator" style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 100,
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid #444',
      borderRadius: '8px',
      padding: '12px 16px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '12px',
      minWidth: '200px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#ffaa00' }}>
        ⚡ ECLIPSE IN PROGRESS
      </div>
      {eclipses.map((eclipse, i) => (
        <div key={i} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
          <div style={{ textTransform: 'capitalize' }}>
            {eclipse.type === 'solar' ? '☀️ Solar' : '🌙 Lunar'} Eclipse
          </div>
          <div>Magnitude: {(eclipse.magnitude * 100).toFixed(1)}%</div>
          <div>Type: {eclipse.isTotal ? 'Total' : 'Partial'}</div>
          <div>Peak: {new Date((eclipse.peakTime - 2451545) * 86400000).toISOString().slice(11, 19)} UTC</div>
        </div>
      ))}
    </div>
  );
}