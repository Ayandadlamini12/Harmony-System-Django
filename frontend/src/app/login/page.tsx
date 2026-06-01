"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { LoadingButton } from "@/components/harmony-loading";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error"));
  const [registered] = useState(params.get("registered"));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: form.get("user_id"), password: form.get("password") }),
      });

      const data = (await res.json().catch(() => ({ success: false }))) as { success?: boolean };
      if (data.success) {
        const redirectTo = params.get("redirect") || "/";
        router.push(redirectTo);
      } else {
        setError("invalid");
        setLoading(false);
      }
    } catch {
      setError("invalid");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--hh-soft)] px-5">
      <section className="hh-panel w-full max-w-md px-6 pb-6 pt-3">
        <div className="mb-5 text-center">
          <img
            alt="Harmony Health"
            className="mx-auto -mt-1 h-auto w-full max-w-[320px]"
            decoding="async"
            fetchPriority="high"
            height="291"
            src="/brand/harmony-login-logo.webp"
            width="420"
          />
          <p className="mt-1 text-sm text-[#66736d]">Sign in to the clinic workspace</p>
        </div>

        {registered && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            Account created successfully. Please sign in.
          </div>
        )}

        {error === "invalid" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            Invalid User ID or password.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label>
            <span className="hh-label">User ID</span>
            <input className="hh-input" name="user_id" autoComplete="username" placeholder="Example: HH2005110" required />
          </label>
          <label>
            <span className="hh-label">Password</span>
            <input className="hh-input" name="password" type="password" autoComplete="current-password" required />
          </label>
          <LoadingButton className="w-full" type="submit" loading={loading} loadingText="Signing in...">
            Sign in
          </LoadingButton>
        </form>

        <p className="mt-4 text-center text-sm text-[#66736d]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-[var(--hh-purple)] hover:underline">Create one</Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
