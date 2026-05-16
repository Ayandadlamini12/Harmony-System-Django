import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const params = await searchParams;
  const [patients, session] = await Promise.all([getPatients(params.search || ""), getSessionUser()]);
  const canRegister = session.role === "admin" || session.role === "receptionist";

  return (
    <AppShell
      title="Patient directory"
      action={canRegister ? <Link className="hh-button" href="/patients/new">Register patient</Link> : undefined}
    >
      <form className="mb-5 max-w-md">
        <input className="hh-input" name="search" defaultValue={params.search || ""} placeholder="Search by name, code, ID, or phone" />
      </form>

      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
              <tr>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Gender</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Last visit</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {patients.results.map((patient) => (
                <tr key={patient.id} className="border-t border-[var(--hh-border)]">
                  <td className="px-5 py-4">
                    <Link href={`/patients/${patient.id}`} className="font-bold text-[var(--hh-purple)] hover:underline">{patient.full_name_display}</Link>
                    <div className="text-xs text-[#66736d]">{patient.national_id || "No national ID"}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</td>
                  <td className="px-5 py-4 capitalize">{patient.gender.replaceAll("_", " ")}</td>
                  <td className="px-5 py-4 text-[#66736d]">{patient.primary_phone || "No phone"}</td>
                  <td className="px-5 py-4 text-[#66736d]">{patient.last_visit_date || "--"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[var(--hh-green-light)] px-2 py-1 text-xs font-bold text-[var(--hh-green-dark)]">{patient.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="secondary" size="sm"><Link href={`/patients/${patient.id}`}>Open</Link></Button>
                      <Button asChild variant="secondary" size="sm"><Link href={`/patients/${patient.id}/edit`}>Edit</Link></Button>
                      {session.role !== "receptionist" && <Button asChild size="sm"><Link href={`/visits/new?patient=${patient.id}`}>Visit</Link></Button>}
                    </div>
                  </td>
                </tr>
              ))}
              {patients.results.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-[#66736d]" colSpan={7}>No patients found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
