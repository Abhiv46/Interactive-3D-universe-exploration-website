import { useCallback, useRef, useEffect, useState } from 'react';

/**
 * Accessibility utilities and hooks for Universe Explorer
 */

// Screen reader announcement queue
let announcementQueue: string[] = [];
let isAnnouncing = false;
const liveRegionRef = { current: null as HTMLDivElement | null };

/**
 * Initialize the live region for screen reader announcements
 */
function ensureLiveRegion() {
  if (liveRegionRef.current) return liveRegionRef.current;

  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = `
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `;
  document.body.appendChild(region);
  liveRegionRef.current = region;
  return region;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const region = ensureLiveRegion();
  region.setAttribute('aria-live', priority);
  region.textContent = '';
  // Force reflow
  region.offsetHeight;
  region.textContent = message;
}

/**
 * Queue announcements to prevent overlap
 */
export function queueAnnouncement(message: string, priority: 'polite' | 'assertive' = 'polite') {
  announcementQueue.push(message);
  processQueue();
}

async function processQueue() {
  if (isAnnouncing || announcementQueue.length === 0) return;

  isAnnouncing = true;
  const message = announcementQueue.shift()!;
  announce(message);

  // Wait for announcement to be read (roughly 100ms per 10 chars + base)
  const delay = Math.max(500, message.length * 50);
  await new Promise(resolve => setTimeout(resolve, delay));

  isAnnouncing = false;
  if (announcementQueue.length > 0) {
    processQueue();
  }
}

/**
 * Hook for making screen reader announcements
 */
export function useAnnouncer() {
  const announceCallback = useCallback((message: string, priority?: 'polite' | 'assertive') => {
    queueAnnouncement(message, priority);
  }, []);

  const announceImmediate = useCallback((message: string, priority?: 'polite' | 'assertive') => {
    announce(message, priority);
  }, []);

  return { announce: announceCallback, announceImmediate };
}

/**
 * Focus management utilities
 */

// Store last focused element for restoration
let lastFocusedElement: HTMLElement | null = null;

/**
 * Trap focus within an element (for modals/dialogs)
 */
export function trapFocus(element: HTMLElement) {
  lastFocusedElement = document.activeElement as HTMLElement;

  const focusableElements = element.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTab(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  element.addEventListener('keydown', handleTab);
  firstElement?.focus();

  return () => {
    element.removeEventListener('keydown', handleTab);
    lastFocusedElement?.focus();
  };
}

/**
 * Restore focus to previously focused element
 */
export function restoreFocus() {
  lastFocusedElement?.focus();
  lastFocusedElement = null;
}

/**
 * Hook for managing focus trap in modals/dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const cleanup = trapFocus(containerRef.current);
    return cleanup;
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for keyboard navigation in lists/grids
 */
export function useKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  onSelect: (index: number) => void,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    onEscape?: () => void;
  } = {}
) {
  const { orientation = 'vertical', loop = false, onEscape } = options;
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = focusedIndex >= 0 ? focusedIndex : 0;
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex + 1;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          e.preventDefault();
          newIndex = currentIndex - 1;
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentIndex >= 0 && currentIndex < items.length) {
          onSelect(currentIndex);
        }
        break;
      case 'Escape':
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        break;
    }

    // Handle looping
    if (newIndex !== currentIndex) {
      if (loop) {
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;
      } else {
        newIndex = Math.max(0, Math.min(newIndex, items.length - 1));
      }
      setFocusedIndex(newIndex);
      items[newIndex]?.focus();
    }
  }, [focusedIndex, items, onSelect, orientation, loop, onEscape]);

  return { handleKeyDown, focusedIndex, setFocusedIndex };
}

/**
 * Reduced motion preference hook
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

/**
 * High contrast preference hook
 */
export function useHighContrast(): boolean {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return highContrast;
}

/**
 * Hook for managing focus visible state (for custom focus styles)
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') setIsFocusVisible(true);
    };
    const handleMouseDown = () => setIsFocusVisible(false);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isFocusVisible;
}

/**
 * ARIA label helpers for common patterns
 */
export const ariaLabels = {
  // Navigation
  closeDialog: 'Close dialog',
  closePanel: 'Close panel',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  nextItem: 'Next item',
  previousItem: 'Previous item',

  // Actions
  play: 'Play simulation',
  pause: 'Pause simulation',
  reset: 'Reset to current time',
  screenshot: 'Take screenshot',
  share: 'Share current view',
  settings: 'Open settings',
  search: 'Search celestial objects',

  // Objects
  selectObject: (name: string) => `Select ${name}`,
  focusObject: (name: string) => `Focus camera on ${name}`,
  objectInfo: (name: string) => `${name} information`,

  // Time
  timeSpeed: (speed: string) => `Set simulation speed to ${speed}`,
  setDate: 'Set simulation date',
  julianDate: (jd: number) => `Julian Date ${jd.toFixed(5)}`,

  // Camera
  orbitMode: 'Switch to orbit camera mode',
  freeMode: 'Switch to free camera mode',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  pan: 'Pan camera',

  // Visual
  toggleOrbits: 'Toggle orbit lines visibility',
  toggleLabels: 'Toggle object labels',
  toggleAtmosphere: 'Toggle atmosphere effects',
  toggleAurora: 'Toggle aurora effect',
  toggleISS: 'Toggle ISS tracker',

  // Quality
  qualityPreset: (preset: string) => `Set quality to ${preset}`,
  toggleBloom: 'Toggle bloom effect',
  toggleFXAA: 'Toggle anti-aliasing',
};

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix = 'ue'): string {
  return `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Skip link component for keyboard users
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="skip-link"
      style={{
        position: 'absolute',
        top: '-100%',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: 'var(--fg-accent)',
        color: 'var(--bg-deep)',
        fontWeight: 'bold',
        borderRadius: '0 0 8px 8px',
        zIndex: 10000,
        textDecoration: 'none',
        transition: 'top 0.2s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.top = '0';
      }}
      onBlur={(e) => {
        e.currentTarget.style.top = '-100%';
      }}
    >
      Skip to main content
    </a>
  );
}

/**
 * Live region component for dynamic content announcements
 */
export function LiveRegion({ priority = 'polite' }: { priority?: 'polite' | 'assertive' }) {
  const [message, setMessage] = useState('');

  const announce = useCallback((msg: string) => {
    setMessage('');
    // Force re-render
    requestAnimationFrame(() => setMessage(msg));
  }, []);

  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {message}
    </div>
  );
}

/**
 * Hook to expose announce function from LiveRegion
 */
export function useLiveRegion() {
  const [, setMessage] = useState(0);

  return useCallback((msg: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(msg, priority);
  }, []);
}

/**
 * Check if element is visible to screen readers
 */
export function isVisibleToScreenReader(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.getAttribute('aria-hidden') !== 'true' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(isVisibleToScreenReader);
}