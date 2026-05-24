import { CalendarDays, ClipboardEdit, Clock, FileWarning, HeartPulse, LockKeyhole, UserRound } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getDashboardStats, getFormDrafts, getPatients, getVisits } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { allowedForRole, workflowCards } from "@/lib/role-workflows";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getSessionUser();

  const [stats, patients, visits, drafts] = await Promise.all([getDashboardStats(), getPatients(), getVisits(), getFormDrafts()]);
  const workflows = allowedForRole(workflowCards, session.role);
  const statCards = [
    { label: "Total patients", value: stats.total_patients, icon: UserRound, tone: "bg-[#e8d5f3] text-[var(--hh-purple)]" },
    { label: "Today's visits", value: stats.today_visits, icon: CalendarDays, tone: "bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]" },
    { label: "Access requests", value: stats.pending_drafts, icon: FileWarning, tone: "bg-amber-100 text-amber-700" },
    { label: "My drafts", value: stats.my_drafts, icon: ClipboardEdit, tone: "bg-[#f5edfa] text-[var(--hh-purple)]" },
    { label: "Follow-ups due", value: stats.follow_ups_due, icon: HeartPulse, tone: "bg-rose-100 text-rose-700" }
  ];

  return (
    <AppShell
      title={`${session.role.charAt(0).toUpperCase()}${session.role.slice(1)} dashboard`}
      action={
        <>
          {session.role !== "receptionist" && <Button asChild variant="secondary"><Link href="/visits/new">Add visit</Link></Button>}
          {(session.role === "admin" || session.role === "receptionist") && <Button asChild><Link href="/patients/new">Register patient</Link></Button>}
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

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold">Workspace functions</h2>
            <p className="text-sm text-[#66736d]">Functions shown here are activated according to your role.</p>
          </div>
          <span className="rounded-full bg-[#f5edfa] px-3 py-1 text-xs font-bold capitalize text-[var(--hh-purple)]">{session.role}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((workflow) => {
            const Icon = workflow.icon;
            return (
              <Link key={workflow.title} href={workflow.href} className="hh-panel block p-5 transition hover:border-[#d1abe7] hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f5edfa] text-[var(--hh-purple)]">
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{workflow.title}</h3>
                      {workflow.status === "planned" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">planned</span>}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[#66736d]">{workflow.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {session.role === "receptionist" && (
        <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 text-amber-700" size={22} />
            <div>
              <h2 className="font-bold text-amber-900">Confidential record access requires approval</h2>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Reception can register and update non-confidential patient records. Medical notes, visits, diagnosis, remedy, and follow-up records require elevated access authorized by a clinician.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-6 hh-panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hh-border)] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold uppercase text-[#66736d]">My unfinished drafts</h2>
            <p className="mt-1 text-sm text-[#66736d]">Drafts are tied to your account and can be resumed when the related form flow is enabled.</p>
          </div>
          <span className="rounded-full bg-[#f5edfa] px-3 py-1 text-xs font-bold text-[var(--hh-purple)]">{drafts.count} open</span>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {drafts.results.slice(0, 5).map((draft) => (
            <div key={draft.draft_key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <div className="font-bold">{draft.form_type_label || draft.form_type.replaceAll("_", " ")}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-[#66736d]">
                  <span>Stage: {draft.current_stage || "Not set"}</span>
                  {draft.related_patient_name && <span>Patient: {draft.related_patient_name}</span>}
                  <span>Saved {new Date(draft.last_saved_at).toLocaleString()}</span>
                </div>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/drafts/${draft.draft_key}`}>Review / finish</Link>
              </Button>
            </div>
          ))}
          {drafts.results.length === 0 && (
            <div className="px-5 py-8 text-sm text-[#66736d]">No unfinished drafts assigned to your account.</div>
          )}
        </div>
      </section>

      {session.role === "clinician" && (
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="hh-panel p-5">
            <div className="flex items-center gap-3">
              <Clock className="text-[var(--hh-purple)]" size={22} />
              <h2 className="font-bold">Waiting list</h2>
            </div>
            <p className="mt-3 text-sm text-[#66736d]">Arrived patients from reception, tablet, and future API check-ins appear here.</p>
          </div>
          <div className="hh-panel p-5">
            <div className="flex items-center gap-3">
              <LockKeyhole className="text-[var(--hh-purple)]" size={22} />
              <h2 className="font-bold">Access approvals</h2>
            </div>
            <p className="mt-3 text-sm text-[#66736d]">Authorize temporary elevated access for reception requests.</p>
          </div>
          <div className="hh-panel p-5">
            <div className="flex items-center gap-3">
              <CalendarDays className="text-[var(--hh-purple)]" size={22} />
              <h2 className="font-bold">Appointments</h2>
            </div>
            <p className="mt-3 text-sm text-[#66736d]">Booked patients and appointment check-ins will be shown here.</p>
          </div>
        </section>
      )}

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
                      <span className="rounded-full bg-[var(--hh-green-light)] px-2 py-1 text-xs font-bold text-[var(--hh-green-dark)]">{patient.status}</span>
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
