import { Activity, Archive, CalendarDays, Users } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { getDashboardStats } from "@/lib/api";

export default async function ReportsPage() {
  const stats = await getDashboardStats();
  const cards = [
    ["Patient activity", stats.total_patients, Users],
    ["Visit volume", stats.today_visits, CalendarDays],
    ["Access requests", stats.pending_drafts, Archive],
    ["Follow-ups due", stats.follow_ups_due, Activity]
  ] as const;

  return (
    <AppShell title="Reports">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, value, Icon]) => (
          <div key={title} className="hh-panel p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5edfa] text-[var(--hh-purple)]">
                <Icon size={22} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-sm text-[#66736d]">{title}</div>
              </div>
            </div>
          </div>
        ))}
      </section>
      <div className="mt-6 hh-panel p-5">
        <h2 className="font-bold">Report exports</h2>
        <p className="mt-2 text-sm leading-6 text-[#66736d]">
          The reports route is now wired. Export filters, date ranges, and printable summaries will be added after the record models are finalized.
        </p>
      </div>
    </AppShell>
  );
}
