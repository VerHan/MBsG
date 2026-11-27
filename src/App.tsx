// ============================================================
// RIFTBOUND: SLAYER CORPS — Root App State Router
// Manages Firestore-synced StudentProgress, per-student gear,
// and sequential Stage 1 -> Stage 2 -> Stage 3 progression.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameMode, SavedGearState, StageKey, StudentAnswerLog, StudentProgress } from './types';
import {
  getActiveStudentLocal,
  isStageUnlocked,
  recordModeClear,
  recordPuzzleAttempts,
  syncStudentGear,
} from './services/progressService';
import { TitleScreen } from './components/TitleScreen';
import { LoreIntro } from './components/LoreIntro';
import { GameCanvas } from './components/GameCanvas';
import { LearningReportModal } from './components/LearningReportModal';
import type { PlayableModeKey } from './engine/LevelBuilder';

type Screen = 'title' | 'lore' | 'playing';

export default function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const [selectedMode, setSelectedMode] = useState<PlayableModeKey>('stage_1');
  const [student, setStudent] = useState<StudentProgress | null>(() => getActiveStudentLocal());
  const [showReport, setShowReport] = useState(false);
  const [, setConfigTick] = useState(0);

  const studentRef = useRef<StudentProgress | null>(student);
  useEffect(() => {
    studentRef.current = student;
  }, [student]);

  const handleRecordPuzzleLogs = useCallback(async (logs: StudentAnswerLog[]) => {
    const current = studentRef.current;
    if (!current || logs.length === 0) return;
    const { profile } = await recordPuzzleAttempts(current, logs);
    studentRef.current = profile;
    setStudent(profile);
  }, []);

  const handleRecordModeClear = useCallback(
    async (
      mode: GameMode,
      kills: number,
      shards: number,
      stageKey?: StageKey | null,
      gear?: SavedGearState
    ): Promise<{ synced: boolean; error?: string }> => {
      const current = studentRef.current;
      if (!current) return { synced: false };
      const { profile, synced, error } = await recordModeClear(
        current,
        mode,
        kills,
        shards,
        stageKey,
        gear
      );
      studentRef.current = profile;
      setStudent(profile);
      return { synced, error };
    },
    []
  );

  const handleGearChange = useCallback(async (gear: SavedGearState) => {
    const current = studentRef.current;
    if (!current) return;
    const { profile } = await syncStudentGear(current, gear);
    studentRef.current = profile;
    setStudent(profile);
  }, []);

  const handleStartMode = useCallback((mode: PlayableModeKey) => {
    if (mode === 'stage_2' || mode === 'stage_3') {
      if (!isStageUnlocked(studentRef.current, mode)) {
        return;
      }
    }
    setSelectedMode(mode);
    setScreen('playing');
  }, []);

  return (
    <>
      {screen === 'lore' && (
        <LoreIntro
          onFinish={() => {
            setSelectedMode('stage_1');
            setScreen('playing');
          }}
        />
      )}

      {screen === 'playing' && (
        <GameCanvas
          initialMode={selectedMode}
          student={student}
          onRecordPuzzleLogs={handleRecordPuzzleLogs}
          onRecordModeClear={handleRecordModeClear}
          onGearChange={handleGearChange}
          onOpenReport={() => setShowReport(true)}
          onExitToTitle={() => setScreen('title')}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          student={student}
          onStudentUpdate={setStudent}
          onOpenReport={() => setShowReport(true)}
          onStartWithLore={() => setScreen('lore')}
          onStartMode={handleStartMode}
        />
      )}

      {showReport && (
        <LearningReportModal
          student={student}
          onClose={() => setShowReport(false)}
          onFirebaseConfigChanged={() => setConfigTick((t) => t + 1)}
        />
      )}
    </>
  );
}
