// ============================================================
// RIFTBOUND: SLAYER CORPS — Learning Report & Leaderboard Modal
// Displays student accuracy per category, recent attempts,
// Firebase cloud sync status, and optional Firebase setup UI.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Cloud,
  CloudOff,
  Database,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import type { StudentProgress } from '../types';
import {
  clearCustomFirebaseConfig,
  getFirebaseConfig,
  isFirebaseConfigured,
  saveCustomFirebaseConfig,
} from '../services/firebase';
import { fetchLeaderboard } from '../services/progressService';

interface LearningReportModalProps {
  student: StudentProgress | null;
  onClose: () => void;
  onFirebaseConfigChanged?: () => void;
}

export function LearningReportModal({
  student,
  onClose,
  onFirebaseConfigChanged,
}: LearningReportModalProps) {
  const [leaderboard, setLeaderboard] = useState<StudentProgress[]>([]);
  const [lbSource, setLbSource] = useState<'firebase' | 'local'>('local');
  const [showConfig, setShowConfig] = useState(false);

  const existingCfg = getFirebaseConfig();
  const [apiKey, setApiKey] = useState(existingCfg?.apiKey ?? '');
  const [authDomain, setAuthDomain] = useState(existingCfg?.authDomain ?? '');
  const [projectId, setProjectId] = useState(existingCfg?.projectId ?? '');
  const [appId, setAppId] = useState(existingCfg?.appId ?? '');

  useEffect(() => {
    fetchLeaderboard().then((res) => {
      setLeaderboard(res.entries);
      setLbSource(res.source);
    });
  }, [student]);

  const categoryStats = useMemo(() => {
    if (!student) return [];
    const map = new Map<string, { attempted: number; correct: number }>();
    for (const log of student.recentAnswers) {
      const prev = map.get(log.category) ?? { attempted: 0, correct: 0 };
      prev.attempted++;
      if (log.correct) prev.correct++;
      map.set(log.category, prev);
    }
    return Array.from(map.entries()).map(([category, stat]) => ({
      category,
      ...stat,
      pct: stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0,
    }));
  }, [student]);

  const accuracy =
    student && student.puzzlesAttempted > 0
      ? Math.round((student.puzzlesCorrect / student.puzzlesAttempted) * 100)
      : 0;

  const handleSaveFirebase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !projectId.trim()) return;
    saveCustomFirebaseConfig({
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || undefined,
      projectId: projectId.trim(),
      appId: appId.trim() || undefined,
    });
    setShowConfig(false);
    onFirebaseConfigChanged?.();
    fetchLeaderboard().then((res) => {
      setLeaderboard(res.entries);
      setLbSource(res.source);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss-950/85 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border-2 border-mana-cyan bg-abyss-900 p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-mana-cyan" />
            <div>
              <h2 className="font-pixel text-sm text-white">CATATAN PROGRES BELAJAR</h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {student
                  ? `Siswa: ${student.username}${student.className ? ` (${student.className})` : ''}`
                  : 'Belum ada profil siswa aktif'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfig((s) => !s)}
              className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold ${
                isFirebaseConfigured()
                  ? 'border-loot-green/60 bg-loot-green/10 text-loot-green'
                  : 'border-slayer-orange/60 bg-slayer-orange/10 text-slayer-orange'
              }`}
            >
              {isFirebaseConfigured() ? (
                <>
                  <Cloud className="h-3.5 w-3.5" /> Firebase Ready
                </>
              ) : (
                <>
                  <CloudOff className="h-3.5 w-3.5" /> Setup Firebase
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border border-ancient-stone p-1.5 text-slate-300 hover:border-slayer-red hover:text-slayer-red"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Optional Firebase Setup Panel */}
        {showConfig && (
          <form
            onSubmit={handleSaveFirebase}
            className="mb-4 border border-mana-purple/60 bg-abyss-950 p-3.5 text-xs"
          >
            <div className="mb-2 flex items-center gap-1.5 font-bold text-mana-purple">
              <Database className="h-4 w-4" /> Konfigurasi Firebase Firestore (Opsional)
            </div>
            <p className="mb-3 text-[11px] text-slate-400">
              Tempel konfigurasi Web App dari Firebase Console (atau isi lewat file{' '}
              <code>.env</code>). Progres siswa akan otomatis tersimpan ke koleksi{' '}
              <code>students</code> di Firestore.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="VITE_FIREBASE_API_KEY *"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
                required
              />
              <input
                type="text"
                placeholder="VITE_FIREBASE_PROJECT_ID *"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
                required
              />
              <input
                type="text"
                placeholder="VITE_FIREBASE_AUTH_DOMAIN"
                value={authDomain}
                onChange={(e) => setAuthDomain(e.target.value)}
                className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
              />
              <input
                type="text"
                placeholder="VITE_FIREBASE_APP_ID"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="border border-loot-green bg-loot-green/15 px-3 py-1 font-bold text-loot-green hover:bg-loot-green/25"
              >
                Simpan &amp; Hubungkan Firebase
              </button>
              {isFirebaseConfigured() && (
                <button
                  type="button"
                  onClick={() => {
                    clearCustomFirebaseConfig();
                    setApiKey('');
                    setProjectId('');
                    setAuthDomain('');
                    setAppId('');
                    setShowConfig(false);
                    onFirebaseConfigChanged?.();
                  }}
                  className="border border-slayer-red/60 px-3 py-1 text-slayer-red hover:bg-slayer-red/10"
                >
                  Hapus Config Lokal
                </button>
              )}
            </div>
          </form>
        )}

        {/* Student Stats Summary */}
        {student && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="border border-ancient-stone bg-abyss-950 p-3">
                <div className="text-[10px] text-slate-400">AKURASI JAWABAN</div>
                <div className="mt-1 font-pixel text-base text-loot-green">{accuracy}%</div>
              </div>
              <div className="border border-ancient-stone bg-abyss-950 p-3">
                <div className="text-[10px] text-slate-400">SOAL BENAR</div>
                <div className="mt-1 font-pixel text-base text-mana-cyan">
                  {student.puzzlesCorrect}/{student.puzzlesAttempted}
                </div>
              </div>
              <div className="border border-ancient-stone bg-abyss-950 p-3">
                <div className="text-[10px] text-slate-400">TOTAL KILLS</div>
                <div className="mt-1 font-pixel text-base text-slayer-orange">
                  {student.totalKills}
                </div>
              </div>
              <div className="border border-ancient-stone bg-abyss-950 p-3">
                <div className="text-[10px] text-slate-400">SHARDS / CLEAR</div>
                <div className="mt-1 font-pixel text-sm text-loot-gold">
                  {student.totalShards} · {student.modesCleared.length}/3
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div className="border border-ancient-stone bg-abyss-950 p-3.5">
                <div className="mb-2 text-xs font-bold text-mana-cyan">
                  PENGUASAAN PER MATERI
                </div>
                {categoryStats.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Belum ada soal yang dijawab. Buka Encrypted Chest di dalam game!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {categoryStats.map((cat) => (
                      <div key={cat.category} className="text-[11px]">
                        <div className="mb-0.5 flex justify-between">
                          <span className="text-slate-200">{cat.category}</span>
                          <span className="text-loot-gold">
                            {cat.correct}/{cat.attempted} ({cat.pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-abyss-900">
                          <div
                            className="h-full bg-mana-cyan"
                            style={{ width: `${cat.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Answer Log */}
              <div className="border border-ancient-stone bg-abyss-950 p-3.5">
                <div className="mb-2 text-xs font-bold text-slate-200">
                  RIWAYAT JAWABAN TERBARU
                </div>
                {student.recentAnswers.length === 0 ? (
                  <p className="text-[11px] text-slate-500">Belum ada riwayat jawaban.</p>
                ) : (
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-[11px]">
                    {student.recentAnswers.slice(0, 12).map((log, idx) => (
                      <li
                        key={`${log.questionId}_${idx}`}
                        className="flex items-center justify-between border-b border-ancient-stone/50 pb-1"
                      >
                        <span className="flex items-center gap-1.5 text-slate-300">
                          {log.correct ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-loot-green" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-slayer-red" />
                          )}
                          {log.questionId} · {log.category}
                        </span>
                        <span className="text-[10px] uppercase text-slate-500">
                          {log.difficulty}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* Leaderboard */}
        <div className="border border-ancient-stone bg-abyss-950 p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-loot-gold">
              <Trophy className="h-4 w-4" /> PAPAN SKOR SISWA
            </span>
            <span className="text-[10px] text-slate-400">
              Sumber: {lbSource === 'firebase' ? 'Firebase Firestore (Cloud)' : 'Perangkat Lokal'}
            </span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-[11px] text-slate-500">Belum ada data siswa.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-ancient-stone text-slate-400">
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">Username</th>
                    <th className="py-1 pr-2">Kelas</th>
                    <th className="py-1 pr-2">Benar</th>
                    <th className="py-1 pr-2">Akurasi</th>
                    <th className="py-1">Kills</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((row, idx) => {
                    const rowAcc =
                      row.puzzlesAttempted > 0
                        ? Math.round((row.puzzlesCorrect / row.puzzlesAttempted) * 100)
                        : 0;
                    const isSelf = student?.usernameKey === row.usernameKey;
                    return (
                      <tr
                        key={row.usernameKey}
                        className={`border-b border-ancient-stone/40 ${
                          isSelf ? 'bg-mana-cyan/10 text-mana-cyan font-semibold' : 'text-slate-300'
                        }`}
                      >
                        <td className="py-1.5 pr-2">{idx + 1}</td>
                        <td className="py-1.5 pr-2">{row.username}</td>
                        <td className="py-1.5 pr-2">{row.className || '-'}</td>
                        <td className="py-1.5 pr-2">
                          {row.puzzlesCorrect}/{row.puzzlesAttempted}
                        </td>
                        <td className="py-1.5 pr-2 text-loot-green">{rowAcc}%</td>
                        <td className="py-1.5">{row.totalKills}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
