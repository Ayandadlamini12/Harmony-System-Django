import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const session = await getSessionUser();
  const params = await searchParams;
  const pwMsg = params.password;

  return (
    <AppShell title="Profile and account">
      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="hh-panel p-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f5edfa] text-[var(--hh-purple)]">
            <UserRound size={30} />
          </div>
          <h2 className="mt-4 text-xl font-bold">{session.name}</h2>
          <p className="mt-1 text-sm text-[#66736d]">{session.username}</p>
          <span className="mt-4 inline-flex rounded-full bg-[#d1f5de] px-3 py-1 text-xs font-bold capitalize text-[#0a7a35]">{session.role}</span>
        </div>

        <div className="grid gap-4">
          <div className="hh-panel p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[var(--hh-purple)]" size={22} />
              <h2 className="font-bold">Role and permissions</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">
              Account permissions control which dashboards and confidential records are visible. Reception users see non-confidential patient records. Clinicians and admins can access medical records and approval workflows.
            </p>
          </div>
          <div className="hh-panel p-5">
            <div className="flex items-center gap-3">
              <KeyRound className="text-[var(--hh-purple)]" size={22} />
              <h2 className="font-bold">Change password</h2>
            </div>

            {pwMsg === "changed" && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                Password updated successfully.
              </div>
            )}
            {pwMsg === "wrong" && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                Current password is incorrect.
              </div>
            )}
            {pwMsg === "weak" && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                New password is too weak. Minimum 8 characters, not too common.
              </div>
            )}

            <form action="/api/auth/change-password" method="post" className="mt-3 grid gap-4">
              <label>
                <span className="hh-label">Current password</span>
                <input className="hh-input" name="old_password" type="password" autoComplete="current-password" required />
              </label>
              <label>
                <span className="hh-label">New password</span>
                <input className="hh-input" name="new_password" type="password" autoComplete="new-password" required minLength={8} />
              </label>
              <button className="hh-button" type="submit">Update password</button>
            </form>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
