// ============================================================
// RIFTBOUND: SLAYER CORPS — Root App State Router
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameMode, StudentAnswerLog, StudentProgress } from './types';
import {
  getActiveStudentLocal,
  recordModeClear,
  recordPuzzleAttempts,
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
    async (mode: GameMode, kills: number, shards: number) => {
      const current = studentRef.current;
      if (!current) return;
      const { profile } = await recordModeClear(current, mode, kills, shards);
      studentRef.current = profile;
      setStudent(profile);
    },
    []
  );

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
          onStartMode={(mode) => {
            setSelectedMode(mode);
            setScreen('playing');
          }}
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
