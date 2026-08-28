import { analytics } from './firebase';
import { logEvent, setUserProperties } from 'firebase/analytics';

/**
 * Event names for consistent tracking
 */
export const ANALYTICS_EVENTS = {
  // Navigation & engagement
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',

  // Planet/body interactions
  PLANET_CLICK: 'planet_click',
  PLANET_HOVER: 'planet_hover',
  PLANET_FOCUS: 'planet_focus', // Camera flew to planet

  // UI interactions
  SETTINGS_OPENED: 'settings_opened',
  SETTINGS_CHANGED: 'settings_changed',
  SEARCH_USED: 'search_used',
  DATE_PICKER_USED: 'date_picker_used',
  TIME_CONTROL_USED: 'time_control_used',

  // Features
  SCREENSHOT_TAKEN: 'screenshot_taken',
  SHARE_VIEW_CREATED: 'share_view_created',
  SHARE_VIEW_LOADED: 'share_view_loaded',
  LOW_PERFORMANCE_TOGGLED: 'low_performance_toggled',
  SURFACE_ZOOM_USED: 'surface_zoom_used',
  ECLIPSE_VIEWED: 'eclipse_viewed',
  ISS_TRACKED: 'iss_tracked',
  AURORA_VIEWED: 'aurora_viewed',

  // Feedback
  FEEDBACK_OPENED: 'feedback_opened',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  BUG_REPORT_SUBMITTED: 'bug_report_submitted',

  // Mobile/touch
  TOUCH_PINCH_ZOOM: 'touch_pinch_zoom',
  TOUCH_DRAG_ROTATE: 'touch_drag_rotate',
  TOUCH_TAP_SELECT: 'touch_tap_select',
} as const;

type EventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track an analytics event
 */
export function trackEvent(eventName: string, params: EventParams = {}) {
  // Always log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, params);
  }

  // Send to Firebase Analytics if available
  if (analytics && typeof window !== 'undefined') {
    try {
      logEvent(analytics, eventName, params);
    } catch (error) {
      console.warn('Analytics error:', error);
    }
  }

  // Also send to Vercel Analytics if available (for edge)
  if (typeof window !== 'undefined' && (window as any).va) {
    try {
      (window as any).va('track', eventName, params);
    } catch {
      // Ignore
    }
  }
}

/**
 * Track page view (for SPA navigation)
 */
export function trackPageView(path: string, title: string) {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page_path: path,
    page_title: title,
  });
}

/**
 * Track planet click with context
 */
export function trackPlanetClick(planetId: string, planetName: string, method: 'click' | 'search' | 'keyboard') {
  trackEvent(ANALYTICS_EVENTS.PLANET_CLICK, {
    planet_id: planetId,
    planet_name: planetName,
    selection_method: method,
  });
}

/**
 * Track planet focus (camera flew to it)
 */
export function trackPlanetFocus(planetId: string, planetName: string) {
  trackEvent(ANALYTICS_EVENTS.PLANET_FOCUS, {
    planet_id: planetId,
    planet_name: planetName,
  });
}

/**
 * Track settings change
 */
export function trackSettingsChange(setting: string, value: string | number | boolean) {
  trackEvent(ANALYTICS_EVENTS.SETTINGS_CHANGED, {
    setting_name: setting,
    setting_value: String(value),
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUse(feature: string, action: string, metadata?: Record<string, any>) {
  trackEvent(feature, {
    action,
    ...metadata,
  });
}

/**
 * Track time spent (call on page unload or periodically)
 */
let sessionStartTime = Date.now();
let lastActiveTime = Date.now();

export function trackSessionTime() {
  const now = Date.now();
  const sessionDuration = (now - sessionStartTime) / 1000; // seconds
  const timeSinceActive = (now - lastActiveTime) / 1000;

  // Only track if user was active recently (within 30 seconds)
  if (timeSinceActive < 30) {
    trackEvent(ANALYTICS_EVENTS.SESSION_END, {
      session_duration_seconds: Math.round(sessionDuration),
    });
  }

  lastActiveTime = now;
}

// Update last active time on user interaction
if (typeof window !== 'undefined') {
  ['click', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    window.addEventListener(event, () => {
      lastActiveTime = Date.now();
    }, { passive: true });
  });

  // Track session end on page unload
  window.addEventListener('beforeunload', trackSessionTime, { passive: true });

  // Track initial page view
  trackPageView(window.location.pathname, document.title);
}

/**
 * Initialize user properties for segmentation
 */
export function initUserProperties() {
  if (analytics && typeof window !== 'undefined') {
    try {
      setUserProperties(analytics, {
        is_mobile: /Mobi|Android/i.test(navigator.userAgent),
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        language: navigator.language,
      });
    } catch {
      // Ignore
    }
  }
}