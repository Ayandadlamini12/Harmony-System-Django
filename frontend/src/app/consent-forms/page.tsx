import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getConsentForms } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const consentStatusLabels: Record<string, string> = {
  pending: "Pending",
  generated: "Generated",
  signed: "Signed",
  verified: "Verified",
};

const consentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  generated: "bg-blue-100 text-blue-800",
  signed: "bg-green-100 text-green-800",
  verified: "bg-purple-100 text-purple-800",
};

export default async function ConsentFormsPage() {
  const session = await getSessionUser();
  const patients = await getConsentForms();

  return (
    <AppShell title="Consent Forms">
      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Code</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Consent</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <Link href={`/patients/${patient.public_id}`} className="font-bold text-[var(--hh-purple)] hover:underline">
                      {patient.full_name_display}
                    </Link>
                  </td>
                  <td className="font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</td>
                  <td className="text-[#66736d]">{patient.primary_phone || "--"}</td>
                  <td>
                    <span className="rounded-full bg-[var(--hh-green-light)] px-2 py-0.5 text-xs font-bold text-[var(--hh-green-dark)]">
                      {patient.status}
                    </span>
                  </td>
                  <td>
                    <Badge className={consentStatusColors[patient.consent_status || "pending"]}>
                      {consentStatusLabels[patient.consent_status || "pending"]}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/patients/${patient.public_id}`}>Open Record</Link>
                      </Button>
                      {(patient.consent_status === "pending" || patient.consent_status === "generated") && (
                        <Button asChild size="sm">
                          <Link href={`/patients/${patient.public_id}#consent`}>Generate</Link>
                        </Button>
                      )}
                      {patient.consent_status === "signed" && (
                        <Button asChild size="sm">
                          <Link href={`/patients/${patient.public_id}#documents`}>Review</Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-[#66736d]" colSpan={6}>
                    All patients have up-to-date consent forms.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
