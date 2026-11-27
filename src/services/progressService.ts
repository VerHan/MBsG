// ============================================================
// RIFTBOUND: SLAYER CORPS — Student Progress Service
// Offline-first LocalStorage + automatic Firebase Firestore sync.
// ============================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import type { GameMode, StudentAnswerLog, StudentProgress } from '../types';
import { getDb, isFirebaseConfigured } from './firebase';

const ACTIVE_USER_KEY = 'riftbound_active_user_v1';
const STUDENTS_MAP_KEY = 'riftbound_students_v1';

export function normalizeUsernameKey(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
}

function _readLocalMap(): Record<string, StudentProgress> {
  try {
    const raw = localStorage.getItem(STUDENTS_MAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StudentProgress>) : {};
  } catch {
    return {};
  }
}

function _writeLocalMap(map: Record<string, StudentProgress>) {
  localStorage.setItem(STUDENTS_MAP_KEY, JSON.stringify(map));
}

export function createEmptyProgress(username: string, className = ''): StudentProgress {
  return {
    username: username.trim(),
    usernameKey: normalizeUsernameKey(username),
    className: className.trim(),
    totalKills: 0,
    totalShards: 0,
    puzzlesAttempted: 0,
    puzzlesCorrect: 0,
    answeredPuzzleIds: [],
    modesCleared: [],
    recentAnswers: [],
    updatedAt: Date.now(),
  };
}

export function getActiveStudentLocal(): StudentProgress | null {
  try {
    const activeKey = localStorage.getItem(ACTIVE_USER_KEY);
    if (!activeKey) return null;
    const map = _readLocalMap();
    return map[activeKey] ?? null;
  } catch {
    return null;
  }
}

export async function loginOrCreateStudent(
  username: string,
  className = ''
): Promise<{ profile: StudentProgress; syncedFromCloud: boolean }> {
  const key = normalizeUsernameKey(username);
  if (!key) throw new Error('Username tidak boleh kosong.');

  const map = _readLocalMap();
  let profile = map[key] ?? createEmptyProgress(username, className);
  if (className.trim()) profile.className = className.trim();
  profile.username = username.trim();

  let syncedFromCloud = false;
  const db = getDb();
  if (db && navigator.onLine) {
    try {
      const snap = await getDoc(doc(db, 'students', key));
      if (snap.exists()) {
        const cloud = snap.data() as StudentProgress;
        if ((cloud.updatedAt ?? 0) >= profile.updatedAt) {
          profile = {
            ...createEmptyProgress(cloud.username || username, cloud.className || className),
            ...cloud,
            className: className.trim() || cloud.className || '',
          };
        }
        syncedFromCloud = true;
      }
    } catch (err) {
      console.warn('[ProgressService] Cloud load fallback to local:', err);
    }
  }

  map[key] = profile;
  _writeLocalMap(map);
  localStorage.setItem(ACTIVE_USER_KEY, key);

  if (db && navigator.onLine) {
    try {
      await setDoc(doc(db, 'students', key), profile, { merge: true });
      syncedFromCloud = true;
    } catch (err) {
      console.warn('[ProgressService] Cloud save skipped:', err);
    }
  }

  return { profile, syncedFromCloud };
}

export async function saveStudentProgress(progress: StudentProgress): Promise<boolean> {
  const updated: StudentProgress = {
    ...progress,
    updatedAt: Date.now(),
  };
  const map = _readLocalMap();
  map[updated.usernameKey] = updated;
  _writeLocalMap(map);
  localStorage.setItem(ACTIVE_USER_KEY, updated.usernameKey);

  const db = getDb();
  if (db && navigator.onLine) {
    try {
      await setDoc(doc(db, 'students', updated.usernameKey), updated, { merge: true });
      return true;
    } catch (err) {
      console.warn('[ProgressService] Firestore sync failed, kept local:', err);
    }
  }
  return false;
}

export async function recordPuzzleAttempts(
  current: StudentProgress,
  logs: StudentAnswerLog[]
): Promise<{ profile: StudentProgress; synced: boolean }> {
  const answeredSet = new Set(current.answeredPuzzleIds);
  let correctDelta = 0;

  for (const log of logs) {
    if (log.correct) {
      correctDelta++;
      answeredSet.add(log.questionId);
    }
  }

  const next: StudentProgress = {
    ...current,
    puzzlesAttempted: current.puzzlesAttempted + logs.length,
    puzzlesCorrect: current.puzzlesCorrect + correctDelta,
    answeredPuzzleIds: Array.from(answeredSet),
    recentAnswers: [...logs, ...current.recentAnswers].slice(0, 100),
    updatedAt: Date.now(),
  };

  const synced = await saveStudentProgress(next);
  return { profile: next, synced };
}

export async function recordModeClear(
  current: StudentProgress,
  mode: GameMode,
  killsDelta: number,
  shardsEarned: number
): Promise<{ profile: StudentProgress; synced: boolean }> {
  const clearedSet = new Set(current.modesCleared);
  clearedSet.add(mode);

  const next: StudentProgress = {
    ...current,
    totalKills: current.totalKills + killsDelta,
    totalShards: Math.max(current.totalShards, shardsEarned),
    modesCleared: Array.from(clearedSet),
    updatedAt: Date.now(),
  };

  const synced = await saveStudentProgress(next);
  return { profile: next, synced };
}

export async function fetchLeaderboard(): Promise<{
  entries: StudentProgress[];
  source: 'firebase' | 'local';
}> {
  const db = getDb();
  if (db && isFirebaseConfigured() && navigator.onLine) {
    try {
      const q = query(
        collection(db, 'students'),
        orderBy('puzzlesCorrect', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const entries = snap.docs.map((d) => d.data() as StudentProgress);
      if (entries.length > 0) {
        return { entries, source: 'firebase' };
      }
    } catch (err) {
      console.warn('[ProgressService] Leaderboard fallback to local:', err);
    }
  }

  const localEntries = Object.values(_readLocalMap()).sort(
    (a, b) => b.puzzlesCorrect - a.puzzlesCorrect || b.totalKills - a.totalKills
  );
  return { entries: localEntries, source: 'local' };
}
