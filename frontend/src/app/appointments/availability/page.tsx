import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getSchedulingResources } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

import {
  createPractitionerAvailability,
  deletePractitionerAvailability,
  getPractitionerAvailabilities,
  updatePractitionerAvailability,
} from "./actions";

const weekdayOptions = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timeValue(value: string) {
  return value.slice(0, 5);
}

function weekdayLabel(value: number) {
  return weekdayOptions.find((day) => day.value === value)?.label || "Unknown";
}

export default async function AvailabilitySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ practitioner?: string; saved?: string; error?: string }>;
}) {
  const [params, resources, session] = await Promise.all([
    searchParams,
    getSchedulingResources(),
    getSessionUser(),
  ]);

  const isAdmin = session.role === "admin";
  const isClinician = session.role === "clinician";
  const practitioners = resources.practitioners.filter((practitioner) => practitioner.role.toLowerCase() === "clinician");
  const selectedPractitioner = isAdmin
    ? params.practitioner || String(practitioners[0]?.id || "")
    : undefined;
  const availabilities = isAdmin
    ? selectedPractitioner
      ? await getPractitionerAvailabilities(selectedPractitioner)
      : []
    : isClinician
      ? await getPractitionerAvailabilities()
      : [];
  const selectedPractitionerName =
    practitioners.find((practitioner) => String(practitioner.id) === selectedPractitioner)?.name ||
    "Selected clinician";

  return (
    <AppShell
      title="Appointments - Availability Settings"
      action={
        <Button asChild variant="secondary">
          <Link href="/appointments">Back to Calendar</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-[var(--hh-border)] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hh-purple)]">
                Scheduling Controls
              </p>
              <h1 className="mt-2 text-2xl font-bold text-[var(--hh-text)]">
                Practitioner availability
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--hh-muted)]">
                Maintain weekly clinician working ranges so the appointment board can validate
                bookings against real availability before confirming an appointment.
              </p>
            </div>

            {isAdmin && (
              <form className="min-w-72 space-y-2" method="get">
                <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--hh-muted)]">
                  Clinician
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-[var(--hh-border)] bg-white px-3 text-sm font-semibold text-[var(--hh-text)]"
                  name="practitioner"
                  defaultValue={selectedPractitioner}
                >
                  {practitioners.map((practitioner) => (
                    <option key={practitioner.id} value={practitioner.id}>
                      {practitioner.name}
                    </option>
                  ))}
                </select>
                <Button className="w-full" type="submit" variant="secondary">
                  Load Availability
                </Button>
              </form>
            )}
          </div>

          {params.saved && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
              Availability settings saved.
            </div>
          )}
          {params.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              {params.error}
            </div>
          )}
          {!isAdmin && !isClinician && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Availability settings are restricted to administrators and clinicians.
            </div>
          )}
        </section>

        {isAdmin && selectedPractitioner && (
          <section className="rounded-lg border border-[var(--hh-border)] bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hh-muted)]">
                Add Weekly Range
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--hh-text)]">
                {selectedPractitionerName}
              </h2>
            </div>
            <form action={createPractitionerAvailability} className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <input name="practitioner" type="hidden" value={selectedPractitioner} />
              <Field label="Weekday">
                <select className="hh-input" name="weekday" defaultValue="0">
                  {weekdayOptions.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Start Time">
                <input className="hh-input" name="start_time" type="time" defaultValue="08:00" required />
              </Field>
              <Field label="End Time">
                <input className="hh-input" name="end_time" type="time" defaultValue="17:00" required />
              </Field>
              <Field label="Effective From">
                <input className="hh-input" name="effective_from" type="date" defaultValue={todayIso()} required />
              </Field>
              <Field label="Effective To">
                <input className="hh-input" name="effective_to" type="date" />
              </Field>
              <Field label="Location">
                <input className="hh-input" name="location" placeholder="Optional" />
              </Field>
              <div className="flex items-end">
                <Button className="w-full" type="submit">
                  Add Range
                </Button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-lg border border-[var(--hh-border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--hh-muted)]">
                Weekly Availability
              </p>
              <h2 className="mt-1 text-lg font-bold text-[var(--hh-text)]">
                {isAdmin ? selectedPractitionerName : "My availability"}
              </h2>
            </div>
            <span className="rounded-full border border-[var(--hh-border)] px-3 py-1 text-xs font-bold text-[var(--hh-muted)]">
              {availabilities.length} range{availabilities.length === 1 ? "" : "s"}
            </span>
          </div>

          {availabilities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--hh-border)] bg-[#f8fbf9] p-8 text-center text-sm text-[var(--hh-muted)]">
              No availability ranges are configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {availabilities.map((availability) => (
                <div
                  className="rounded-lg border border-[var(--hh-border)] bg-[#fbfdfc] p-4"
                  key={availability.id}
                >
                  {isAdmin ? (
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1fr_1fr_1.2fr_auto]">
                      <form
                        action={updatePractitionerAvailability}
                        className="contents"
                      >
                        <input name="id" type="hidden" value={availability.id} />
                        <input name="practitioner" type="hidden" value={availability.practitioner} />
                        <Field label="Weekday">
                          <select className="hh-input" name="weekday" defaultValue={availability.weekday}>
                            {weekdayOptions.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Start">
                          <input
                            className="hh-input"
                            name="start_time"
                            type="time"
                            defaultValue={timeValue(availability.start_time)}
                            required
                          />
                        </Field>
                        <Field label="End">
                          <input
                            className="hh-input"
                            name="end_time"
                            type="time"
                            defaultValue={timeValue(availability.end_time)}
                            required
                          />
                        </Field>
                        <Field label="Effective From">
                          <input
                            className="hh-input"
                            name="effective_from"
                            type="date"
                            defaultValue={availability.effective_from}
                            required
                          />
                        </Field>
                        <Field label="Effective To">
                          <input
                            className="hh-input"
                            name="effective_to"
                            type="date"
                            defaultValue={availability.effective_to || ""}
                          />
                        </Field>
                        <Field label="Location">
                          <input
                            className="hh-input"
                            name="location"
                            defaultValue={availability.location || ""}
                            placeholder="Optional"
                          />
                        </Field>
                        <div className="flex items-end gap-2">
                          <Button type="submit">Save</Button>
                        </div>
                      </form>
                      <form action={deletePractitionerAvailability} className="flex items-end">
                        <input name="id" type="hidden" value={availability.id} />
                        <input name="practitioner" type="hidden" value={availability.practitioner} />
                        <Button type="submit" variant="secondary">
                          Delete
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="grid gap-3 text-sm md:grid-cols-6">
                      <ReadOnlyField label="Day" value={weekdayLabel(availability.weekday)} />
                      <ReadOnlyField label="Start" value={timeValue(availability.start_time)} />
                      <ReadOnlyField label="End" value={timeValue(availability.end_time)} />
                      <ReadOnlyField label="Effective From" value={availability.effective_from} />
                      <ReadOnlyField label="Effective To" value={availability.effective_to || "Open ended"} />
                      <ReadOnlyField label="Location" value={availability.location || "Any location"} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-[var(--hh-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-white px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--hh-muted)]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[var(--hh-text)]">{value}</p>
    </div>
  );
}
