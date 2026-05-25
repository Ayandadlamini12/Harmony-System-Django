import Link from "next/link";
import { CalendarCheck, Clock, UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AppointmentBooking } from "@/components/appointment-booking";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAppointments, getPatients } from "@/lib/api";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatTime(value?: string | null) {
  if (!value) return "No time set";
  return value.slice(0, 5);
}

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ patient?: string }> }) {
  const params = await searchParams;
  const [patients, appointments] = await Promise.all([
    getPatients(),
    getAppointments(`appointment_date=${encodeURIComponent(today())}`)
  ]);

  return (
    <AppShell
      title="Appointments"
      action={
        <>
          <Button asChild variant="secondary"><Link href="/check-ins">Open check-ins</Link></Button>
          <Button asChild variant="secondary"><Link href="/patient-flow">Track patient flow</Link></Button>
        </>
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="hh-panel overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-[var(--hh-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase text-[#66736d]">Today&apos;s appointment board</h2>
              <p className="mt-1 text-sm text-[#66736d]">{formatDate(today())}</p>
            </div>
            <Badge variant="harmony">{appointments.count} scheduled</Badge>
          </div>
          <div className="divide-y divide-[var(--hh-border)]">
            {appointments.results.map((appointment) => (
              <div key={appointment.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <div className="font-bold">{appointment.patient_name}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#66736d]">
                      <span className="font-mono">{appointment.patient_code}</span>
                      {appointment.patient_phone && <span>{appointment.patient_phone}</span>}
                      <span>{appointment.appointment_type_label}</span>
                    </div>
                    {appointment.notes && <p className="mt-2 text-sm leading-6 text-[#53605a]">{appointment.notes}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Badge variant={appointment.status === "checked_in" ? "success" : "default"}>{appointment.status_label || appointment.status}</Badge>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--hh-border)] bg-white px-3 py-1 text-xs font-bold text-[#53605a]">
                    <Clock size={14} />
                    {formatTime(appointment.appointment_time)}
                  </span>
                  <Badge variant={appointment.source === "internal" ? "harmony" : "warning"}>{appointment.source_label || appointment.source}</Badge>
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/patients/${appointment.patient}`}>Open patient</Link>
                  </Button>
                </div>
              </div>
            ))}
            {appointments.results.length === 0 && (
              <div className="px-5 py-10 text-sm text-[#66736d]">No appointments are scheduled for today.</div>
            )}
          </div>
        </div>

        <div className="grid gap-5">
          <AppointmentBooking patients={patients.results} initialPatientId={params.patient} />
          <div className="hh-panel p-5">
            <div className="flex items-center gap-2 font-bold">
              <CalendarCheck size={18} />
              Check-in behavior
            </div>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">
              When a patient checks in on the same date as a scheduled appointment, the system marks the appointment as checked in and routes them into the appointment check-in flow instead of the walk-in queue.
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
