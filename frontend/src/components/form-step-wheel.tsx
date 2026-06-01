"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type FormStep = {
  id: string;
  title: string;
  description: string;
};

export function FormStepWheel({
  steps,
  activeIndex,
  setActiveIndex
}: {
  steps: FormStep[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  return (
    <nav className="rounded-lg border border-[var(--hh-border)] bg-white p-4 shadow-sm" aria-label="Form steps">
      <div className="relative h-36 overflow-hidden px-1 py-2 [perspective:1200px] sm:h-32">
        <div className="absolute inset-x-0 top-2 flex h-28 items-center justify-center">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isComplete = index < activeIndex;
            const offset = index - activeIndex;
            const visible = Math.abs(offset) <= 2;
            const clampedOffset = Math.max(-2, Math.min(2, offset));
            const rotate = clampedOffset * -18;
            const translateX = clampedOffset * 178;
            const translateY = Math.abs(clampedOffset) * 10;
            const scale = isActive ? 1 : 0.86;
            const zIndex = 30 - Math.abs(clampedOffset);
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                style={{
                  transform: `translateX(calc(-50% + ${translateX}px)) translateY(${translateY}px) rotateY(${rotate}deg) scale(${scale})`,
                  zIndex,
                  opacity: visible ? 1 : 0,
                  pointerEvents: visible ? "auto" : "none"
                }}
                className={cn(
                  "group absolute left-1/2 flex h-24 w-56 flex-col justify-between rounded-lg border px-4 py-3 text-left transition-all duration-300 md:w-64",
                  "shadow-[0_12px_24px_rgba(52,64,56,0.10)] hover:-translate-y-1 hover:shadow-[0_16px_28px_rgba(52,64,56,0.14)]",
                  isActive && "border-[var(--hh-purple)] bg-[var(--hh-purple)] text-white shadow-[0_18px_34px_rgba(113,49,157,0.24)]",
                  isComplete && !isActive && "border-[#b7e2c0] bg-[#f2fbf4] text-[#15351d]",
                  !isActive && !isComplete && "border-[var(--hh-border-strong)] bg-white text-[var(--hh-text)]"
                )}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                      isActive && "border-white/35 bg-white text-[var(--hh-purple)]",
                      isComplete && !isActive && "border-[var(--hh-green)] bg-[var(--hh-green)] text-white",
                      !isActive && !isComplete && "border-[var(--hh-border)] bg-[#f7faf8] text-[#66736d]"
                    )}
                  >
                    {isComplete ? <Check size={15} /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                      isActive ? "bg-white/18 text-white" : "bg-[#f0f5f2] text-[#66736d]"
                    )}
                  >
                    Step {index + 1}
                  </span>
                </span>
                <span>
                  <span className={cn("block text-base font-bold leading-tight", isActive ? "text-white" : "text-[var(--hh-text)]")}>
                    {step.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
