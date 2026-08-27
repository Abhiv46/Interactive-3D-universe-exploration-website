import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Level of Detail (LOD) system for celestial bodies
 * Automatically switches between mesh detail levels based on camera distance
 */

export interface LODLevel {
  name: string;
  maxDistance: number; // Maximum distance (meters) to use this level
  detail: 'high' | 'medium' | 'low' | 'billboard' | 'point';
  geometry?: THREE.BufferGeometry;
  material?: THREE.Material;
  segments?: number;
  textureResolution?: number;
}

export interface LODConfig {
  levels: LODLevel[];
  hysteresis: number; // Distance factor to prevent flickering (e.g., 1.1 = 10% hysteresis)
}

export interface LODState {
  currentLevel: number;
  currentDetail: LODLevel['detail'];
  distance: number;
  shouldRender: boolean;
}

// Default LOD configurations for different body types
export const PLANET_LOD_CONFIG: LODConfig = {
  hysteresis: 1.15,
  levels: [
    {
      name: 'high',
      maxDistance: 50000000, // 50,000 km
      detail: 'high',
      segments: 128,
      textureResolution: 4096,
    },
    {
      name: 'medium',
      maxDistance: 500000000, // 500,000 km
      detail: 'medium',
      segments: 64,
      textureResolution: 2048,
    },
    {
      name: 'low',
      maxDistance: 5000000000, // 5,000,000 km
      detail: 'low',
      segments: 32,
      textureResolution: 1024,
    },
    {
      name: 'billboard',
      maxDistance: 50000000000, // 50,000,000 km
      detail: 'billboard',
      textureResolution: 512,
    },
    {
      name: 'point',
      maxDistance: Infinity,
      detail: 'point',
    },
  ],
};

export const MOON_LOD_CONFIG: LODConfig = {
  hysteresis: 1.2,
  levels: [
    {
      name: 'high',
      maxDistance: 5000000, // 5,000 km
      detail: 'high',
      segments: 64,
      textureResolution: 2048,
    },
    {
      name: 'medium',
      maxDistance: 50000000, // 50,000 km
      detail: 'medium',
      segments: 32,
      textureResolution: 1024,
    },
    {
      name: 'low',
      maxDistance: 500000000, // 500,000 km
      detail: 'low',
      segments: 16,
      textureResolution: 512,
    },
    {
      name: 'billboard',
      maxDistance: 5000000000, // 5,000,000 km
      detail: 'billboard',
      textureResolution: 256,
    },
    {
      name: 'point',
      maxDistance: Infinity,
      detail: 'point',
    },
  ],
};

export const STAR_LOD_CONFIG: LODConfig = {
  hysteresis: 1.0,
  levels: [
    {
      name: 'point',
      maxDistance: Infinity,
      detail: 'point',
    },
  ],
};

export const GALAXY_LOD_CONFIG: LODConfig = {
  hysteresis: 1.1,
  levels: [
    {
      name: 'volumetric',
      maxDistance: 100000 * 3.086e16, // 100,000 ly in meters
      detail: 'high',
    },
    {
      name: 'sprite',
      maxDistance: Infinity,
      detail: 'billboard',
    },
  ],
};

export function useLOD(
  config: LODConfig,
  cameraPosition: THREE.Vector3,
  objectPosition: THREE.Vector3,
  objectRadius: number = 0
): LODState {
  const [currentLevel, setCurrentLevel] = useState(0);

  const distance = useMemo(() => {
    return cameraPosition.distanceTo(objectPosition);
  }, [cameraPosition, objectPosition]);

  // Calculate effective distance (accounting for object radius)
  const effectiveDistance = useMemo(() => {
    return Math.max(distance - objectRadius, 1);
  }, [distance, objectRadius]);

  // Determine appropriate LOD level
  useEffect(() => {
    const levels = config.levels;
    const hysteresis = config.hysteresis;

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const maxDist = level.maxDistance;

      // Apply hysteresis when moving to a lower detail level
      const effectiveMaxDist = i > currentLevel ? maxDist * hysteresis : maxDist;

      if (effectiveDistance <= effectiveMaxDist) {
        if (i !== currentLevel) {
          setCurrentLevel(i);
        }
        break;
      }
    }
  }, [effectiveDistance, config.levels, config.hysteresis, currentLevel]);

  const currentDetail = config.levels[currentLevel]?.detail ?? 'point';
  const shouldRender = effectiveDistance < config.levels[config.levels.length - 1].maxDistance;

  return {
    currentLevel,
    currentDetail,
    distance: effectiveDistance,
    shouldRender,
  };
}

// Hook for managing multiple LOD objects efficiently
export function useLODManager(
  objects: Array<{
    id: string;
    position: THREE.Vector3;
    radius: number;
    config: LODConfig;
  }>,
  cameraPosition: THREE.Vector3
): Map<string, LODState> {
  const lodStatesRef = useRef(new Map<string, LODState>());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const newStates = new Map<string, LODState>();

    for (const obj of objects) {
      const distance = cameraPosition.distanceTo(obj.position);
      const effectiveDistance = Math.max(distance - obj.radius, 1);

      let level = 0;
      for (let i = 0; i < obj.config.levels.length; i++) {
        if (effectiveDistance <= obj.config.levels[i].maxDistance) {
          level = i;
          break;
        }
      }

      newStates.set(obj.id, {
        currentLevel: level,
        currentDetail: obj.config.levels[level]?.detail ?? 'point',
        distance: effectiveDistance,
        shouldRender: effectiveDistance < obj.config.levels[obj.config.levels.length - 1].maxDistance,
      });
    }

    lodStatesRef.current = newStates;
    forceUpdate(n => n + 1);
  }, [cameraPosition, objects]);

  return lodStatesRef.current;
}

// Utility to get LOD geometry detail level
export function getLODSegments(detail: LODLevel['detail'], baseSegments: number): number {
  switch (detail) {
    case 'high':
      return baseSegments;
    case 'medium':
      return Math.max(baseSegments / 2, 16);
    case 'low':
      return Math.max(baseSegments / 4, 8);
    case 'billboard':
    case 'point':
      return 4; // Simple quad for billboard
    default:
      return baseSegments;
  }
}

// Utility to get texture resolution for LOD
export function getLODTextureResolution(detail: LODLevel['detail'], baseResolution: number): number {
  switch (detail) {
    case 'high':
      return baseResolution;
    case 'medium':
      return Math.max(baseResolution / 2, 512);
    case 'low':
      return Math.max(baseResolution / 4, 256);
    case 'billboard':
      return Math.max(baseResolution / 8, 128);
    case 'point':
      return 64;
    default:
      return baseResolution;
  }
}

// Billboard geometry for distant objects
export function createBillboardGeometry(size: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.deleteAttribute('normal');
  return geometry;
}

// Point geometry for very distant objects
export function createPointGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  return geometry;
}