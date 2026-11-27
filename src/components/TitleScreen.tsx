// ============================================================
// RIFTBOUND: SLAYER CORPS — Title Screen
// Sequential Stage Locking (Stage 1 -> Save -> Stage 2 -> Stage 3),
// inline Firestore Connect + Test UI, and Student Profile Sync.
// ============================================================

import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Cloud,
  CloudOff,
  Compass,
  Database,
  Download,
  Lock,
  Play,
  Shield,
  Timer,
  UserCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { StageKey, StudentProgress } from '../types';
import type { PlayableModeKey } from '../engine/LevelBuilder';
import {
  clearCustomFirebaseConfig,
  getFirebaseConfig,
  isFirebaseConfigured,
  saveCustomFirebaseConfig,
  testFirestoreConnection,
} from '../services/firebase';
import { isStageUnlocked, loginOrCreateStudent } from '../services/progressService';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface TitleScreenProps {
  student: StudentProgress | null;
  onStudentUpdate: (profile: StudentProgress) => void;
  onOpenReport: () => void;
  onStartWithLore: () => void;
  onStartMode: (mode: PlayableModeKey) => void;
}

const STAGE_CARDS: Array<{
  key: StageKey;
  badge: string;
  title: string;
  desc: string;
  lockHint: string;
  accentBorder: string;
  accentText: string;
}> = [
  {
    key: 'stage_1',
    badge: 'STAGE 1 · 4 AREA + BOSS',
    title: 'Berpikir Komputasional',
    desc: 'Dekomposisi, Abstraksi, Pola, Flowchart & Pseudocode. 4 Chest + Shrine + Boss Mana Colossus.',
    lockHint: '',
    accentBorder: 'hover:border-loot-gold',
    accentText: 'text-loot-gold',
  },
  {
    key: 'stage_2',
    badge: 'STAGE 2 · 4 AREA + BOSS',
    title: 'Gerbang Logika',
    desc: 'AND, OR, NOT, XOR, NAND, NOR, XNOR & De Morgan. 4 Chest + Barrier + Boss Forge Titan.',
    lockHint: 'Selesaikan & Save Stage 1 untuk membuka',
    accentBorder: 'hover:border-mana-purple',
    accentText: 'text-mana-cyan',
  },
  {
    key: 'stage_3',
    badge: 'STAGE 3 · 4 AREA + FINAL BOSS',
    title: 'Sistem Biner',
    desc: 'Bit/Byte, Konversi Biner-Desimal, Penjumlahan Biner & ASCII. 4 Chest + Final Boss Aetherion.',
    lockHint: 'Selesaikan & Save Stage 2 untuk membuka',
    accentBorder: 'hover:border-slayer-red',
    accentText: 'text-white',
  },
];

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

  // Inline Firestore setup panel
  const existingCfg = getFirebaseConfig();
  const [showFbSetup, setShowFbSetup] = useState(false);
  const [fbApiKey, setFbApiKey] = useState(existingCfg?.apiKey ?? '');
  const [fbProjectId, setFbProjectId] = useState(existingCfg?.projectId ?? '');
  const [fbAuthDomain, setFbAuthDomain] = useState(existingCfg?.authDomain ?? '');
  const [fbAppId, setFbAppId] = useState(existingCfg?.appId ?? '');
  const [fbStatus, setFbStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [fbTesting, setFbTesting] = useState(false);

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
      setLoginMsg('Isi username siswa terlebih dahulu sebelum bermain.');
      return null;
    }
    setSaving(true);
    setLoginMsg(null);
    try {
      const { profile, syncedFromCloud, syncError } = await loginOrCreateStudent(
        trimmed,
        classInput
      );
      onStudentUpdate(profile);
      if (syncedFromCloud) {
        setLoginMsg(
          `Profil "${profile.username}" siap & tersinkron ke Firestore! (${profile.completedStages.length}/3 Stage selesai)`
        );
      } else if (syncError) {
        setLoginMsg(
          `Profil dimuat lokal (Firestore error: ${syncError}). Cek koneksi/Rules Firestore.`
        );
      } else {
        setLoginMsg(
          `Profil "${profile.username}" tersimpan lokal. Hubungkan Firestore agar progres aman di Cloud.`
        );
      }
      return profile;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndTestFirestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbApiKey.trim() || !fbProjectId.trim()) {
      setFbStatus({ ok: false, msg: 'API Key dan Project ID wajib diisi.' });
      return;
    }
    saveCustomFirebaseConfig({
      apiKey: fbApiKey.trim(),
      projectId: fbProjectId.trim(),
      authDomain: fbAuthDomain.trim() || undefined,
      appId: fbAppId.trim() || undefined,
    });
    setFbTesting(true);
    const res = await testFirestoreConnection();
    setFbTesting(false);
    if (res.ok) {
      setFbStatus({ ok: true, msg: 'Berhasil terhubung ke Firestore (koleksi `students` siap)!' });
      if (usernameInput.trim()) {
        await handleLoginSubmit();
      }
    } else {
      setFbStatus({ ok: false, msg: `Gagal terhubung ke Firestore: ${res.error}` });
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
  const completedStages = student?.completedStages ?? [];
  const fbConfigured = isFirebaseConfigured();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-abyss-950 px-5 py-6 text-slate-100 scanlines">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-mana-purple/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-1/4 h-80 w-80 rounded-full bg-mana-cyan/10 blur-3xl" />

      <main className="relative z-10 w-full max-w-4xl border-2 border-ancient-stone bg-abyss-900/95 p-6 shadow-2xl md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3 text-[11px]">
          <span className="font-bold tracking-widest text-mana-cyan">
            RIFTBOUND PWA // 3 STAGE BERURUTAN (27 SOAL)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFbSetup((v) => !v)}
              className={`inline-flex items-center gap-1 border px-2 py-0.5 font-semibold transition ${
                fbConfigured
                  ? 'border-mana-cyan/50 bg-mana-cyan/10 text-mana-cyan hover:bg-mana-cyan/20'
                  : 'border-slayer-orange bg-slayer-orange/15 text-loot-gold hover:bg-slayer-orange/25 animate-pulse'
              }`}
            >
              {fbConfigured ? (
                <>
                  <Cloud className="h-3 w-3" /> FIRESTORE TERHUBUNG
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3" /> HUBUNGKAN FIRESTORE
                </>
              )}
            </button>
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

        {/* Inline Firestore Connection & Verification Panel */}
        {(!fbConfigured || showFbSetup) && (
          <div className="mb-4 border border-mana-purple/60 bg-abyss-950/95 p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-mana-purple">
                <Database className="h-4 w-4" />
                {fbConfigured
                  ? 'Pengaturan Koneksi Firebase Firestore'
                  : 'Hubungkan Firebase Firestore agar Progres & Gear Anak Tersimpan Permanen'}
              </span>
              <button
                type="button"
                onClick={() => setShowFbSetup((v) => !v)}
                className="border border-ancient-stone px-2 py-0.5 text-[10px] text-slate-300 hover:border-mana-cyan"
              >
                {showFbSetup ? 'Tutup Form' : 'Buka Form Firestore'}
              </button>
            </div>

            {showFbSetup && (
              <form onSubmit={handleSaveAndTestFirestore} className="mt-3">
                <p className="mb-2.5 text-[11px] text-slate-400">
                  Isi dari Firebase Console -&gt; Project Settings -&gt; Web App (atau set di file{' '}
                  <code>.env</code>). Progres stage, nilai soal, &amp; gear anak tersimpan di koleksi{' '}
                  <code>students</code>.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="VITE_FIREBASE_API_KEY *"
                    value={fbApiKey}
                    onChange={(e) => setFbApiKey(e.target.value)}
                    className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
                    required
                  />
                  <input
                    type="text"
                    placeholder="VITE_FIREBASE_PROJECT_ID *"
                    value={fbProjectId}
                    onChange={(e) => setFbProjectId(e.target.value)}
                    className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
                    required
                  />
                  <input
                    type="text"
                    placeholder="VITE_FIREBASE_AUTH_DOMAIN"
                    value={fbAuthDomain}
                    onChange={(e) => setFbAuthDomain(e.target.value)}
                    className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
                  />
                  <input
                    type="text"
                    placeholder="VITE_FIREBASE_APP_ID"
                    value={fbAppId}
                    onChange={(e) => setFbAppId(e.target.value)}
                    className="border border-ancient-stone bg-abyss-900 px-2.5 py-1.5 text-xs text-white outline-none focus:border-mana-cyan"
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={fbTesting}
                    className="border border-loot-green bg-loot-green/15 px-3 py-1 font-bold text-loot-green hover:bg-loot-green/25 disabled:opacity-50"
                  >
                    {fbTesting ? 'Menguji Koneksi...' : 'Simpan & Tes Firestore'}
                  </button>
                  {fbConfigured && (
                    <button
                      type="button"
                      onClick={() => {
                        clearCustomFirebaseConfig();
                        setFbApiKey('');
                        setFbProjectId('');
                        setFbAuthDomain('');
                        setFbAppId('');
                        setFbStatus({ ok: false, msg: 'Konfigurasi lokal dihapus.' });
                      }}
                      className="border border-slayer-red/60 px-2.5 py-1 text-[11px] text-slayer-red hover:bg-slayer-red/10"
                    >
                      Putuskan Config Lokal
                    </button>
                  )}
                  {fbStatus && (
                    <span
                      className={`text-[11px] ${fbStatus.ok ? 'text-loot-green' : 'text-slayer-red'}`}
                    >
                      {fbStatus.msg}
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src="/favicon.svg"
            alt="Slayer Helmet"
            className="pixelated h-20 w-20 shrink-0 border-2 border-slayer-orange bg-abyss-950 p-1.5"
          />
          <div>
            <p className="text-[11px] font-bold tracking-widest text-slayer-orange">
              COMBO BLOK &amp; PARRY · DOOM ARSENAL · 3 BOSS · FIRESTORE SAVE
            </p>
            <h1 className="mt-1 font-pixel text-xl leading-snug text-white md:text-2xl">
              RIFTBOUND: <span className="text-mana-cyan">SLAYER CORPS</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-400">
              Selesaikan Stage secara berurutan (1 -&gt; 2 -&gt; 3). Setiap Stage selesai otomatis
              disimpan ke profil siswa sebelum membuka Stage berikutnya.
            </p>
          </div>
        </div>

        {/* Student Profile */}
        <form
          onSubmit={handleLoginSubmit}
          className="mb-5 border border-mana-cyan/50 bg-abyss-950/90 p-4"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-mana-cyan">
              <UserCheck className="h-4 w-4" /> PROFIL SISWA (SIMPAN PROGRES &amp; STAGE)
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
              {saving ? 'Menyinkronkan...' : student ? 'Ganti / Sync Profil' : 'Buat & Muat Profil'}
            </button>
          </div>

          {student && (
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
              <span>
                Aktif: <strong className="text-white">{student.username}</strong>
                {student.className ? ` (${student.className})` : ''}
              </span>
              <span className="text-mana-cyan">
                Stage Tersimpan: <strong>{completedStages.length}/3</strong>
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
        <div className="mb-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => ensureStudentThenRun(onStartWithLore)}
            className="inline-flex items-center gap-2 border-2 border-slayer-orange bg-slayer-orange/20 px-5 py-3 font-pixel text-xs text-white transition hover:bg-slayer-orange/35"
          >
            <Play className="h-4 w-4 text-loot-gold" /> MULAI DARI STAGE 1 (+ LORE)
          </button>
          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('stage_1'))}
            className="inline-flex items-center gap-2 border border-mana-cyan/70 bg-mana-cyan/10 px-4 py-3 text-xs font-bold text-mana-cyan transition hover:bg-mana-cyan/20"
          >
            <BookOpen className="h-4 w-4" /> Langsung Main Stage 1 (Skip Lore)
          </button>
        </div>

        {/* 3 Sequential Stage Cards */}
        <div className="mb-3 grid gap-3 md:grid-cols-3">
          {STAGE_CARDS.map((card) => {
            const unlocked = isStageUnlocked(student, card.key);
            const cleared = completedStages.includes(card.key);
            const bestKills = student?.stageBestKills?.[card.key];

            return (
              <button
                key={card.key}
                type="button"
                disabled={!unlocked}
                onClick={() => ensureStudentThenRun(() => onStartMode(card.key))}
                className={`border p-3.5 text-left transition ${
                  unlocked
                    ? `border-ancient-stone bg-abyss-950/90 ${card.accentBorder}`
                    : 'cursor-not-allowed border-ancient-stone/50 bg-abyss-950/50 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
                  <span className={unlocked ? 'text-slayer-orange' : 'text-slate-500'}>
                    {card.badge}
                  </span>
                  {cleared ? (
                    <span className="inline-flex items-center gap-1 text-loot-green">
                      <CheckCircle2 className="h-3 w-3" /> SAVED
                    </span>
                  ) : !unlocked ? (
                    <span className="inline-flex items-center gap-1 text-slayer-red">
                      <Lock className="h-3 w-3" /> TERKUNCI
                    </span>
                  ) : (
                    <span className="text-mana-cyan">TERBUKA</span>
                  )}
                </div>

                <div className={`mt-1 flex items-center gap-1.5 text-xs font-bold ${card.accentText}`}>
                  {unlocked ? (
                    <Compass className="h-4 w-4 shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                  {card.title}
                </div>

                <p className="mt-1 text-[11px] text-slate-400">
                  {unlocked ? card.desc : card.lockHint}
                </p>

                {cleared && bestKills !== undefined && (
                  <div className="mt-1.5 text-[10px] text-loot-gold">
                    Rekor Kills: {bestKills}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bonus Modes */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('survival'))}
            className="flex items-center gap-3 border border-ancient-stone bg-abyss-950/75 p-3 text-left transition hover:border-slayer-red"
          >
            <Timer className="h-5 w-5 shrink-0 text-slayer-red" />
            <div>
              <div className="text-xs font-bold text-slayer-red">MODE LATIHAN: SURVIVAL (45s)</div>
              <div className="text-[10px] text-slate-400">
                Arena bertingkat + Emergency Shield Terminal (Tema Stage 1).
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => ensureStudentThenRun(() => onStartMode('defense'))}
            className="flex items-center gap-3 border border-ancient-stone bg-abyss-950/75 p-3 text-left transition hover:border-mana-cyan"
          >
            <Shield className="h-5 w-5 shrink-0 text-mana-cyan" />
            <div>
              <div className="text-xs font-bold text-mana-cyan">MODE LATIHAN: HOLD THE FORT</div>
              <div className="text-[10px] text-slate-400">
                Pertahankan Pylon + Barricade &amp; Repair Turret (Tema Stage 2).
              </div>
            </div>
          </button>
        </div>

        <div className="border border-ancient-stone bg-abyss-950/80 p-3 text-[11px] text-slate-400">
          <span className="font-bold text-slate-200">Kontrol:</span>{' '}
          <code>A/D</code> Gerak · <code>Space/W</code> Jump/2x · <code>Shift</code> Dash ·{' '}
          <code>Tap J/LMB</code> 3-Hit Combo (Hit 2 Spin!) ·{' '}
          <code>Hold J/LMB</code> Block &amp; Parry · <code>S+J</code> Pogo ·{' '}
          <code>K/RMB</code> Ranged · <code>E</code> Interaksi · <code>Q</code> Heal ·{' '}
          <code>R</code> Ammo · <code>I</code> Gear
        </div>
      </main>
    </div>
  );
}
