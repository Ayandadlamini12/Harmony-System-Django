"use client";

/**
 * Parses a cookie value on the client side.
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

/**
 * Returns the currently logged in practitioner username from cookies, or "anonymous" as fallback.
 */
export function getPractitionerId(): string {
  return getCookie("harmony_username") || "anonymous";
}

/**
 * Generates a secure, practitioner-isolated key for storing visit drafts.
 */
export function getDraftKey(patientId: string): string {
  const username = getPractitionerId();
  return `harmony_draft_${username}_${patientId || "new"}`;
}

/**
 * Removes all harmony visit drafts from localStorage on logout.
 */
export function clearAllLocalDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith("harmony_draft_")) {
        localStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.error("Failed to clear local drafts:", err);
  }
}

/**
 * Checks if a draft has expired (older than 24 hours).
 */
export function isDraftExpired(timestamp: string): boolean {
  if (!timestamp) return true;
  try {
    const draftDate = new Date(timestamp).getTime();
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return now - draftDate > twentyFourHours;
  } catch {
    return true;
  }
}
