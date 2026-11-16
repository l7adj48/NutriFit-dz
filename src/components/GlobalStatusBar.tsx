import React from 'react';
import { AppState } from '../types';
import { calcCartTotals, calcNutrition, clamp, round0 } from '../utils/nutrition';
import { AlertCircle } from 'lucide-react';

interface GlobalStatusBarProps {
  state: AppState;
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ state }) => {
  const r = calcNutrition(state);
  const t = calcCartTotals(state);

  if (r.err) {
    return (
      <div
        className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-[#232329] px-3 py-2"
        role="status"
        aria-live="polite"
      >
        <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs text-[#b86157] font-semibold">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{r.err}</span>
        </div>
      </div>
    );
  }

  const cells = [
    {
      label: 'سعرات',
      remaining: r.kcal - t.kcal,
      target: r.kcal,
      planned: t.kcal,
      accent: '#e6d1a3',
      unit: 'kcal',
    },
    {
      label: 'بروتين',
      remaining: r.fp - t.p,
      target: r.fp,
      planned: t.p,
      accent: '#c8a96e',
      unit: 'غ',
    },
    {
      label: 'كارب',
      remaining: r.C - t.c,
      target: r.C,
      planned: t.c,
      accent: '#6b9c7e',
      unit: 'غ',
    },
    {
      label: 'دهون',
      remaining: r.F - t.f,
      target: r.F,
      planned: t.f,
      accent: '#a98c72',
      unit: 'غ',
    },
  ];

  return (
    <div
      className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-[#232329] px-3 py-1.5"
      role="region"
      aria-label="ملخص الاستهلاك اليومي مقابل الهدف"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-4 divide-x divide-x-reverse divide-[#232329]">
        {cells.map((c) => {
          const isOver = c.remaining < -0.5;
          const pct = c.target > 0 ? clamp((c.planned / c.target) * 100, 0, 100) : 0;
          const ariaLabel = isOver
            ? `${c.label}: تجاوز بمقدار ${round0(Math.abs(c.remaining))} ${c.unit} من أصل ${round0(c.target)}`
            : `${c.label}: متبقٍ ${round0(Math.max(0, c.remaining))} ${c.unit} من أصل ${round0(c.target)}`;
          return (
            <div
              key={c.label}
              className="px-2 sm:px-4 py-1 text-center"
              role="group"
              aria-label={ariaLabel}
            >
              <div className="flex items-baseline justify-center gap-0.5 tabular-nums">
                {isOver && (
                  <span className="text-[10px] font-bold text-[#b86157]" aria-hidden="true">
                    +
                  </span>
                )}
                <span
                  className={`text-sm sm:text-base font-bold ${
                    isOver ? 'text-[#b86157]' : 'text-[#f3f1ec]'
                  }`}
                >
                  {round0(Math.abs(c.remaining))}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isOver ? '#b86157' : c.accent }}
                >
                  {c.unit}
                </span>
              </div>
              <div
                className={`text-[10px] truncate ${
                  isOver ? 'text-[#b86157] font-semibold' : 'text-[#96938a]'
                }`}
              >
                {isOver ? `${c.label} · تجاوز` : `${c.label} متبقٍ`}
              </div>
              <div className="h-[2px] bg-[#1d1d22] mt-1 overflow-hidden" aria-hidden="true">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: isOver ? '#b86157' : c.accent,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
