// ============================================================
// RIFTBOUND: SLAYER CORPS — Title Screen + Student Login
// ============================================================

import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Cloud,
  CloudOff,
  Compass,
  Download,
  Play,
  Shield,
  Timer,
  UserCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { StudentProgress } from '../types';
import { isFirebaseConfigured } from '../services/firebase';
import { loginOrCreateStudent } from '../services/progressService';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface TitleScreenProps {
  student: StudentProgress | null;
  onStudentUpdate: (profile: StudentProgress) => void;
  onOpenReport: () => void;
  onStartWithLore: () => void;
  onStartMode: (mode: 'traverse' | 'survival' | 'defense') => void;
}

export function TitleScreen({
  student,
  onStudentUpdate,
  onOpenReport,
  onStartWithLore,
  onStartMode,
}: TitleScreenProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [usernameInput, setUsernameInput] = useState(student?.username ?? '');
  const [classInput, setClassInput] = useState(student?.className ?? '');
  const [loginMsg, setLoginMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) {
      setLoginMsg('Isi username terlebih dahulu sebelum bermain.');
      return null;
    }
    setSaving(true);
    setLoginMsg(null);
    try {
      const { profile, syncedFromCloud } = await loginOrCreateStudent(trimmed, classInput);
      onStudentUpdate(profile);
      setLoginMsg(
        syncedFromCloud
          ? `Profil "${profile.username}" siap & tersinkron ke Firebase!`
          : `Profil "${profile.username}" siap (tersimpan lokal di perangkat).`
      );
      return profile;
    } finally {
      setSaving(false);
    }
  };

  const ensureStudentThenRun = async (cb: () => void) => {
    if (student && student.username.toLowerCase() === usernameInput.trim().toLowerCase()) {
      cb();
      return;
    }
    const profile = await handleLoginSubmit();
    if (profile) cb();
  };

  const accuracy =
    student && student.puzzlesAttempted > 0
      ? Math.round((student.puzzlesCorrect / student.puzzlesAttempted) * 100)
      : 0;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-abyss-950 px-5 py-6 text-slate-100 scanlines">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-mana-purple/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-mana-cyan/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-4xl border-2 border-ancient-stone bg-abyss-900/95 p-6 shadow-2xl md:p-8">
        {/* Top PWA & Firebase Bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3 text-[11px]">
          <span className="font-bold tracking-widest text-mana-cyan">
            RIFTBOUND PWA // INFORMATIKA LEARNING EDITION
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 border px-2 py-0.5 ${
                isFirebaseConfigured()
                  ? 'border-mana-cyan/50 bg-mana-cyan/10 text-mana-cyan'
                  : 'border-slate-600 bg-abyss-950 text-slate-400'
              }`}
            >
              {isFirebaseConfigured() ? (
                <>
                  <Cloud className="h-3 w-3" /> FIREBASE SYNC
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3" /> LOCAL SAVE
                </>
              )}
            </span>
            <span
              className={`inline-flex items-center gap-1 border px-2 py-0.5 ${
                isOnline
                  ? 'border-loot-green/40 bg-loot-green/10 text-loot-green'
                  : 'border-slayer-orange/40 bg-slayer-orange/10 text-slayer-orange'
              }`}
            >
              {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center gap-1 border border-loot-gold/70 bg-loot-gold/10 px-2.5 py-0.5 font-bold text-loot-gold hover:bg-loot-gold/20"
              >
                <Download className="h-3 w-3" /> Install PWA
              </button>
            )}
          </div>
        </div>

        {/* Hero Title */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src="/favicon.svg"
            alt="Slayer Helmet"
            className="pixelated h-20 w-20 shrink-0 border-2 border-slayer-orange bg-abyss-950 p-1.5"
          />
          <div>
            <p className="text-[11px] font-bold tracking-widest text-slayer-orange">
              SILKSONG AGILITY · DOOM ARSENAL · 24 SOAL INFORMATIKA
            </p>
            <h1 className="mt-1 font-pixel text-xl leading-snug text-white md:text-2xl">
              RIFTBOUND: <span className="text-mana-cyan">SLAYER CORPS</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Buat username siswa untuk mencatat progres belajar, akurasi per materi, dan papan
              skor secara otomatis.
            </p>
          </div>
        </div>

        {/* Student Profile / Username Card */}
        <form
          onSubmit={handleLoginSubmit}
          className="mb-5 border border-mana-cyan/50 bg-abyss-950/90 p-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-mana-cyan">
              <UserCheck className="h-4 w-4" /> PROFIL SISWA (CATATAN PROGRES)
            </span>
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center gap-1.5 border border-loot-gold/60 bg-loot-gold/10 px-2.5 py-1 text-[11px] font-bold text-loot-gold hover:bg-loot-gold/20"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Catatan Progres &amp; Papan Skor
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-12">
            <input
              type="text"
              placeholder="Masukkan Username Siswa (cth: Budi_10) *"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="sm:col-span-5 border border-ancient-stone bg-abyss-900 px-3 py-2 text-xs text-white outline-none focus:border-mana-cyan"
            />
            <input
              type="text"
              placeholder="Kelas (opsional, cth: X RPL 1)"
              value={classInput}
              onChange={(e) => setClassInput(e.target.value)}
              className="sm:col-span-4 border border-ancient-stone bg-abyss-900 px-3 py-2 text-xs text-white outline-none focus:border-mana-cyan"
            />
            <button
              type="submit"
              disabled={saving}
              className="sm:col-span-3 border border-loot-green bg-loot-green/15 px-3 py-2 text-xs font-bold text-loot-green hover:bg-loot-green/25 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : student ? 'Ganti / Simpan' : 'Buat Profil'}
            </button>
          </div>

          {student && (
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <span>
                Aktif: <strong className="text-white">{student.username}</strong>
                {student.className ? ` (${student.className})` : ''}
              </span>
              <span className="text-loot-green">
                Soal Benar: {student.puzzlesCorrect}/{student.puzzlesAttempted} ({accuracy}%)
              </span>
              <span className="text-slayer-orange">Kills: {student.totalKills}</span>
            </div>
          )}

          {loginMsg && <p className="mt-2 text-[11px] text-loot-gold">{loginMsg}</p>}
        </form>

        {/* Primary Play Actions */}
        <div className="mb-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => ensureStudentThenRun(onStartWithLore)}
            className="inline-flex items-center gap-2 border-2 border-slayer-orange bg-slayer-orange/20 px-5 py-3 font-pixel text-xs text-white transition hover:bg-slayer-orange/35"
          >
            <Play className="h-4 w-4 text-loot-gold" /> MULAI (+ LORE INTRO)
          </button>
          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('traverse'))}
            className="inline-flex items-center gap-2 border border-mana-cyan/70 bg-mana-cyan/10 px-4 py-3 text-xs font-bold text-mana-cyan transition hover:bg-mana-cyan/20"
          >
            <BookOpen className="h-4 w-4" /> Langsung Main (Skip Lore)
          </button>
        </div>

        {/* Direct Mode Cards */}
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('traverse'))}
            className="border border-ancient-stone bg-abyss-950/90 p-3.5 text-left transition hover:border-loot-gold"
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-loot-gold">
              <Compass className="h-4 w-4" /> 1. TRAVERSE (4 AREA · 4 CHEST)
            </div>
            <p className="text-[11px] text-slate-400">
              4 Area terhubung: Outskirts, Twin Chasm, Foundry Catwalks (Shrine 3 soal), hingga
              Rift Sanctum (4 Encrypted Chest).
            </p>
          </button>

          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('survival'))}
            className="border border-ancient-stone bg-abyss-950/90 p-3.5 text-left transition hover:border-slayer-red"
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slayer-red">
              <Timer className="h-4 w-4" /> 2. SURVIVAL TIMER (45s)
            </div>
            <p className="text-[11px] text-slate-400">
              Arena multi-lantai dengan gelombang Mana Husk, Drone &amp; Stalker + 2 Emergency
              Shield Terminal.
            </p>
          </button>

          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('defense'))}
            className="border border-ancient-stone bg-abyss-950/90 p-3.5 text-left transition hover:border-mana-cyan"
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-bold text-mana-cyan">
              <Shield className="h-4 w-4" /> 3. HOLD THE FORT
            </div>
            <p className="text-[11px] text-slate-400">
              Lindungi Ancient Seal Pylon (450 HP), aktifkan 2 Barricade Node &amp; Repair Terminal
              untuk spawn Mana Turret.
            </p>
          </button>
        </div>

        {/* Controls Footer */}
        <div className="border border-ancient-stone bg-abyss-950/80 p-3 text-[11px] text-slate-400">
          <span className="font-bold text-slate-200">Kontrol:</span>{' '}
          <code>A/D</code> Gerak · <code>Space/W</code> Jump/2x · <code>Shift</code> Dash ·{' '}
          <code>J/LMB</code> Melee · <code>S+J</code> Pogo · <code>K/RMB</code> Ranged ·{' '}
          <code>E</code> Chest/Terminal · <code>Q</code> Heal · <code>I</code> Gear ·{' '}
          <code>TOUCH</code> Kontrol HP
        </div>
      </main>
    </div>
  );
}
