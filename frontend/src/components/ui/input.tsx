import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-[var(--hh-border)] bg-white px-3 text-sm text-[var(--hh-text)] placeholder:text-gray-400 focus:border-[var(--hh-purple)] focus:outline-none focus:ring-2 focus:ring-[#e8d5f3]",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";
