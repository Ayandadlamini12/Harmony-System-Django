"use client";

import { useEffect, useState } from "react";

import { ActionErrorDialog } from "@/components/action-error-dialog";
import { HARMONY_ACTION_ERROR_EVENT, type HarmonyActionError } from "@/lib/action-error";

export function ActionErrorCenter() {
  const [error, setError] = useState<HarmonyActionError | null>(null);

  useEffect(() => {
    function handleError(event: Event) {
      const detail = (event as CustomEvent<HarmonyActionError>).detail;
      if (!detail?.message) return;
      setError(detail);
    }

    window.addEventListener(HARMONY_ACTION_ERROR_EVENT, handleError);
    return () => window.removeEventListener(HARMONY_ACTION_ERROR_EVENT, handleError);
  }, []);

  return (
    <ActionErrorDialog
      open={Boolean(error)}
      title={error?.title || "Action could not be completed"}
      description={error?.description || "Please review the message below and try again."}
      message={error?.message || ""}
      onOpenChange={(open) => !open && setError(null)}
    />
  );
}
