"use client";

export type HarmonyActionError = {
  title?: string;
  description?: string;
  message: string;
};

export const HARMONY_ACTION_ERROR_EVENT = "harmony:action-error";

export function showActionError(error: HarmonyActionError | string) {
  const detail: HarmonyActionError =
    typeof error === "string"
      ? { message: error }
      : error;

  window.dispatchEvent(new CustomEvent<HarmonyActionError>(HARMONY_ACTION_ERROR_EVENT, { detail }));
}
