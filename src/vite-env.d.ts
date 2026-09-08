/// <reference types="vite/client" />
/// <reference types="three" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __THREE__?: {
    scene: THREE.Scene;
    camera: THREE.Camera;
    gl: THREE.WebGLRenderer;
    THREE: any;
    /** Test seam: trigger a real animated fly-to by body id (set in Scene.tsx onCreated). */
    flyTo?: (bodyId: string, duration?: number) => void;
  };
  __galaxyCamera?: any;
  __julianDate__?: number;
  /** Test seam: overrides ScreenshotButton's 2× default (see ScreenshotButton.tsx). */
  __screenshotMultiplier__?: number;
}