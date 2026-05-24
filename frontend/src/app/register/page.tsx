"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { LoadingButton } from "@/components/harmony-loading";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("error") || null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      username: String(form.get("username") || ""),
      email: String(form.get("email") || ""),
      first_name: String(form.get("first_name") || ""),
      last_name: String(form.get("last_name") || ""),
      password: String(form.get("password") || ""),
      confirm_password: String(form.get("confirm_password") || ""),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.success) {
      router.push("/login?registered=1");
    } else {
      setError(data.error || "unknown");
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
            <p className="text-sm text-[#66736d]">Create a new account</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error === "exists" && "A user with that username already exists."}
            {error === "mismatch" && "Passwords do not match."}
            {error === "weak" && "Password is too weak. Minimum 8 characters required."}
            {error === "unknown" && "Registration failed. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="hh-label">First name</span>
              <input className="hh-input" name="first_name" required />
            </label>
            <label>
              <span className="hh-label">Last name</span>
              <input className="hh-input" name="last_name" required />
            </label>
          </div>
          <label>
            <span className="hh-label">Username</span>
            <input className="hh-input" name="username" autoComplete="username" required />
          </label>
          <label>
            <span className="hh-label">Email</span>
            <input className="hh-input" name="email" type="email" autoComplete="email" />
          </label>
          <label>
            <span className="hh-label">Password</span>
            <input className="hh-input" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <label>
            <span className="hh-label">Confirm password</span>
            <input className="hh-input" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} />
          </label>
          <LoadingButton className="w-full" type="submit" loading={loading} loadingText="Creating account...">
            Create account
          </LoadingButton>
        </form>

        <p className="mt-4 text-center text-sm text-[#66736d]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--hh-purple)] hover:underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
