// ============================================================
// RIFTBOUND: SLAYER CORPS — GameCanvas (React <-> GameEngine Bridge)
// Handles Firestore stage-clear sync + sequential Next Stage unlock
// and per-student gear synchronization.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  Cloud,
  CloudOff,
  Home,
  RotateCcw,
  Trophy,
} from 'lucide-react';
import type {
  ArmorId,
  GameMode,
  PlayerState,
  SavedGearState,
  StageKey,
  StudentAnswerLog,
  StudentProgress,
  WeaponId,
  WeaponInstance,
} from '../types';
import { WEAPONS } from '../data/weapons';
import { ARMOR_ORDER } from '../data/armors';
import {
  GameEngine,
  GAME_HEIGHT,
  GAME_WIDTH,
  type HudSnapshot,
  type PuzzleRequest,
} from '../engine/GameEngine';
import type { InputAction } from '../engine/InputManager';
import type { PlayableModeKey } from '../engine/LevelBuilder';
import { HUD } from './HUD';
import { PuzzleModal } from './PuzzleModal';
import { InventoryModal } from './InventoryModal';
import { PauseMenu } from './PauseMenu';
import { TouchControls } from './TouchControls';

interface GameCanvasProps {
  initialMode: PlayableModeKey;
  student: StudentProgress | null;
  onRecordPuzzleLogs: (logs: StudentAnswerLog[]) => void;
  onRecordModeClear: (
    mode: GameMode,
    kills: number,
    shards: number,
    stageKey?: StageKey | null,
    gear?: SavedGearState
  ) => Promise<{ synced: boolean; error?: string }>;
  onGearChange: (gear: SavedGearState) => void;
  onOpenReport: () => void;
  onExitToTitle: () => void;
}

const NEXT_STAGE_MAP: Partial<Record<PlayableModeKey, { next: PlayableModeKey; label: string }>> = {
  stage_1: { next: 'stage_2', label: 'Lanjut ke STAGE 2 (Gerbang Logika)' },
  stage_2: { next: 'stage_3', label: 'Lanjut ke STAGE 3 (Sistem Biner)' },
  survival: { next: 'defense', label: 'Lanjut ke HOLD THE FORT' },
  defense: { next: 'stage_1', label: 'Kembali ke STAGE 1' },
};

function toStageKey(k: PlayableModeKey): StageKey | null {
  if (k === 'stage_1' || k === 'stage_2' || k === 'stage_3') return k;
  return null;
}

export function GameCanvas({
  initialMode,
  student,
  onRecordPuzzleLogs,
  onRecordModeClear,
  onGearChange,
  onOpenReport,
  onExitToTitle,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [modeKey, setModeKey] = useState<PlayableModeKey>(initialMode);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [areaBanner, setAreaBanner] = useState<{ name: string; subtitle: string } | null>(null);
  const [showTouchControls, setShowTouchControls] = useState<boolean>(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
  const [puzzleReq, setPuzzleReq] = useState<PuzzleRequest | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [clearSummary, setClearSummary] = useState<{
    kills: number;
    shards: number;
    puzzleAttempted: number;
    puzzleCorrect: number;
    saveStatus: 'saving' | 'cloud' | 'local' | 'error';
    saveError?: string;
  } | null>(null);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [playerSnapshot, setPlayerSnapshot] = useState<PlayerState | null>(null);

  const puzzleStatsRef = useRef({ attempted: 0, correct: 0 });
  const toastTimerRef = useRef<number | null>(null);
  const areaTimerRef = useRef<number | null>(null);
  const modeKeyRef = useRef<PlayableModeKey>(initialMode);
  modeKeyRef.current = modeKey;

  const studentRef = useRef(student);
  studentRef.current = student;
  const onGearChangeRef = useRef(onGearChange);
  onGearChangeRef.current = onGearChange;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const showAreaBanner = useCallback((name: string, subtitle: string) => {
    setAreaBanner({ name, subtitle });
    if (areaTimerRef.current) window.clearTimeout(areaTimerRef.current);
    areaTimerRef.current = window.setTimeout(() => setAreaBanner(null), 3200);
  }, []);

  useEffect(() => {
    if (gameOverReason) document.body.dataset.state = 'gameover';
    else if (clearSummary) document.body.dataset.state = 'clear';
    else if (isPaused || showInventory || puzzleReq) document.body.dataset.state = 'paused';
    else document.body.dataset.state = 'playing';
  }, [gameOverReason, clearSummary, isPaused, showInventory, puzzleReq]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    const curStudent = studentRef.current;
    engine.setStudentKey(curStudent?.usernameKey ?? null);

    engine.onHudUpdate = (snap) => setHud(snap);
    engine.onToast = showToast;
    engine.onAreaChange = showAreaBanner;
    engine.onGearChange = (gear) => onGearChangeRef.current(gear);
    engine.onPause = () => setIsPaused(true);
    engine.onToggleInventory = () => {
      setPlayerSnapshot({ ...engine.player.state });
      setShowInventory(true);
    };
    engine.onPuzzleTrigger = (req) => setPuzzleReq(req);
    engine.onSegmentComplete = async (_segId, kills, shards) => {
      engine.pauseForModal();
      const k = modeKeyRef.current;
      const recordedMode: GameMode =
        k === 'survival' ? 'survival' : k === 'defense' ? 'defense' : 'traverse';
      const stageKey = toStageKey(k);
      const gear = engine.player.exportSavedGear();
      engine.saveGear();

      setClearSummary({
        kills,
        shards,
        puzzleAttempted: puzzleStatsRef.current.attempted,
        puzzleCorrect: puzzleStatsRef.current.correct,
        saveStatus: 'saving',
      });

      const res = await onRecordModeClear(recordedMode, kills, shards, stageKey, gear);
      setClearSummary((prev) =>
        prev
          ? {
              ...prev,
              saveStatus: res.synced ? 'cloud' : res.error ? 'error' : 'local',
              saveError: res.error,
            }
          : null
      );
    };
    engine.onGameOver = (reason) => {
      engine.pauseForModal();
      setGameOverReason(reason);
    };

    engine.loadPlayableMode(initialMode, false, curStudent?.savedGear ?? null);
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [initialMode, showToast, showAreaBanner, onRecordModeClear]);

  const handleTouchAction = useCallback((action: InputAction, down: boolean) => {
    engineRef.current?.input.setVirtualAction(action, down);
  }, []);

  const switchMode = (nextMode: PlayableModeKey, keepGear = false) => {
    const engine = engineRef.current;
    if (!engine) return;
    setModeKey(nextMode);
    setClearSummary(null);
    setGameOverReason(null);
    setIsPaused(false);
    setPuzzleReq(null);
    setShowInventory(false);
    puzzleStatsRef.current = { attempted: 0, correct: 0 };
    engine.loadPlayableMode(nextMode, keepGear, keepGear ? null : studentRef.current?.savedGear ?? null);
    engine.resumeFromModal();
  };

  const handlePuzzleComplete = (
    interactableId: string,
    success: boolean,
    stats: { attempted: number; correct: number; logs: StudentAnswerLog[] }
  ) => {
    puzzleStatsRef.current.attempted += stats.attempted;
    puzzleStatsRef.current.correct += stats.correct;
    if (stats.logs.length > 0) {
      onRecordPuzzleLogs(stats.logs);
    }
    const engine = engineRef.current;
    setPuzzleReq(null);
    if (engine) {
      engine.resolvePuzzle(interactableId, success);
      engine.resumeFromModal();
    }
  };

  const handleEquipWeapon = (w: WeaponInstance) => {
    const engine = engineRef.current;
    if (!engine) return;
    const res = engine.player.equipWeapon(w);
    engine.saveGear();
    setPlayerSnapshot({ ...engine.player.state });
    if (res.notice) showToast(res.notice);
  };

  const handleUnequipRanged = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.player.unequipRanged();
    engine.saveGear();
    setPlayerSnapshot({ ...engine.player.state });
    showToast('Gun dilepas (Fokus Melee).');
  };

  const handleUpgradeWeapon = (weaponId: WeaponId) => {
    const engine = engineRef.current;
    if (!engine) return;
    const res = engine.player.upgradeWeaponWithShards(weaponId);
    if (res.ok && res.weapon) {
      engine.saveGear();
      setPlayerSnapshot({ ...engine.player.state });
      showToast(
        `UPGRADE! ${WEAPONS[weaponId]?.name} -> Lv.${res.weapon.level} (${
          res.weapon.level === 3 ? 'MAX GLOW!' : 'GLOWING!'
        })`
      );
    } else if (res.reason) {
      showToast(res.reason);
    }
  };

  const handleEquipArmor = (id: ArmorId) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.player.equipArmor(id);
    engine.saveGear();
    setPlayerSnapshot({ ...engine.player.state });
  };

  const handleUnlockAllDemoGear = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.player.state.weaponInventory = Object.keys(WEAPONS).map((id) => ({
      defId: id as WeaponInstance['defId'],
      tier: 'epic',
      level: 2,
    }));
    engine.player.state.armorInventory = [...ARMOR_ORDER] as ArmorId[];
    engine.player.state.shards = Math.max(engine.player.state.shards, 200);
    engine.saveGear();
    setPlayerSnapshot({ ...engine.player.state });
    showToast('Sandbox aktif: 13 Senjata (termasuk Bow) + 200 Shards & 6 Armor dibuka!');
  };

  const nextStageInfo = NEXT_STAGE_MAP[modeKey];
  const isFinalVictory = modeKey === 'stage_3';

  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-black overflow-hidden touch-none">
      <div className="relative w-full max-w-[1280px] aspect-video border border-ancient-stone bg-abyss-950 shadow-2xl">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="pixelated h-full w-full block cursor-crosshair touch-none"
        />

        {hud && (
          <HUD
            hud={hud}
            toast={toast}
            areaBanner={areaBanner}
            showTouchControls={showTouchControls}
            onToggleTouchControls={() => setShowTouchControls((v) => !v)}
            onOpenInventory={() => {
              const engine = engineRef.current;
              if (!engine) return;
              engine.pauseForModal();
              setPlayerSnapshot({ ...engine.player.state });
              setShowInventory(true);
            }}
            onPause={() => engineRef.current?.pause()}
          />
        )}

        {showTouchControls && hud && !puzzleReq && !showInventory && !isPaused && (
          <TouchControls
            onAction={handleTouchAction}
            hasInteractPrompt={Boolean(hud.interactPrompt)}
            canAdrenaline={hud.adrenaline >= 100 && !hud.adrenalineActive}
            canRanged={Boolean(hud.rangedWeapon)}
          />
        )}

        {puzzleReq && (
          <PuzzleModal
            request={puzzleReq}
            stageNumber={hud?.stageNumber ?? 1}
            answeredPuzzleIds={student?.answeredPuzzleIds ?? []}
            onComplete={handlePuzzleComplete}
            onClose={() => {
              setPuzzleReq(null);
              engineRef.current?.resumeFromModal();
            }}
          />
        )}

        {showInventory && playerSnapshot && (
          <InventoryModal
            playerState={playerSnapshot}
            onEquipWeapon={handleEquipWeapon}
            onUnequipRanged={handleUnequipRanged}
            onUpgradeWeapon={handleUpgradeWeapon}
            onEquipArmor={handleEquipArmor}
            onUnlockAllDemoGear={handleUnlockAllDemoGear}
            onClose={() => {
              setShowInventory(false);
              engineRef.current?.resumeFromModal();
            }}
          />
        )}

        {isPaused && !puzzleReq && !showInventory && (
          <PauseMenu
            currentMode={modeKey}
            completedStages={student?.completedStages ?? []}
            onResume={() => {
              setIsPaused(false);
              engineRef.current?.resume();
            }}
            onRestart={() => switchMode(modeKey)}
            onSwitchMode={(m) => switchMode(m)}
            onExitToTitle={onExitToTitle}
          />
        )}

        {clearSummary && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-abyss-950/90 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md border-2 border-loot-gold bg-abyss-900 p-6 text-center shadow-2xl">
              {isFinalVictory ? (
                <Trophy className="mx-auto mb-2 h-11 w-11 text-loot-gold" />
              ) : (
                <Award className="mx-auto mb-2 h-10 w-10 text-loot-gold" />
              )}
              <h2 className="font-pixel text-base text-loot-gold">
                {isFinalVictory ? 'MISSION ACCOMPLISHED!' : 'STAGE CLEARED!'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Siswa: <strong className="text-white">{student?.username ?? 'Guest'}</strong> ·{' '}
                <span className="uppercase text-mana-cyan">
                  {hud?.themeTopic ?? modeKey}
                </span>{' '}
                selesai!
              </p>

              {/* Save status pill */}
              <div className="mt-2.5 flex justify-center">
                {clearSummary.saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 border border-mana-cyan/50 bg-mana-cyan/10 px-3 py-1 text-[11px] text-mana-cyan">
                    Menyimpan progres ke Firestore...
                  </span>
                )}
                {clearSummary.saveStatus === 'cloud' && (
                  <span className="inline-flex items-center gap-1.5 border border-loot-green/70 bg-loot-green/15 px-3 py-1 text-[11px] font-bold text-loot-green">
                    <Cloud className="h-3.5 w-3.5" /> PROGRES TERSIMPAN KE FIRESTORE ✓
                  </span>
                )}
                {clearSummary.saveStatus === 'local' && (
                  <span className="inline-flex items-center gap-1.5 border border-loot-gold/60 bg-loot-gold/10 px-3 py-1 text-[11px] text-loot-gold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tersimpan Lokal (Hubungkan Firestore untuk Cloud)
                  </span>
                )}
                {clearSummary.saveStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 border border-slayer-red/60 bg-slayer-red/10 px-3 py-1 text-[11px] text-slayer-red">
                    <CloudOff className="h-3.5 w-3.5" /> Gagal Sync Cloud: {clearSummary.saveError}
                  </span>
                )}
              </div>

              <div className="my-4 grid grid-cols-2 gap-2 border border-ancient-stone bg-abyss-950 p-3 text-xs">
                <div>
                  <div className="text-slate-400">Kills</div>
                  <div className="font-bold text-white">{clearSummary.kills}</div>
                </div>
                <div>
                  <div className="text-slate-400">Aether Shards</div>
                  <div className="font-bold text-loot-gold">{clearSummary.shards}</div>
                </div>
                <div className="col-span-2 border-t border-ancient-stone pt-2">
                  <div className="text-slate-400">Akurasi Puzzle Stage Ini</div>
                  <div className="font-bold text-loot-green">
                    {clearSummary.puzzleAttempted > 0
                      ? `${clearSummary.puzzleCorrect}/${clearSummary.puzzleAttempted} (${Math.round(
                          (clearSummary.puzzleCorrect / clearSummary.puzzleAttempted) * 100
                        )}%)`
                      : 'Belum ada puzzle dicoba'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {nextStageInfo && (
                  <button
                    type="button"
                    disabled={clearSummary.saveStatus === 'saving'}
                    onClick={() => switchMode(nextStageInfo.next, true)}
                    className="inline-flex items-center justify-center gap-2 border border-mana-cyan bg-mana-cyan/15 py-2.5 text-xs font-bold text-mana-cyan hover:bg-mana-cyan/25 disabled:opacity-50"
                  >
                    {clearSummary.saveStatus === 'saving' ? 'Menyimpan...' : nextStageInfo.label}{' '}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenReport}
                  className="inline-flex items-center justify-center gap-2 border border-loot-gold/70 bg-loot-gold/10 py-2 text-xs font-bold text-loot-gold hover:bg-loot-gold/20"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Lihat Catatan Progres &amp; Papan Skor
                </button>
                <button
                  type="button"
                  onClick={() => switchMode(modeKey)}
                  className="inline-flex items-center justify-center gap-2 border border-ancient-stone py-2 text-xs text-slate-300 hover:border-slate-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Main Lagi Stage Ini
                </button>
                <button
                  type="button"
                  onClick={onExitToTitle}
                  className="inline-flex items-center justify-center gap-2 border border-ancient-stone py-2 text-xs text-slate-400 hover:text-white"
                >
                  <Home className="h-3.5 w-3.5" /> Menu Utama
                </button>
              </div>
            </div>
          </div>
        )}

        {gameOverReason && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-abyss-950/90 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md border-2 border-slayer-red bg-abyss-900 p-6 text-center shadow-2xl">
              <h2 className="font-pixel text-base text-slayer-red">SIGNAL LOST</h2>
              <p className="mt-2 text-xs text-slate-300">{gameOverReason}</p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => switchMode(modeKey)}
                  className="inline-flex items-center justify-center gap-2 border border-slayer-orange bg-slayer-orange/20 py-2.5 text-xs font-bold text-white hover:bg-slayer-orange/35"
                >
                  <RotateCcw className="h-4 w-4" /> Respawn &amp; Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={onExitToTitle}
                  className="inline-flex items-center justify-center gap-2 border border-ancient-stone py-2 text-xs text-slate-300"
                >
                  <Home className="h-4 w-4" /> Menu Utama
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
