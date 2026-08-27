import { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

type OrbitControlsType = InstanceType<typeof OrbitControlsImpl>;

interface TouchControlsOptions {
  enabled?: boolean;
  onObjectSelect?: (object: THREE.Object3D, event: TouchEvent) => void;
  camera?: THREE.Camera;
  renderer?: THREE.WebGLRenderer;
}

/**
 * Custom hook for mobile/touch controls
 * Handles pinch-to-zoom, single-finger drag to rotate, tap to select
 */
export function useTouchControls({
  enabled = true,
  onObjectSelect,
  camera,
  renderer,
}: TouchControlsOptions) {
  const controlsRef = useRef<OrbitControlsType | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Touch state tracking
  const touchState = useRef({
    startDistance: 0,
    startZoom: 0,
    isPinching: false,
    lastTouchTime: 0,
    lastTouchPosition: new THREE.Vector2(),
    tapTimeout: null as ReturnType<typeof setTimeout> | null,
  });

  // Detect touch device
  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const registerControls = useCallback((controls: OrbitControlsType | null) => {
    controlsRef.current = controls;

    if (!controls || !enabled) return;

    const domElement = controls.domElement;
    if (!domElement) return;

    // Touch event handlers
    const handleTouchStart = (event: TouchEvent) => {
      if (!enabled) return;

      const touches = event.touches;
      const now = Date.now();

      // Single finger - potential tap or drag
      if (touches.length === 1) {
        const touch = touches[0];
        touchState.current.lastTouchPosition.set(touch.clientX, touch.clientY);
        touchState.current.lastTouchTime = now;

        // Clear any pending tap timeout
        if (touchState.current.tapTimeout) {
          clearTimeout(touchState.current.tapTimeout);
        }

        // Set up tap detection (tap = touch < 300ms, minimal movement)
        touchState.current.tapTimeout = setTimeout(() => {
          touchState.current.tapTimeout = null;
        }, 300);
      }
      // Two fingers - pinch to zoom
      else if (touches.length === 2) {
        const touch1 = touches[0];
        const touch2 = touches[1];

        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        touchState.current.startDistance = Math.sqrt(dx * dx + dy * dy);
        touchState.current.startZoom = 1; // Default zoom scale
        touchState.current.isPinching = true;

        // Prevent default browser zoom
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!enabled) return;

      const touches = event.touches;

      // Two fingers - pinch zoom
      if (touches.length === 2 && touchState.current.isPinching) {
        const touch1 = touches[0];
        const touch2 = touches[1];

        const dx = touch2.clientX - touch1.clientX;
        const dy = touch2.clientY - touch1.clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);

        const zoomFactor = currentDistance / touchState.current.startDistance;
        const newZoom = touchState.current.startZoom / zoomFactor;

        // Apply zoom (invert because OrbitControls zoom is opposite)
        // dollyIn expects a distance factor, not absolute zoom
        const zoomDelta = (1 - zoomFactor) * 0.5; // Scale factor
        if (zoomFactor < 1) {
          // Pinch in = zoom in
          controls.dollyIn(1 + (1 - zoomFactor));
        } else {
          // Pinch out = zoom out
          controls.dollyOut(1 + (zoomFactor - 1));
        }

        event.preventDefault();
      }
      // Single finger - drag to rotate (handled by OrbitControls)
      // We just clear tap timeout if movement is significant
      else if (touches.length === 1 && touchState.current.tapTimeout) {
        const touch = touches[0];
        const dx = touch.clientX - touchState.current.lastTouchPosition.x;
        const dy = touch.clientY - touchState.current.lastTouchPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If moved more than 10px, it's a drag not a tap
        if (distance > 10) {
          clearTimeout(touchState.current.tapTimeout!);
          touchState.current.tapTimeout = null;
        }
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!enabled) return;

      const touches = event.changedTouches;

      // Check for tap (single touch ended quickly with minimal movement)
      if (touches.length === 1 && touchState.current.tapTimeout) {
        clearTimeout(touchState.current.tapTimeout);
        touchState.current.tapTimeout = null;

        const touch = touches[0];
        const dx = touch.clientX - touchState.current.lastTouchPosition.x;
        const dy = touch.clientY - touchState.current.lastTouchPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - touchState.current.lastTouchTime;

        // Tap: quick touch (< 300ms) with minimal movement (< 10px)
        if (elapsed < 300 && distance < 10 && onObjectSelect && camera && renderer) {
          // Perform raycast for object selection
          const rect = renderer.domElement.getBoundingClientRect();
          const mouse = new THREE.Vector2(
            ((touch.clientX - rect.left) / rect.width) * 2 - 1,
            -((touch.clientY - rect.top) / rect.height) * 2 + 1
          );

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);

          // Get all selectable objects from scene
          const selectableObjects: THREE.Object3D[] = [];
          renderer.domElement.parentElement?.querySelectorAll('canvas') // Not ideal, need better way

          // Instead, we'll dispatch a custom event for the app to handle
          const tapEvent = new CustomEvent('cameratap', {
            detail: { clientX: touch.clientX, clientY: touch.clientY, originalEvent: event }
          });
          window.dispatchEvent(tapEvent);
        }
      }

      // End pinch
      if (touches.length < 2) {
        touchState.current.isPinching = false;
      }
    };

    // Mouse event handlers for desktop (also handle click to select)
    const handleClick = (event: MouseEvent) => {
      if (!onObjectSelect || !camera || !renderer) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Dispatch custom event
      const clickEvent = new CustomEvent('cameraclick', {
        detail: { clientX: event.clientX, clientY: event.clientY, originalEvent: event, raycaster }
      });
      window.dispatchEvent(clickEvent);
    };

    // Add event listeners
    domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    domElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    domElement.addEventListener('click', handleClick);

    return () => {
      domElement.removeEventListener('touchstart', handleTouchStart);
      domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd);
      domElement.removeEventListener('click', handleClick);
    };
  }, [enabled, onObjectSelect, camera, renderer]);

  return { registerControls, isTouchDevice };
}

/**
 * Hook for handling tap/click selection via custom events
 */
export function useCameraTapSelect(
  onSelect: (raycaster: THREE.Raycaster, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => void,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
) {
  useEffect(() => {
    const handleTap = (event: CustomEvent) => {
      const { clientX, clientY, raycaster } = event.detail;

      if (raycaster) {
        onSelect(raycaster, camera, renderer);
      } else if (clientX !== undefined && clientY !== undefined) {
        // Fallback: create raycaster from coordinates
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1
        );
        const newRaycaster = new THREE.Raycaster();
        newRaycaster.setFromCamera(mouse, camera);
        onSelect(newRaycaster, camera, renderer);
      }
    };

    window.addEventListener('cameratap', handleTap as EventListener);
    window.addEventListener('cameraclick', handleTap as EventListener);

    return () => {
      window.removeEventListener('cameratap', handleTap as EventListener);
      window.removeEventListener('cameraclick', handleTap as EventListener);
    };
  }, [onSelect, camera, renderer]);
}