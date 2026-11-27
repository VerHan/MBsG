// ============================================================
// RIFTBOUND: SLAYER CORPS — Slayer Helm Decryption Terminal
// Diegetic educational puzzle modal reading from puzzles.json
// Prioritizes unseen questions and logs every student attempt.
// ============================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Cpu, ShieldAlert, XCircle } from 'lucide-react';
import type { PuzzleQuestion, StudentAnswerLog } from '../types';
import type { PuzzleRequest } from '../engine/GameEngine';
import puzzleBank from '../data/puzzles.json';

interface PuzzleModalProps {
  request: PuzzleRequest;
  stageNumber: 1 | 2 | 3;
  answeredPuzzleIds?: string[];
  onComplete: (
    interactableId: string,
    success: boolean,
    stats: { attempted: number; correct: number; logs: StudentAnswerLog[] }
  ) => void;
  onClose: () => void;
}

export function PuzzleModal({
  request,
  stageNumber,
  answeredPuzzleIds = [],
  onComplete,
  onClose,
}: PuzzleModalProps) {
  const questions = useMemo(() => {
    const all = (puzzleBank.questions ?? []) as PuzzleQuestion[];
    const byStage = all.filter((q) => q.stage === stageNumber);
    const stagePool = byStage.length > 0 ? byStage : all;
    const byTrigger = stagePool.filter((q) => q.usedIn.includes(request.trigger));
    const pool = byTrigger.length > 0 ? byTrigger : stagePool;

    // Prioritize questions the student hasn't solved yet
    const unseen = pool.filter((q) => !answeredPuzzleIds.includes(q.id));
    const seen = pool.filter((q) => answeredPuzzleIds.includes(q.id));

    const shuffledUnseen = [...unseen].sort(() => Math.random() - 0.5);
    const shuffledSeen = [...seen].sort(() => Math.random() - 0.5);

    return [...shuffledUnseen, ...shuffledSeen].slice(0, Math.max(1, request.questionsRequired));
  }, [request, stageNumber, answeredPuzzleIds]);

  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const logsRef = useRef<StudentAnswerLog[]>([]);

  const current = questions[stepIndex];
  const answered = selected !== null;
  const isCorrect = answered && current && selected === current.correctIndex;

  const handleSelect = (idx: number) => {
    if (answered || !current) return;
    setSelected(idx);
    const ok = idx === current.correctIndex;
    if (ok) setCorrectCount((c) => c + 1);
    logsRef.current.push({
      questionId: current.id,
      category: current.category,
      difficulty: current.difficulty,
      correct: ok,
      timestamp: Date.now(),
    });
  };

  const handleContinue = () => {
    if (!answered) return;
    if (!isCorrect) {
      onComplete(request.interactableId, false, {
        attempted: stepIndex + 1,
        correct: correctCount,
        logs: [...logsRef.current],
      });
      return;
    }

    if (stepIndex + 1 < questions.length) {
      setStepIndex((s) => s + 1);
      setSelected(null);
    } else {
      onComplete(request.interactableId, true, {
        attempted: questions.length,
        correct: correctCount,
        logs: [...logsRef.current],
      });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!answered && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
        const idx = Number(e.code.replace('Digit', '')) - 1;
        if (current && idx >= 0 && idx < current.options.length) handleSelect(idx);
      } else if (answered && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleContinue();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!current) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-abyss-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto border-2 border-mana-cyan bg-abyss-900 p-5 shadow-2xl scanlines">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ancient-stone pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-mana-cyan">
            <Cpu className="h-4 w-4" />
            <span>SLAYER HELM DECRYPTION // {request.title}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="border border-mana-purple/60 bg-mana-purple/10 px-2 py-0.5 uppercase text-mana-purple">
              {current.category} · {current.difficulty}
            </span>
            <span className="text-slate-400">
              Soal {stepIndex + 1}/{questions.length}
            </span>
          </div>
        </div>

        <p className="mb-4 text-sm font-semibold leading-relaxed text-white">
          {current.question}
        </p>

        <div className="space-y-2">
          {current.options.map((opt, idx) => {
            const label = String.fromCharCode(65 + idx);
            let style =
              'border-ancient-stone bg-abyss-950/90 text-slate-200 hover:border-mana-cyan';
            if (answered) {
              if (idx === current.correctIndex) {
                style = 'border-loot-green bg-loot-green/15 text-loot-green';
              } else if (idx === selected) {
                style = 'border-slayer-red bg-slayer-red/15 text-slayer-red';
              } else {
                style = 'border-ancient-stone/50 bg-abyss-950/40 text-slate-500';
              }
            }
            return (
              <button
                key={idx}
                type="button"
                disabled={answered}
                onClick={() => handleSelect(idx)}
                className={`flex w-full items-center gap-3 border px-3.5 py-2.5 text-left text-xs transition ${style}`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-current font-bold">
                  {label}
                </span>
                <span className="flex-1">{opt}</span>
                <span className="text-[10px] opacity-50">[{idx + 1}]</span>
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`mt-4 border p-3 text-xs ${
              isCorrect
                ? 'border-loot-green/60 bg-loot-green/10 text-loot-green'
                : 'border-slayer-red/60 bg-slayer-red/10 text-slayer-red'
            }`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-bold">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> DEKRIPSI BERHASIL!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" /> DEKRIPSI GAGAL — MANA FEEDBACK!
                </>
              )}
            </div>
            <p className="text-slate-200">{current.explanation}</p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between pt-2 text-[11px]">
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldAlert className="h-3.5 w-3.5 text-slayer-orange" />
            Simulasi di-pause &amp; progres dicatat otomatis
          </span>
          <div className="flex gap-2">
            {!answered && (
              <button
                type="button"
                onClick={onClose}
                className="border border-ancient-stone px-3 py-1.5 text-slate-300 hover:border-slate-400"
              >
                Batal [ESC]
              </button>
            )}
            {answered && (
              <button
                type="button"
                onClick={handleContinue}
                className="border border-mana-cyan bg-mana-cyan/15 px-4 py-1.5 font-bold text-mana-cyan hover:bg-mana-cyan/25"
              >
                {isCorrect && stepIndex + 1 < questions.length
                  ? 'Soal Berikutnya [Enter]'
                  : 'Lanjutkan [Enter]'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
