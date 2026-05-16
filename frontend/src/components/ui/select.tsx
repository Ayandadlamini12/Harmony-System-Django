import * as React from "react";

import { cn } from "@/lib/utils";

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--hh-border)] bg-white px-3 text-sm text-[var(--hh-text)] focus:border-[var(--hh-purple)] focus:outline-none focus:ring-2 focus:ring-[#e8d5f3]",
        className
      )}
      {...props}
    />
  );
}
