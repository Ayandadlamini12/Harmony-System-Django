"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
};

export function StepForm({ steps, submitLabel }: { steps: Step[]; submitLabel: string }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeStep = steps[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === steps.length - 1;

  return (
    <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
      <aside className="rounded-lg border border-[var(--hh-border)] bg-white p-3 xl:sticky xl:top-6 xl:self-start">
        <div className="grid gap-1">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isComplete = index < activeIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "flex min-h-16 items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                  isActive ? "bg-[#f5edfa] text-[var(--hh-purple)]" : "hover:bg-[#f7faf8]"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    isActive && "border-[var(--hh-purple)] bg-[var(--hh-purple)] text-white",
                    isComplete && "border-[var(--hh-green)] bg-[var(--hh-green)] text-white",
                    !isActive && !isComplete && "border-[var(--hh-border)] text-[#66736d]"
                  )}
                >
                  {isComplete ? <Check size={15} /> : index + 1}
                </span>
                <span>
                  <span className="block text-sm font-bold">{step.title}</span>
                  <span className="block text-xs text-[#66736d]">{step.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="grid gap-5">
        <div className="rounded-lg border border-[var(--hh-border)] bg-white">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <p className="text-xs font-bold uppercase text-[#66736d]">Step {activeIndex + 1} of {steps.length}</p>
            <h2 className="mt-1 text-lg font-bold">{activeStep.title}</h2>
            <p className="mt-1 text-sm text-[#66736d]">{activeStep.description}</p>
          </div>
          <div className="p-5">{activeStep.content}</div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" onClick={() => setActiveIndex((value) => Math.max(0, value - 1))} disabled={isFirst}>
            <ChevronLeft size={17} /> Back
          </Button>
          {isLast ? (
            <Button type="submit" variant="success">{submitLabel}</Button>
          ) : (
            <Button type="button" onClick={() => setActiveIndex((value) => Math.min(steps.length - 1, value + 1))}>
              Continue <ChevronRight size={17} />
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
