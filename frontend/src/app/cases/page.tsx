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
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
              <tr>
                <th className="px-5 py-3">Case</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Visit date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Diagnosis</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {cases.results.map((c) => (
                <tr key={c.id} className="border-t border-[var(--hh-border)]">
                  <td className="px-5 py-4 font-bold text-[var(--hh-purple)]">{c.title}</td>
                  <td className="px-5 py-4">
                    {c.patient_public_id ? (
                      <Link href={`/patients/${c.patient_public_id}`} className="text-[var(--hh-purple)] hover:underline">
                        {c.patient_name || `Patient #${c.patient}`}
                      </Link>
                    ) : (
                      <span>{c.patient_name || `Patient #${c.patient}`}</span>
                    )}
                    <div className="text-xs text-[#66736d]">{c.patient_code}</div>
                  </td>
                  <td className="px-5 py-4 text-[#66736d]">{c.visit_date || "--"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${c.status === "open" ? "bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]" : "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 max-w-[200px] truncate text-[#66736d]" title={c.diagnosis || ""}>
                    {c.diagnosis || "--"}
                  </td>
                  <td className="px-5 py-4 text-[#66736d]">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "--"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {c.patient_public_id ? (
                        <Link href={`/patients/${c.patient_public_id}`} className="rounded-md border border-[var(--hh-border)] px-3 py-1.5 text-xs text-[var(--hh-purple)] hover:bg-[var(--hh-bg)] transition-colors">
                          Open patient
                        </Link>
                      ) : (
                        <Link href={`/patients/${c.patient}`} className="rounded-md border border-[var(--hh-border)] px-3 py-1.5 text-xs text-[var(--hh-purple)] hover:bg-[var(--hh-bg)] transition-colors">
                          Open patient
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {cases.results.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-[#66736d]" colSpan={7}>No cases found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
