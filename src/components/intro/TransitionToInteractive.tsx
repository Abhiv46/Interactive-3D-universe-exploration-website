import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

interface TransitionToInteractiveProps {
  onComplete: () => void;
}

/**
 * Transition Phase — Camera flies to default solar system view,
 * main scene fades in, UI fades in, simulation starts
 * Duration: ~2 seconds
 */
export function TransitionToInteractive({ onComplete }: TransitionToInteractiveProps) {
  const { camera } = useThree();
  const startTime = useRef(performance.now());
  const hasCompleted = useRef(false);
  const duration = 2000; // ms

  // Target camera position for solar system view (matching default Scene camera)
  const targetPosition = useRef(new THREE.Vector3(0, 120, 1500));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Starting position (from end of solar system formation)
  const startPosition = useRef(new THREE.Vector3(0, 80, 200));
  const startLookAt = useRef(new THREE.Vector3(0, 0, 0));

  // Easing function: cubic ease-in-out
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  useFrame(({ clock }) => {
    const elapsed = (performance.now() - startTime.current) / 1000;
    const progress = Math.min(elapsed / (duration / 1000), 1);
    const eased = easeInOutCubic(progress);

    // Animate camera position
    camera.position.lerpVectors(startPosition.current, targetPosition.current, eased);
    camera.lookAt(
      new THREE.Vector3().lerpVectors(startLookAt.current, targetLookAt.current, eased)
    );

    // Update camera projection if needed
    camera.updateProjectionMatrix();

    // When transition completes, signal completion
    if (progress >= 1 && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
    }
  });

  // This component doesn't render anything visible - it just animates the camera
  // The actual scene is rendered by the main Canvas in App.tsx
  return null;
}

TransitionToInteractive.displayName = 'TransitionToInteractive';