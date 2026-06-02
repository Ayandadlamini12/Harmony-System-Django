"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Activity, LockKeyhole, ShieldCheck } from "lucide-react";

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
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fbf9,#eef7ef)] px-4 py-5 text-[var(--hh-text)] sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl overflow-hidden rounded-xl border border-[var(--hh-border)] bg-white shadow-[0_18px_50px_rgba(38,59,49,0.12)] md:grid-cols-[0.92fr_1.08fr]">
        <div className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <section className="w-full max-w-md">
            <div className="mb-7 text-center md:text-left">
              <img
                alt="Harmony Health"
                className="mx-auto h-auto w-full max-w-[250px] md:mx-0"
                decoding="async"
                fetchPriority="high"
                height="291"
                src="/brand/harmony-login-logo.webp"
                width="420"
              />
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--hh-purple)]">Secure staff access</p>
                <h2 className="mt-2 text-3xl font-bold text-[#18221d]">Sign in to Harmony MIS</h2>
                <p className="mt-2 text-sm leading-6 text-[#66736d]">
                  Use your Harmony User ID and password. The old username login is no longer used.
                </p>
              </div>
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
                <input className="hh-input h-12 text-base" name="user_id" autoComplete="username" placeholder="Example: HH2005110" required />
              </label>
              <label>
                <span className="hh-label">Password</span>
                <input className="hh-input h-12 text-base" name="password" type="password" autoComplete="current-password" required />
              </label>
              <LoadingButton className="h-12 w-full text-base" type="submit" loading={loading} loadingText="Signing in...">
                Sign in
              </LoadingButton>
            </form>

            <div className="mt-5 rounded-lg border border-[var(--hh-border)] bg-[#f8fbf9] p-3 text-sm text-[#66736d]">
              <p className="font-semibold text-[#314238]">Example IDs</p>
              <p className="mt-1">Admin: HH2005110 · Clinician: HH2005187 · Reception: HH2005264</p>
            </div>

            <p className="mt-5 text-center text-sm text-[#66736d] md:text-left">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-[var(--hh-purple)] hover:underline">
                Create one
              </Link>
            </p>
          </section>
        </div>

        <div className="relative hidden min-h-full overflow-hidden bg-[#133b29] md:block">
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            height="1536"
            src="/brand/login-harmony-hero.webp"
            width="1024"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,48,31,0.86),rgba(18,71,43,0.5)_46%,rgba(112,48,160,0.08))]" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-[linear-gradient(0deg,rgba(8,35,24,0.84),transparent)]" />

          <div className="relative flex h-full min-h-[720px] flex-col justify-between p-8 text-white xl:p-10">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/14 px-4 py-2 text-sm font-bold backdrop-blur">
              <ShieldCheck size={18} />
              Keycloak protected access
            </div>

            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8ff99]">Harmony Health MIS</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight xl:text-5xl">Clinic workflows for natural healthcare.</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-white/86">
                Patient registration, consent forms, visits, vitals, and confidential records are managed through role-aware access.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-white/20 bg-white/14 p-3 backdrop-blur">
                  <ShieldCheck className="mb-2 text-[#b4f56c]" size={22} />
                  <p className="text-sm font-bold">Role aware</p>
                </div>
                <div className="rounded-lg border border-white/20 bg-white/14 p-3 backdrop-blur">
                  <Activity className="mb-2 text-[#b4f56c]" size={22} />
                  <p className="text-sm font-bold">Patient flow</p>
                </div>
                <div className="rounded-lg border border-white/20 bg-white/14 p-3 backdrop-blur">
                  <LockKeyhole className="mb-2 text-[#b4f56c]" size={22} />
                  <p className="text-sm font-bold">Protected data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
