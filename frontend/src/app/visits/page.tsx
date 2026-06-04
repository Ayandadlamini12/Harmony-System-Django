import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { getVisits } from "@/lib/api";
import { TablePagination } from "@/components/table-pagination";

function label(type: string) {
  const map: Record<string, string> = { new_consultation: "New consultation", follow_up: "Follow up", review: "Review" };
  return map[type] || type;
}

export default async function VisitListPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;

  // Compile combined query parameters for search and page
  const queryParts: string[] = [];
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
  const queryStr = queryParts.join("&");

  const visits = await getVisits(queryStr);

  return (
    <AppShell title="Visits" action={<Link className="hh-button" href="/visits/new">Add visit</Link>}>
      <form className="mb-6 flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <input
            className="hh-input pr-16"
            name="search"
            defaultValue={params.search || ""}
            placeholder="Search by patient name, code, complaint..."
          />
          {params.search && (
            <Link
              href="/visits"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#225c2c] hover:underline"
            >
              Clear
            </Link>
          )}
        </div>
        <button className="hh-button min-h-[2.5rem] px-5 bg-[#225c2c] hover:bg-[#1a4a22]" type="submit">
          Search
        </button>
      </form>

      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patient</th>
                <th>Type</th>
                <th>Complaint</th>
                <th>Vitals</th>
              </tr>
            </thead>
            <tbody>
              {visits.results.map((visit) => (
                <tr key={visit.id}>
                  <td className="font-semibold">{visit.visit_date}</td>
                  <td>
                    <div className="font-bold">{visit.patient_name || "Unknown patient"}</div>
                    <div className="font-mono text-xs text-[var(--hh-purple)]">{visit.patient_code}</div>
                  </td>
                  <td>
                    <span className="rounded-full bg-[#e8d5f3] px-2 py-0.5 text-xs font-bold text-[var(--hh-purple)]">
                      {label(visit.visit_type)}
                    </span>
                  </td>
                  <td className="max-w-md text-[#66736d]">{visit.main_complaint}</td>
                  <td className="text-[#66736d]">
                    {visit.vitals?.length ? `${visit.vitals.length} record${visit.vitals.length === 1 ? "" : "s"}` : "No vitals"}
                  </td>
                </tr>
              ))}
              {visits.results.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-[#66736d]" colSpan={5}>
                    No visits recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination count={visits.count} />
      </div>
    </AppShell>
  );
}
