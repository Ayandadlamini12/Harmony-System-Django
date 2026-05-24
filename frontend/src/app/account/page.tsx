import { ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfilePhotoUploader } from "@/components/profile-photo-uploader";
import { getSessionUser } from "@/lib/session";

export default async function AccountPage() {
  const session = await getSessionUser();

  return (
    <AppShell title="Profile and account">
      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="hh-panel p-5">
          <img
            alt={`${session.name} profile`}
            className="h-16 w-16 rounded-2xl border border-[#d9c7e8] bg-white object-cover"
            src={session.avatarUrl || "/brand/harmony-icon-sm.webp"}
          />
          <h2 className="mt-4 text-xl font-bold">{session.name}</h2>
          <p className="mt-1 text-sm text-[#66736d]">{session.username}</p>
          <span className="mt-4 inline-flex rounded-full bg-[var(--hh-green-light)] px-3 py-1 text-xs font-bold capitalize text-[var(--hh-green-dark)]">{session.role}</span>
          <ProfilePhotoUploader avatarUrl={session.avatarUrl} name={session.name} />
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
          <ChangePasswordForm />
        </div>
      </section>
    </AppShell>
  );
}
