import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const toneClasses = {
  default: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  identity: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  contact: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  secure: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  clinical: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  vitals: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  appointment: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]",
  notes: "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]"
};

export type FormSectionTone = keyof typeof toneClasses;

export function FormSectionHeader({
  icon: Icon,
  title,
  description,
  eyebrow,
  tone = "default",
  className
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  eyebrow?: string;
  tone?: FormSectionTone;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", toneClasses[tone], className)}>
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase text-[#66736d]">{eyebrow}</p>}
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        {description && <p className="mt-1 text-sm leading-5 text-[#53605a]">{description}</p>}
      </div>
    </div>
  );
}
