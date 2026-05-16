"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface TourStep {
  targetSelector?: string;
  titleKey: string;
  descKey?: string;
  isIntro?: boolean;
}

interface Props {
  steps: TourStep[];
  locale: string;
  onDone: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const TIP_W = 300;
const TIP_GAP = 12;

function findVisible(selector: string): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>(selector);
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) return el;
  }
  return null;
}

export default function OnboardingTour({ steps, locale, onDone }: Props) {
  const t = useTranslations("tour");
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const rafRef = useRef<number>(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  const step = steps[currentStep];
  const totalSpotlight = steps.filter((s) => !s.isIntro).length;
  const isLast = currentStep === steps.length - 1;

  const goNext = useCallback(() => {
    if (currentStep >= steps.length - 1) onDoneRef.current();
    else setCurrentStep((prev) => prev + 1);
  }, [currentStep, steps.length]);

  useEffect(() => {
    setSpotlight(null);
    if (!step || step.isIntro || !step.targetSelector) return;

    const selector = step.targetSelector;

    const compute = () => {
      const el = findVisible(selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSpotlight({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };

    const schedule = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(compute);
    };

    const el = findVisible(selector);
    if (!el) {
      const next = currentStep + 1;
      if (next >= steps.length) onDoneRef.current();
      else setCurrentStep(next);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = setTimeout(compute, 400);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      cancelAnimationFrame(rafRef.current);
    };
  }, [currentStep, steps]);

  if (!step) return null;

  if (step.isIntro) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
          <h2 className="text-lg font-bold text-center text-gray-900">
            {t("intro_title")}
          </h2>

          <ol className="flex flex-col gap-3">
            {(
              [
                "intro_point1",
                "intro_point2",
                "intro_point3",
                "intro_point4",
                "intro_point5",
              ] as const
            ).map((key, i) => (
              <li key={key} className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>

          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
            {t("intro_note")}
          </p>

          <button
            onClick={goNext}
            className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            {t("get_started")}
          </button>
        </div>
      </div>
    );
  }

  if (!spotlight) {
    return <div className="fixed inset-0 z-[99998] bg-black/30" />;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const effectiveWidth = Math.min(TIP_W, vw - 24);
  const tipLeft = Math.max(12, Math.min(spotlight.left, vw - effectiveWidth - 12));

  const APPROX_TIP_H = 170;
  const belowPos = spotlight.top + spotlight.height + TIP_GAP;
  const abovePos = spotlight.top - TIP_GAP - APPROX_TIP_H;
  const hasSpaceBelow = vh - belowPos >= APPROX_TIP_H;
  const hasSpaceAbove = abovePos >= 12;
  let tipTop = hasSpaceBelow ? belowPos : hasSpaceAbove ? abovePos : belowPos;
  tipTop = Math.max(12, Math.min(tipTop, vh - APPROX_TIP_H - 12));

  return (
    <>
      {/* Blocking overlay — sits below spotlight */}
      <div className="fixed inset-0 z-[99998]" />

      {/* Spotlight cutout via box-shadow */}
      <div
        style={{
          position: "fixed",
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
          borderRadius: 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          zIndex: 99999,
          pointerEvents: "none",
        }}
      />

      {/* Tooltip card */}
      <div
        style={{
          position: "fixed",
          top: tipTop,
          left: tipLeft,
          width: effectiveWidth,
          zIndex: 100000,
        }}
        className="bg-white rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-medium">
            {t("step_of", { current: currentStep, total: totalSpotlight })}
          </span>
          <button
            onClick={() => onDoneRef.current()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div>
          <p className="text-sm font-bold text-gray-900">
            {t(step.titleKey as Parameters<typeof t>[0])}
          </p>
          {step.descKey && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              {t(step.descKey as Parameters<typeof t>[0])}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onDoneRef.current()}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-xs text-gray-500 font-medium hover:bg-gray-50 transition-colors"
          >
            {t("skip")}
          </button>
          <button
            onClick={isLast ? () => onDoneRef.current() : goNext}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            {isLast ? t("done") : t("next")}
          </button>
        </div>
      </div>
    </>
  );
}
