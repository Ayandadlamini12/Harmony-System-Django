"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";

import { CONFIDENTIAL_CONDITIONS } from "@/lib/condition-records";
import type { PatientCondition } from "@/types/clinic";

export function ConditionChecklist({ conditions = [] }: { conditions?: PatientCondition[] }) {
  const conditionMap = new Map(conditions.map((condition) => [condition.condition_code, condition]));
  const [presentByCode, setPresentByCode] = useState<Record<string, boolean>>(
    Object.fromEntries(CONFIDENTIAL_CONDITIONS.map((condition) => [condition.code, conditionMap.get(condition.code)?.present ?? false]))
  );

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {CONFIDENTIAL_CONDITIONS.map((condition) => {
        const existing = conditionMap.get(condition.code);
        const present = presentByCode[condition.code] ?? false;
        return (
          <div key={condition.code} className="rounded-lg border border-[var(--hh-border)] bg-white p-3">
            <div className="text-sm font-bold text-[var(--hh-text)]">{condition.label}</div>
            <div className="mt-3 flex overflow-hidden rounded-lg border border-[var(--hh-border)]">
              <label className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 border-r border-[var(--hh-border)] text-sm font-bold has-[:checked]:bg-[var(--hh-green-light)] has-[:checked]:text-[var(--hh-green-dark)]">
                <input
                  className="sr-only"
                  type="radio"
                  name={`condition_${condition.code}`}
                  value="yes"
                  defaultChecked={present}
                  onChange={() => setPresentByCode((current) => ({ ...current, [condition.code]: true }))}
                />
                <Check size={16} className="text-[var(--hh-green-dark)]" />
                Yes
              </label>
              <label className="flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 text-sm font-bold has-[:checked]:bg-slate-100 has-[:checked]:text-slate-700">
                <input
                  className="sr-only"
                  type="radio"
                  name={`condition_${condition.code}`}
                  value="no"
                  defaultChecked={!present}
                  onChange={() => setPresentByCode((current) => ({ ...current, [condition.code]: false }))}
                />
                <X size={16} />
                No
              </label>
            </div>
            {present && (
              <label className="mt-3 block">
                <span className="hh-label">Confidential note</span>
                <textarea
                  className="hh-input min-h-20"
                  name={`condition_${condition.code}_notes`}
                  defaultValue={existing?.notes || ""}
                  placeholder={`Add ${condition.label.toLowerCase()} details`}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>
  );
}
