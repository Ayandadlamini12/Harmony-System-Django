import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage() {
  const session = await getSessionUser();

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
              <h2 className="font-bold">Account management</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">
              Password changes, notification preferences, and profile editing will be configured here after the core workflow logic is finalized.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
