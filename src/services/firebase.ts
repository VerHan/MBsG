// ============================================================
// RIFTBOUND: SLAYER CORPS — Firebase Initialization
// Supports both Vite .env vars and optional UI-saved config.
// Falls back cleanly to offline LocalStorage when unconfigured.
// ============================================================

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfigInput {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const CONFIG_STORAGE_KEY = 'riftbound_firebase_config_v1';

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function getFirebaseConfig(): FirebaseConfigInput | null {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const envProject = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;

  if (envKey && envProject) {
    return {
      apiKey: envKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
      projectId: envProject,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
    };
  }

  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FirebaseConfigInput;
    if (parsed.apiKey && parsed.projectId) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function saveCustomFirebaseConfig(cfg: FirebaseConfigInput) {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(cfg));
  _app = null;
  _db = null;
}

export function clearCustomFirebaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  _app = null;
  _db = null;
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}

export function getDb(): Firestore | null {
  if (_db) return _db;
  const cfg = getFirebaseConfig();
  if (!cfg) return null;

  try {
    _app = getApps().length > 0 ? getApps()[0] : initializeApp(cfg);
    _db = getFirestore(_app);
    return _db;
  } catch (err) {
    console.warn('[Firebase] Gagal inisialisasi:', err);
    return null;
  }
}
