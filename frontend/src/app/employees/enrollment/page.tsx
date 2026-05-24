import { UserPlus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default function EmployeeEnrollmentPage() {
  return (
    <AppShell title="Employee enrollment">
      <section className="hh-panel p-5">
        <div className="flex items-center gap-3">
          <UserPlus className="text-[var(--hh-purple)]" size={22} />
          <h2 className="font-bold">Employee Enrollment</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
          Future HR-style employee onboarding screen for employment details, department/team assignment, professional documents, emergency contacts, and account creation handoff.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/users/enrol">Enrol system user</Link>
          </Button>
          <span className="inline-flex items-center rounded-full bg-[#f1f4f2] px-3 py-1 text-xs font-bold uppercase text-[#66736d]">Future employee module</span>
        </div>
      </section>
    </AppShell>
  );
}
