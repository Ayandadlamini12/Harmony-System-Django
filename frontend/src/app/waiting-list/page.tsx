import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getCheckIns } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function WaitingListPage() {
  const checkIns = await getCheckIns("waiting");
  const waiting = checkIns.results;

  return (
    <AppShell title="Waiting list" action={<Button asChild><Link href="/check-ins">Check in patient</Link></Button>}>
      <div className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Patients waiting to be seen</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Code</th>
                <th>Time Checked In</th>
                <th>Visit Type</th>
                <th>Method</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {waiting.slice(0, 12).map((checkIn) => (
                <tr key={checkIn.id}>
                  <td>
                    <div className="font-bold text-[var(--hh-purple)]">{checkIn.patient_name || "Unknown patient"}</div>
                  </td>
                  <td className="font-mono text-xs text-[var(--hh-purple)]">
                    {checkIn.patient_code}
                  </td>
                  <td className="text-[#66736d]">
                    {new Date(checkIn.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="capitalize">
                    {checkIn.visit_type.replaceAll("_", " ")}
                  </td>
                  <td className="capitalize text-[#66736d]">
                    {checkIn.method}
                  </td>
                  <td>
                    <span className="rounded-full bg-[var(--hh-green-light)] px-2.5 py-0.5 text-xs font-bold text-[var(--hh-green-dark)]">
                      Waiting
                    </span>
                  </td>
                  <td className="text-right">
                    <Button asChild size="sm">
                      <Link href={`/visits/new?patient=${checkIn.patient}&type=${checkIn.visit_type}`}>
                        Start visit
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {waiting.length === 0 && (
            <div className="px-5 py-10 text-sm text-[#66736d] text-center">
              No patients are waiting yet. Use the check-in desk or tablet view when a patient arrives.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
