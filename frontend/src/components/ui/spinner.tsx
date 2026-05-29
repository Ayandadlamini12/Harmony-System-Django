import { LoaderCircle } from "lucide-react";
import type React from "react";

import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.ComponentProps<typeof LoaderCircle>) {
  return (
    <LoaderCircle
      aria-label="Loading"
      className={cn("size-4 animate-spin text-current", className)}
      role="status"
      {...props}
    />
  );
}
