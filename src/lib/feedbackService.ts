import {
  collection,
  addDoc,
  serverTimestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import type { FeedbackData, BugReportData } from './firebase';

interface DeviceInfo {
  userAgent: string;
  viewport: { width: number; height: number };
  consoleErrors: string[];
  networkErrors: string[];
}

/**
 * Capture current browser/device info for debugging
 */
function captureDeviceInfo(): DeviceInfo {
  const errors: string[] = [];
  const networkErrors: string[] = [];

  // Capture console errors if available
  if (typeof window !== 'undefined') {
    // We can't easily capture historical console errors, but we can note the state
    const originalError = console.error;
    console.error = (...args) => {
      errors.push(args.join(' '));
      originalError.apply(console, args);
    };

    // Capture fetch/XHR errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          networkErrors.push(`HTTP ${response.status}: ${args[0]}`);
        }
        return response;
      } catch (err) {
        networkErrors.push(`Network error: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    };
  }

  return {
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    consoleErrors: errors,
    networkErrors: networkErrors,
  };
}

/**
 * Get current app context (selected body, camera, time, etc.)
 */
function getAppContext(): FeedbackData['currentView'] {
  // This will be populated by the component that has access to the state
  return {};
}

/**
 * Submit general feedback to Firestore
 */
export async function submitFeedback(
  data: Omit<FeedbackData, 'id' | 'timestamp' | 'userAgent' | 'viewport' | 'url'>
): Promise<DocumentReference> {
  const deviceInfo = captureDeviceInfo();

  const feedbackData: FeedbackData = {
    ...data,
    type: 'feedback',
    url: window.location.href,
    userAgent: deviceInfo.userAgent,
    viewport: deviceInfo.viewport,
    timestamp: new Date(),
    currentView: getAppContext(),
  };

  const docRef = await addDoc(collection(db, 'feedback'), {
    ...feedbackData,
    timestamp: serverTimestamp(),
  });

  return docRef;
}

/**
 * Submit bug report to Firestore
 */
export async function submitBugReport(
  data: Omit<BugReportData, 'id' | 'timestamp' | 'userAgent' | 'viewport' | 'url' | 'consoleErrors' | 'networkErrors'>
): Promise<DocumentReference> {
  const deviceInfo = captureDeviceInfo();

  const bugData: BugReportData = {
    ...data,
    type: 'bug',
    url: window.location.href,
    userAgent: deviceInfo.userAgent,
    viewport: deviceInfo.viewport,
    consoleErrors: deviceInfo.consoleErrors,
    networkErrors: deviceInfo.networkErrors,
    timestamp: new Date(),
    currentView: getAppContext(),
  };

  const docRef = await addDoc(collection(db, 'bugReports'), {
    ...bugData,
    timestamp: serverTimestamp(),
  });

  return docRef;
}

/**
 * Unified submit function that handles both feedback and bug reports
 */
export async function submitFeedbackOrBug(
  type: 'feedback' | 'bug',
  rating: number,
  message: string,
  email?: string
): Promise<DocumentReference> {
  if (type === 'bug') {
    return submitBugReport({ type: 'bug', rating, message, email });
  }
  return submitFeedback({ type: 'feedback', rating, message, email });
}