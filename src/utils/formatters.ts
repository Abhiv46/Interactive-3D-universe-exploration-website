import { AU, SECONDS_PER_DAY, SECONDS_PER_YEAR } from '@/engine/Constants';

/**
 * Format distance in meters to human-readable string (AU, km, etc.)
 */
export function formatDistance(meters: number): string {
  if (meters >= AU) {
    const au = meters / AU;
    if (au >= 1000) {
      return `${(au / 1000).toFixed(2)} kAU`;
    }
    return `${au.toFixed(3)} AU`;
  }
  if (meters >= 1e6) {
    return `${(meters / 1e6).toFixed(0)} km`;
  }
  if (meters >= 1e3) {
    return `${(meters / 1e3).toFixed(0)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

/**
 * Format period in seconds to human-readable string (years, days, hours)
 */
export function formatPeriod(seconds: number): string {
  if (seconds >= SECONDS_PER_YEAR) {
    const years = seconds / SECONDS_PER_YEAR;
    if (years >= 1000) {
      return `${(years / 1000).toFixed(2)} kyr`;
    }
    if (years >= 1) {
      return `${years.toFixed(2)} years`;
    }
  }
  if (seconds >= SECONDS_PER_DAY) {
    const days = seconds / SECONDS_PER_DAY;
    return `${days.toFixed(2)} days`;
  }
  if (seconds >= 3600) {
    const hours = seconds / 3600;
    return `${hours.toFixed(2)} hours`;
  }
  if (seconds >= 60) {
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} minutes`;
  }
  return `${seconds.toFixed(0)} seconds`;
}

/**
 * Format mass in kg to human-readable string
 */
export function formatMass(kg: number): string {
  if (kg >= 1e24) {
    return `${(kg / 1e24).toFixed(2)} × 10²⁴ kg`;
  }
  if (kg >= 1e21) {
    return `${(kg / 1e21).toFixed(2)} × 10²¹ kg`;
  }
  if (kg >= 1e18) {
    return `${(kg / 1e18).toFixed(2)} × 10¹⁸ kg`;
  }
  if (kg >= 1e15) {
    return `${(kg / 1e15).toFixed(2)} × 10¹⁵ kg`;
  }
  return kg.toExponential(2);
}

/**
 * Format radius in meters to human-readable string
 */
export function formatRadius(meters: number): string {
  if (meters >= 1e6) {
    return `${(meters / 1e6).toFixed(1)} km`;
  }
  if (meters >= 1e3) {
    return `${(meters / 1e3).toFixed(1)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format Julian Date to human-readable
 */
export function formatJulianDate(jd: number): string {
  // Convert JD to Date
  const unixMs = (jd - 2440587.5) * 86400000;
  const date = new Date(unixMs);
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Julian Date
 */
export function dateToJulianDate(date: Date): number {
  const unixMs = date.getTime();
  return unixMs / 86400000 + 2440587.5;
}