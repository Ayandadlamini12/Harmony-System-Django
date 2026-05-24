import { CalendarCheck, ClipboardCheck, Inbox, LockKeyhole, MessageSquare, Package, Search, UserPlus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getAccessRequests, getPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function PatientHubPage() {
  const session = await getSessionUser();

  const [patients, accessRequests] = await Promise.all([getPatients(), getAccessRequests()]);
  const canSeeClinical = session.role === "admin" || session.role === "clinician";
  const pendingAccessRequests = accessRequests.results.filter((request) => request.status === "pending");

  const cards = [
    {
      title: "Patient directory",
      description: "Search all patient demographic records and open patient workspaces.",
      href: "/patients",
      icon: Search,
      ready: true
    },
    {
      title: "Register patient",
      description: "Create non-confidential patient identity, contact, and profile records.",
      href: "/patients/new",
      icon: UserPlus,
      ready: session.role !== "clinician"
    },
    {
      title: "Check-ins",
      description: "Check in patients from reception or launch the mounted tablet view.",
      href: "/check-ins",
      icon: ClipboardCheck,
      ready: true
    },
    {
      title: "Waiting list",
      description: "Patients waiting to be seen by the doctor or clinician.",
      href: "/waiting-list",
      icon: Inbox
    },
    {
      title: "Access requests",
      description: "Receptionist requests for elevated access to confidential records.",
      href: "/access-requests",
      icon: LockKeyhole
    },
    {
      title: "Appointments",
      description: "Booked appointments and patients who have arrived for those appointments.",
      href: "/appointments",
      icon: CalendarCheck
    },
    {
      title: "Messages",
      description: "Internal chat foundation, later connected to email, WhatsApp, and Telegram.",
      href: "/messages",
      icon: MessageSquare
    },
    {
      title: "Inventory",
      description: "Future inventory management for remedies, stock, and reorder workflow.",
      href: "/inventory",
      icon: Package
    }
  ];

  return (
    <AppShell
      title="Patient management"
      action={
        <>
          <Button asChild variant="secondary"><Link href="/patients">Search patients</Link></Button>
          {(session.role === "admin" || session.role === "receptionist") && <Button asChild><Link href="/patients/new">Register patient</Link></Button>}
        </>
      }
    >
      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="hh-panel p-5">
          <h2 className="text-lg font-bold">Patient workspace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
            This dashboard separates non-confidential patient administration from confidential medical records. Reception can register and manage personal records. Clinical records require clinician or admin access.
          </p>
          <div className="mt-4 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
            <div className="text-sm font-bold">{canSeeClinical ? "Clinical access active" : "Non-confidential access only"}</div>
            <p className="mt-1 text-sm text-[#66736d]">
              {canSeeClinical
                ? "You can access visit records, vitals, diagnosis, remedies, and follow-up evaluations."
                : "Medical records require elevated authorization from a doctor or clinician."}
            </p>
          </div>
        </div>
        <div className="hh-panel p-5">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Current records</h2>
          <div className="mt-4 text-4xl font-bold">{patients.count}</div>
          <p className="mt-1 text-sm text-[#66736d]">Patient records in the system.</p>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="hh-panel block p-5 transition hover:border-[#d1abe7] hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5edfa] text-[var(--hh-purple)]">
                <Icon size={22} />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <h3 className="font-bold">{card.title}</h3>
                {!card.ready && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">planned</span>}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#66736d]">{card.description}</p>
            </Link>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div id="waiting-list" className="hh-panel p-5">
          <h2 className="font-bold">Waiting list</h2>
          <p className="mt-2 text-sm text-[#66736d]">Arrived patients are now backed by check-in records from reception, tablet self check-in, or future API methods.</p>
        </div>
        <div id="approvals" className="hh-panel p-5">
          <h2 className="font-bold">Approvals</h2>
          <p className="mt-2 text-sm text-[#66736d]">Clinicians authorize elevated access requests from reception here.</p>
          <div className="mt-4 divide-y divide-[var(--hh-border)]">
            {pendingAccessRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{request.patient_name || `Patient #${request.patient}`}</div>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-700">{request.status}</span>
                </div>
                <p className="mt-1 text-sm text-[#66736d]">{request.reason || "No reason provided."}</p>
                <p className="mt-1 text-xs text-[#66736d]">Requested by {request.requested_by_name || "Reception"}</p>
              </div>
            ))}
            {pendingAccessRequests.length === 0 && (
              <div className="py-4 text-sm text-[#66736d]">No pending access requests.</div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
