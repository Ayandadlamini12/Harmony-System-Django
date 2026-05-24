"use client";

import { Toaster } from "sonner";

export function HarmonyToaster() {
  return (
    <Toaster
      closeButton
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "border-[var(--hh-border)]",
          success: "border-[var(--hh-green)]",
          error: "border-[var(--hh-red)]",
          loading: "border-[var(--hh-purple)]"
        }
      }}
    />
  );
}
