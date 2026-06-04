import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getCases } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function CasesListPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const session = await getSessionUser();
  const params = await searchParams;
  const cases = await getCases(params.search || "");

  return (
    <AppShell
      title="Cases"
      action={<Link className="hh-button" href="/visits/new">Add visit</Link>}
    >
      <form className="mb-5 max-w-md">
        <input className="hh-input" name="search" defaultValue={params.search || ""} placeholder="Search by title, complaint, diagnosis, or patient name" />
      </form>

      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>Case</th>
                <th>Patient</th>
                <th>Visit date</th>
                <th>Status</th>
                <th>Diagnosis</th>
                <th>Created</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {cases.results.map((c) => (
                <tr key={c.id}>
                  <td className="font-bold text-[var(--hh-purple)]">{c.title}</td>
                  <td>
                    {c.patient_public_id ? (
                      <Link href={`/patients/${c.patient_public_id}`} className="text-[var(--hh-purple)] hover:underline">
                        {c.patient_name || `Patient #${c.patient}`}
                      </Link>
                    ) : (
                      <span>{c.patient_name || `Patient #${c.patient}`}</span>
                    )}
                    <div className="text-xs text-[#66736d]">{c.patient_code}</div>
                  </td>
                  <td className="text-[#66736d]">{c.visit_date || "--"}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.status === "open" ? "bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]" : "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate text-[#66736d]" title={c.diagnosis || ""}>
                    {c.diagnosis || "--"}
                  </td>
                  <td className="text-[#66736d]">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "--"}
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      {c.patient_public_id ? (
                        <Link href={`/patients/${c.patient_public_id}`} className="rounded-md border border-[var(--hh-border)] px-2.5 py-1 text-xs text-[var(--hh-purple)] hover:bg-[var(--hh-bg)] transition-colors font-semibold">
                          Open patient
                        </Link>
                      ) : (
                        <Link href={`/patients/${c.patient}`} className="rounded-md border border-[var(--hh-border)] px-2.5 py-1 text-xs text-[var(--hh-purple)] hover:bg-[var(--hh-bg)] transition-colors font-semibold">
                          Open patient
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {cases.results.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-[#66736d]" colSpan={7}>No cases found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
