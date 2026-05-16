import { AppShell } from "@/components/app-shell";
import { getVisits } from "@/lib/api";
import Link from "next/link";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default async function VisitsPage() {
  const visits = await getVisits();

  return (
    <AppShell title="Visits" action={<Link className="hh-button" href="/visits/new">Add visit</Link>}>
      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Patient</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Complaint</th>
                <th className="px-5 py-3">Vitals</th>
              </tr>
            </thead>
            <tbody>
              {visits.results.map((visit) => (
                <tr key={visit.id} className="border-t border-[var(--hh-border)]">
                  <td className="px-5 py-4 font-semibold">{visit.visit_date}</td>
                  <td className="px-5 py-4">
                    <div className="font-bold">{visit.patient_name || "Unknown patient"}</div>
                    <div className="font-mono text-xs text-[var(--hh-purple)]">{visit.patient_code}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-[#e8d5f3] px-2 py-1 text-xs font-bold text-[var(--hh-purple)]">{label(visit.visit_type)}</span>
                  </td>
                  <td className="max-w-md px-5 py-4 text-[#66736d]">{visit.main_complaint}</td>
                  <td className="px-5 py-4 text-[#66736d]">
                    BP {visit.vitals?.bp_first_reading || "--"}/{visit.vitals?.bp_second_reading || "--"}, pulse {visit.vitals?.pulse || "--"}
                  </td>
                </tr>
              ))}
              {visits.results.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-center text-[#66736d]" colSpan={5}>No visits recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
