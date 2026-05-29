import { KeyRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ChangePasswordForm } from "@/components/change-password-form";

export default function PasswordManagementPage() {
  return (
    <AppShell title="Password management">
      <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <div className="hh-panel p-5">
          <div className="flex items-center gap-3">
            <KeyRound className="text-[var(--hh-purple)]" size={22} />
            <h2 className="font-bold">Password management</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
            Change your password from this dedicated account security page. Device management and session controls will be added later.
          </p>
        </div>
        <ChangePasswordForm />
      </section>
    </AppShell>
  );
}
