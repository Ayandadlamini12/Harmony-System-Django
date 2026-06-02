"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { showActionError } from "@/lib/action-error";

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password: form.get("old_password"), new_password: form.get("new_password") }),
    });

    const data = await res.json();
    if (data.success) {
      setMessage({ type: "success", text: "Password updated successfully." });
      toast.success("Password updated");
      e.currentTarget.reset();
    } else {
      const msg = data.error === "wrong" ? "Current password is incorrect."
        : data.error === "weak" ? "New password is too weak. Minimum 8 characters, not too common."
        : "Password change failed.";
      setMessage({ type: "error", text: msg });
      showActionError({
        title: "Password change failed",
        message: msg
      });
    }
    setLoading(false);
  }

  return (
    <div className="hh-panel p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5edfa]">
          <svg className="text-[var(--hh-purple)]" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/><path d="M9 21h6"/></svg>
        </div>
        <h2 className="font-bold">Change password</h2>
      </div>

      {message && (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
          message.type === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-3 grid gap-4">
        <label>
          <span className="hh-label">Current password</span>
          <input className="hh-input" name="old_password" type="password" autoComplete="current-password" required />
        </label>
        <label>
          <span className="hh-label">New password</span>
          <input className="hh-input" name="new_password" type="password" autoComplete="new-password" required minLength={8} />
        </label>
        <LoadingButton type="submit" loading={loading} loadingText="Updating password...">
          Update password
        </LoadingButton>
      </form>
    </div>
  );
}
