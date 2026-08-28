import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';

// Firebase configuration - replace with your own config from Firebase Console
// For development, these can be placeholder values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789:web:abcdef',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX',
};

// Initialize Firebase app (singleton)
let app: FirebaseApp;
let db: Firestore;
let analytics: Analytics | null = null;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

db = getFirestore(app);

// Initialize Analytics only in browser and if supported
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
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