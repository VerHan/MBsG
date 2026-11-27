// ============================================================
// RIFTBOUND: SLAYER CORPS — Student Progress Service
// Offline-first LocalStorage + automatic Firebase Firestore sync,
// per-student gear persistence, and sequential Stage unlocking.
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
import type {
  GameMode,
  SavedGearState,
  StageKey,
  StudentAnswerLog,
  StudentProgress,
} from '../types';
import { getDb, isFirebaseConfigured } from './firebase';

const ACTIVE_USER_KEY = 'riftbound_active_user_v1';
const STUDENTS_MAP_KEY = 'riftbound_students_v1';

export const STAGE_SEQUENCE: StageKey[] = ['stage_1', 'stage_2', 'stage_3'];

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

function _hydrateProgress(raw: Partial<StudentProgress>, fallbackName = 'Siswa', fallbackClass = ''): StudentProgress {
  const username = (raw.username || fallbackName).trim();
  return {
    username,
    usernameKey: raw.usernameKey || normalizeUsernameKey(username),
    className: (raw.className ?? fallbackClass).trim(),
    totalKills: raw.totalKills ?? 0,
    totalShards: raw.totalShards ?? 0,
    puzzlesAttempted: raw.puzzlesAttempted ?? 0,
    puzzlesCorrect: raw.puzzlesCorrect ?? 0,
    answeredPuzzleIds: Array.isArray(raw.answeredPuzzleIds) ? raw.answeredPuzzleIds : [],
    modesCleared: Array.isArray(raw.modesCleared) ? raw.modesCleared : [],
    completedStages: Array.isArray(raw.completedStages) ? raw.completedStages : [],
    stageBestKills: raw.stageBestKills ?? {},
    stageBestShards: raw.stageBestShards ?? {},
    savedGear: raw.savedGear,
    recentAnswers: Array.isArray(raw.recentAnswers) ? raw.recentAnswers : [],
    updatedAt: raw.updatedAt ?? Date.now(),
  };
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
    completedStages: [],
    stageBestKills: {},
    stageBestShards: {},
    recentAnswers: [],
    updatedAt: Date.now(),
  };
}

/** Check sequential stage unlock rule: Stage 1 open -> Stage 2 requires Stage 1 saved -> Stage 3 requires Stage 2 saved. */
export function isStageUnlocked(student: StudentProgress | null, stageKey: StageKey): boolean {
  if (stageKey === 'stage_1') return true;
  if (!student) return false;
  const completed = student.completedStages ?? [];
  if (stageKey === 'stage_2') return completed.includes('stage_1');
  if (stageKey === 'stage_3') return completed.includes('stage_1') && completed.includes('stage_2');
  return false;
}

export function getActiveStudentLocal(): StudentProgress | null {
  try {
    const activeKey = localStorage.getItem(ACTIVE_USER_KEY);
    if (!activeKey) return null;
    const map = _readLocalMap();
    const raw = map[activeKey];
    return raw ? _hydrateProgress(raw) : null;
  } catch {
    return null;
  }
}

export async function loginOrCreateStudent(
  username: string,
  className = ''
): Promise<{ profile: StudentProgress; syncedFromCloud: boolean; syncError?: string }> {
  const key = normalizeUsernameKey(username);
  if (!key) throw new Error('Username tidak boleh kosong.');

  const map = _readLocalMap();
  let profile = map[key]
    ? _hydrateProgress(map[key], username, className)
    : createEmptyProgress(username, className);
  if (className.trim()) profile.className = className.trim();
  profile.username = username.trim();

  let syncedFromCloud = false;
  let syncError: string | undefined;
  const db = getDb();
  if (db && navigator.onLine) {
    try {
      const snap = await getDoc(doc(db, 'students', key));
      if (snap.exists()) {
        const cloud = snap.data() as Partial<StudentProgress>;
        if ((cloud.updatedAt ?? 0) >= profile.updatedAt) {
          profile = _hydrateProgress(
            {
              ...cloud,
              className: className.trim() || cloud.className || profile.className,
            },
            username,
            className
          );
        } else {
          // Merge completedStages & answeredPuzzleIds union so neither device loses clears
          const mergedStages = Array.from(
            new Set([...(profile.completedStages ?? []), ...(cloud.completedStages ?? [])])
          ) as StageKey[];
          const mergedPuzzles = Array.from(
            new Set([...profile.answeredPuzzleIds, ...(cloud.answeredPuzzleIds ?? [])])
          );
          profile = {
            ...profile,
            completedStages: mergedStages,
            answeredPuzzleIds: mergedPuzzles,
          };
        }
        syncedFromCloud = true;
      }
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
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
      syncError = undefined;
    } catch (err) {
      syncError = err instanceof Error ? err.message : String(err);
      console.warn('[ProgressService] Cloud save skipped:', err);
    }
  }

  return { profile, syncedFromCloud, syncError };
}

export async function saveStudentProgress(
  progress: StudentProgress
): Promise<{ synced: boolean; error?: string }> {
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
      return { synced: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.warn('[ProgressService] Firestore sync failed, kept local:', err);
      return { synced: false, error };
    }
  }
  return { synced: false };
}

export async function recordPuzzleAttempts(
  current: StudentProgress,
  logs: StudentAnswerLog[]
): Promise<{ profile: StudentProgress; synced: boolean; error?: string }> {
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

  const { synced, error } = await saveStudentProgress(next);
  return { profile: next, synced, error };
}

export async function recordModeClear(
  current: StudentProgress,
  mode: GameMode,
  killsDelta: number,
  shardsEarned: number,
  stageKey?: StageKey | null,
  gear?: SavedGearState
): Promise<{ profile: StudentProgress; synced: boolean; error?: string }> {
  const clearedSet = new Set(current.modesCleared);
  clearedSet.add(mode);

  const completedStageSet = new Set<StageKey>(current.completedStages ?? []);
  const stageBestKills = { ...(current.stageBestKills ?? {}) };
  const stageBestShards = { ...(current.stageBestShards ?? {}) };

  if (stageKey) {
    completedStageSet.add(stageKey);
    stageBestKills[stageKey] = Math.max(stageBestKills[stageKey] ?? 0, killsDelta);
    stageBestShards[stageKey] = Math.max(stageBestShards[stageKey] ?? 0, shardsEarned);
  }

  const next: StudentProgress = {
    ...current,
    totalKills: current.totalKills + killsDelta,
    totalShards: Math.max(current.totalShards, shardsEarned),
    modesCleared: Array.from(clearedSet),
    completedStages: STAGE_SEQUENCE.filter((s) => completedStageSet.has(s)),
    stageBestKills,
    stageBestShards,
    savedGear: gear ?? current.savedGear,
    updatedAt: Date.now(),
  };

  const { synced, error } = await saveStudentProgress(next);
  return { profile: next, synced, error };
}

export async function syncStudentGear(
  current: StudentProgress,
  gear: SavedGearState
): Promise<{ profile: StudentProgress; synced: boolean }> {
  const next: StudentProgress = {
    ...current,
    savedGear: gear,
    updatedAt: Date.now(),
  };
  const { synced } = await saveStudentProgress(next);
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
      const entries = snap.docs.map((d) => _hydrateProgress(d.data() as Partial<StudentProgress>));
      if (entries.length > 0) {
        return { entries, source: 'firebase' };
      }
    } catch (err) {
      console.warn('[ProgressService] Leaderboard fallback to local:', err);
    }
  }

  const localEntries = Object.values(_readLocalMap())
    .map((e) => _hydrateProgress(e))
    .sort((a, b) => b.puzzlesCorrect - a.puzzlesCorrect || b.totalKills - a.totalKills);
  return { entries: localEntries, source: 'local' };
}
