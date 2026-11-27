// ============================================================
// RIFTBOUND: SLAYER CORPS — Lore Intro Screen (Skippable)
// ============================================================

import { useEffect, useState } from 'react';
import { FastForward, ArrowRight } from 'lucide-react';

interface LoreIntroProps {
  onFinish: () => void;
}

const LORE_PARAGRAPHS = [
  '200 TAHUN LALU — Pertempuran terakhir antara Ancient Beings dan Sang Hero merobek langit dan membuka ratusan Rift di permukaan bumi.',
  'Mana murni bocor tanpa henti, mengubah atmosfer menjadi racun dan memutasikan fauna serta reruntuhan mesin kuno menjadi monster.',
  'Umat manusia melarikan diri ke Pulau-Pulau Terbang di atas awan — lalu menutup akses naik demi menjaga takhta mereka sendiri.',
  'Lahir di dunia bawah, ibumu mengorbankan jiwanya dalam ritual terlarang agar kau bisa naik ke atas awan.',
  'Tumbuh sebagai kaum buangan, kini kau mengenakan helm tertutup SLAYER CORPS dan diturunkan kembali ke permukaan: basmi monster, rebut teknologi kuno, dan dekripsi segel pengetahuan.',
];

export function LoreIntro({ onFinish }: LoreIntroProps) {
  const [visibleCount, setVisibleCount] = useState(1);

  useEffect(() => {
    if (visibleCount >= LORE_PARAGRAPHS.length) return;
    const t = setTimeout(() => setVisibleCount((c) => c + 1), 1800);
    return () => clearTimeout(t);
  }, [visibleCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        onFinish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFinish]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-abyss-950 px-6 py-8 text-slate-200 scanlines">
      <div className="w-full max-w-2xl border-2 border-ancient-stone bg-abyss-900/95 p-6 shadow-2xl md:p-8">
        <div className="mb-4 flex items-center justify-between border-b border-ancient-stone pb-3">
          <span className="font-pixel text-xs text-mana-cyan">ARCHIVE // THE CATACLYSM</span>
          <button
            type="button"
            onClick={onFinish}
            className="inline-flex items-center gap-1 border border-ancient-stone px-2.5 py-1 text-[11px] text-slate-300 hover:border-loot-gold hover:text-loot-gold"
          >
            <FastForward className="h-3.5 w-3.5" /> Skip [ESC]
          </button>
        </div>

        <div className="min-h-[240px] space-y-4 text-xs leading-relaxed md:text-sm">
          {LORE_PARAGRAPHS.slice(0, visibleCount).map((text, idx) => (
            <p
              key={idx}
              className={
                idx === LORE_PARAGRAPHS.length - 1
                  ? 'border-l-2 border-slayer-orange pl-3 font-semibold text-white'
                  : 'text-slate-300'
              }
            >
              {text}
            </p>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onFinish}
            className="inline-flex items-center gap-2 border-2 border-slayer-orange bg-slayer-orange/20 px-5 py-2.5 font-pixel text-xs text-white hover:bg-slayer-orange/35"
          >
            TURUN KE PERMUKAAN <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
