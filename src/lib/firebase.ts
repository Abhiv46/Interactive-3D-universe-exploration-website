import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';

/**
 * Firebase is only initialized when a REAL config is present in the environment
 * (.env with VITE_FIREBASE_* vars). Without it, nothing is initialized and NO
 * network calls happen. The previous code fell back to placeholder values
 * (demo-project / G-XXXXXXXXXX), which made the Firebase SDK fire real HTTP
 * requests that the servers rejected with 400 — spamming the console on every
 * load and on every analytics event.
 */
const hasRealConfig =
  typeof import.meta.env.VITE_FIREBASE_API_KEY === 'string' &&
  import.meta.env.VITE_FIREBASE_API_KEY.length > 0 &&
  typeof import.meta.env.VITE_FIREBASE_PROJECT_ID === 'string' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID.length > 0;

const firebaseConfig = hasRealConfig
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    }
  : null;

// Initialize Firebase app (singleton) - only when a real config exists
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;

if (firebaseConfig) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    if (app) {
      db = getFirestore(app);
    }
  } catch {
    // Fail silently
    app = null;
    db = null;
  }

  // Initialize Analytics only in browser and if supported
  if (typeof window !== 'undefined' && app) {
    isSupported()
      .then((supported) => {
        if (supported && app) {
          try {
            analytics = getAnalytics(app);
          } catch {
            // Fail silently
          }
        }
      })
      .catch(() => {
        // Fail silently
      });
  }
}

export { app, db, analytics };

// Collection names
export const COLLECTIONS = {
  FEEDBACK: 'feedback',
  BUG_REPORTS: 'bugReports',
} as const;

// Types for our data
export interface FeedbackData {
  id?: string;
  type: 'feedback' | 'bug';
  rating: number; // 1-5 stars
  message: string;
  email?: string;
  // Auto-captured metadata
  url: string;
  userAgent: string;
  viewport: { width: number; height: number };
  timestamp: Date;
  // Context from app
  currentView?: {
    selectedBody?: string;
    cameraPosition?: { x: number; y: number; z: number };
    julianDate?: number;
    timeScale?: number;
  };
}

export interface BugReportData extends FeedbackData {
  type: 'bug';
  // Additional bug-specific fields
  consoleErrors?: string[];
  networkErrors?: string[];
}