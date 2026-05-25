import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "border-[var(--hh-border)] bg-slate-50 text-slate-700",
      success: "border-[#9bd6a6] bg-green-50 text-green-800",
      warning: "border-[#e3bd72] bg-amber-50 text-amber-800",
      harmony: "border-[#d0addf] bg-[#f7f0fb] text-[var(--hh-purple)]",
      outline: "border-[var(--hh-border)] bg-white text-[#3f4d47]"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
