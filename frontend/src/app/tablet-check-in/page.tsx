import Link from "next/link";

import { PatientCheckIn } from "@/components/patient-check-in";

export default function TabletCheckInPage() {
  return (
    <main className="min-h-screen bg-[var(--hh-soft)]">
      <header className="border-b border-[var(--hh-border)] bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img alt="" className="h-12 w-12 rounded-xl object-cover" src="/brand/harmony-icon-sm.webp" />
            <div>
              <div className="text-xl font-bold text-[var(--hh-purple-dark)]">Harmony Health</div>
              <div className="text-sm text-[#66736d]">Front desk self check-in</div>
            </div>
          </div>
          <Link className="text-sm font-bold text-[var(--hh-purple)]" href="/login">
            Staff login
          </Link>
        </div>
      </header>
      <div className="px-5 py-8">
        <PatientCheckIn patients={[]} mode="tablet" />
      </div>
    </main>
  );
}
