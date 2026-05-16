import { AppShell } from "@/components/app-shell";

const roles = [
  ["Receptionist", "Patient registration, demographic updates, appointment intake"],
  ["Clinician", "Consultation records, vitals review, diagnosis and remedy notes"],
  ["Admin", "Staff accounts, audit logs, system settings and reporting"]
];

export default function StaffPage() {
  return (
    <AppShell title="Staff and roles">
      <div className="grid gap-4 lg:grid-cols-3">
        {roles.map(([role, access]) => (
          <div key={role} className="hh-panel p-5">
            <h2 className="text-base font-bold">{role}</h2>
            <p className="mt-3 text-sm leading-6 text-[#66736d]">{access}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
