import { ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/app-shell";

export default function RolesPage() {
  return (
    <AppShell title="Roles">
      <div className="hh-panel p-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[var(--hh-purple)]" size={22} />
          <h2 className="font-bold">Roles</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
          Future admin screen for managing permission roles, access scopes, and role-based dashboard capabilities.
        </p>
        <span className="mt-4 inline-flex rounded-full bg-[#f1f4f2] px-3 py-1 text-xs font-bold uppercase text-[#66736d]">Future item</span>
      </div>
    </AppShell>
  );
}
