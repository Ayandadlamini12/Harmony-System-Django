import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-lg border border-[var(--hh-border)] bg-white px-3 py-2 text-sm text-[var(--hh-text)] placeholder:text-gray-400 focus:border-[var(--hh-purple)] focus:outline-none focus:ring-2 focus:ring-[#e8d5f3]",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";
