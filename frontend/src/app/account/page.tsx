import { Bell, KeyRound, Laptop, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import type React from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage() {
  const session = await getSessionUser();

  return (
    <AppShell title="Account">
      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="hh-panel p-5">
          <img
            alt={`${session.name} profile`}
            className="h-16 w-16 rounded-2xl border border-[#d9c7e8] bg-white object-cover"
            src={session.avatarUrl || "/brand/harmony-icon-sm.webp"}
          />
          <h2 className="mt-4 text-xl font-bold">{session.name}</h2>
          <p className="mt-1 text-sm text-[#66736d]">{session.username}</p>
          <span className="mt-4 inline-flex rounded-full bg-[var(--hh-green-light)] px-3 py-1 text-xs font-bold capitalize text-[var(--hh-green-dark)]">
            {session.role}
          </span>
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AccountCard
              description="Update your photo and clinician resume profile."
              href="/account/profile"
              icon={<UserCog size={22} />}
              title="Profile settings"
            />
            <AccountCard
              description="Change your account password."
              href="/account/password"
              icon={<KeyRound size={22} />}
              title="Password management"
            />
            <AccountCard
              description="Manage your active contact channels and preferred notification method."
              href="/account/notifications"
              icon={<Bell size={22} />}
              title="Notification settings"
            />
            <div className="hh-panel p-5 opacity-75 md:col-span-2 lg:col-span-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f1f4f2] text-[#66736d]">
                <Laptop size={22} />
              </div>
              <h3 className="mt-4 font-bold">Device management</h3>
              <p className="mt-2 text-sm leading-6 text-[#66736d]">Future account security feature for trusted devices and active sessions.</p>
              <span className="mt-4 inline-flex rounded-full bg-[#f1f4f2] px-3 py-1 text-xs font-bold uppercase text-[#66736d]">Future item</span>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function AccountCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="hh-panel p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">{icon}</div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#66736d]">{description}</p>
      <Button asChild className="mt-4" variant="secondary">
        <Link href={href}>Open</Link>
      </Button>
    </div>
  );
}
