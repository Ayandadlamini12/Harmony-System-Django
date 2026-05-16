import { CalendarDays, FileWarning, HeartPulse, UserRound } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getDashboardStats, getPatients, getVisits } from "@/lib/api";

export default async function DashboardPage() {
  const [stats, patients, visits] = await Promise.all([getDashboardStats(), getPatients(), getVisits()]);
  const statCards = [
    { label: "Total patients", value: stats.total_patients, icon: UserRound, tone: "bg-[#e8d5f3] text-[var(--hh-purple)]" },
    { label: "Today's visits", value: stats.today_visits, icon: CalendarDays, tone: "bg-[#d1f5de] text-[#0a7a35]" },
    { label: "Pending drafts", value: stats.pending_drafts, icon: FileWarning, tone: "bg-amber-100 text-amber-700" },
    { label: "Follow-ups due", value: stats.follow_ups_due, icon: HeartPulse, tone: "bg-rose-100 text-rose-700" }
  ];

  return (
    <AppShell
      title="Dashboard"
      action={
        <>
          <Link className="hh-button hh-button-secondary" href="/visits/new">Add visit</Link>
          <Link className="hh-button" href="/patients/new">Register patient</Link>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="hh-panel p-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.tone}`}>
                  <Icon size={22} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <div className="text-sm text-[#66736d]">{card.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#66736d]">Recent patients</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {patients.results.map((patient) => (
                  <tr key={patient.id} className="border-t border-[var(--hh-border)]">
                    <td className="px-5 py-4 font-semibold">{patient.full_name_display}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</td>
                    <td className="px-5 py-4 text-[#66736d]">{patient.primary_phone || "No phone"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#d1f5de] px-2 py-1 text-xs font-bold text-[#0a7a35]">{patient.status}</span>
                    </td>
                  </tr>
                ))}
                {patients.results.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-[#66736d]" colSpan={4}>No patient records loaded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border)] px-5 py-4">
            <h2 className="text-sm font-bold uppercase text-[#66736d]">Recent visits</h2>
          </div>
          <div className="divide-y divide-[var(--hh-border)]">
            {visits.results.slice(0, 6).map((visit) => (
              <div key={visit.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold">{visit.patient_name || "Unknown patient"}</div>
                  <div className="text-xs text-[#66736d]">{visit.visit_date}</div>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-[#66736d]">{visit.main_complaint}</p>
              </div>
            ))}
            {visits.results.length === 0 && <div className="px-5 py-8 text-sm text-[#66736d]">No visits recorded yet.</div>}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
