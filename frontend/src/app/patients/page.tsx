import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { TablePagination } from "@/components/table-pagination";
import { SeedButton } from "@/components/seed-button";
import { PatientSearchForm } from "@/components/patient-search-form";

export const dynamic = "force-dynamic";

export default async function PatientListPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await getSessionUser();
  const params = await searchParams;

  // Compile combined query parameters for search and page
  const queryParts: string[] = [];
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
  const queryStr = queryParts.join("&");

  const patients = await getPatients(queryStr);
  const canRegister = session.role === "admin" || session.role === "receptionist";

  return (
    <AppShell
      title="Patient directory"
      action={
        <div className="flex items-center gap-3">
          {canRegister && <SeedButton />}
          {canRegister && (
            <Link className="hh-button" href="/patients/new">
              Register patient
            </Link>
          )}
        </div>
      }
    >
      <PatientSearchForm />

      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Code</th>
                <th>Gender</th>
                <th>Contact</th>
                <th>Last visit</th>
                <th>Today&apos;s flow</th>
                <th>Status</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {patients.results.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <Link
                      href={`/patients/${patient.public_id}`}
                      className="font-bold text-[var(--hh-purple)] hover:underline"
                    >
                      {patient.full_name_display}
                    </Link>
                    <div className="text-[11px] text-[#66736d]">
                      {patient.national_id || "No national/passport ID"}
                    </div>
                    {patient.email && <div className="text-[11px] text-[#66736d]">{patient.email}</div>}
                  </td>
                  <td className="font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</td>
                  <td className="capitalize">{patient.gender.replaceAll("_", " ")}</td>
                  <td className="text-[#66736d]">{patient.primary_phone || "No phone"}</td>
                  <td className="text-[#66736d]">{patient.last_visit_date || "--"}</td>
                  <td>
                    {patient.current_journey ? (
                      <div className="grid gap-0.5">
                        <span className="font-bold text-[var(--hh-purple)]">
                          {patient.current_journey.current_stage_label}
                        </span>
                        <span className="text-[10px] text-[#66736d]">
                          {patient.current_journey.queue_number
                            ? `Queue #${patient.current_journey.queue_number}`
                            : patient.current_journey.flow_type_label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#66736d]">--</span>
                    )}
                  </td>
                  <td>
                    <span className="rounded-full bg-[var(--hh-green-light)] px-2 py-0.5 text-xs font-bold text-[var(--hh-green-dark)]">
                      {patient.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5">
                      <Button asChild variant="secondary" className="h-7 px-2.5 text-xs shadow-sm">
                        <Link href={`/patients/${patient.public_id}`}>Open</Link>
                      </Button>
                      <Button asChild variant="secondary" className="h-7 px-2.5 text-xs shadow-sm">
                        <Link href={`/patients/${patient.public_id}/edit`}>Edit</Link>
                      </Button>
                      {session.role !== "receptionist" && (
                        <Button asChild className="h-7 px-2.5 text-xs shadow-sm bg-[#225c2c] hover:bg-[#1a4a22]">
                          <Link href={`/visits/new?patient=${patient.id}`}>Visit</Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {patients.results.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-[#66736d]" colSpan={8}>
                    No patients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination count={patients.count} />
      </div>
    </AppShell>
  );
}
