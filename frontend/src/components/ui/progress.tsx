import type React from "react";

import { cn } from "@/lib/utils";

export function Progress({
  className,
  value,
  label,
  ...props
}: React.ComponentProps<"div"> & { value?: number; label?: string }) {
  const normalized = typeof value === "number" ? Math.max(0, Math.min(100, value)) : undefined;

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={normalized}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[#e8eee9]", className)}
      role="progressbar"
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-[var(--hh-purple)] transition-all",
          normalized === undefined && "w-1/3 animate-[hh-indeterminate_1.25s_ease-in-out_infinite]"
        )}
        style={normalized !== undefined ? { width: `${normalized}%` } : undefined}
      />
    </div>
  );
}
