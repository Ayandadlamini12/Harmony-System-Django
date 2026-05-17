"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });

    const data = await res.json();
    if (data.success) {
      const redirectTo = params.get("redirect") || "/";
      router.push(redirectTo);
    } else {
      setError("invalid");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--hh-soft)] px-5">
      <section className="hh-panel w-full max-w-md p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--hh-purple)] text-white">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Harmony Health</h1>
            <p className="text-sm text-[#66736d]">Sign in to the clinic workspace</p>
          </div>
        </div>

        {registered && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            Account created successfully. Please sign in.
          </div>
        )}

        {error === "invalid" && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            Invalid username or password.
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label>
            <span className="hh-label">Username</span>
            <input className="hh-input" name="username" autoComplete="username" required />
          </label>
          <label>
            <span className="hh-label">Password</span>
            <input className="hh-input" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="hh-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[var(--hh-soft)]"><p className="text-[#66736d]">Loading...</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
