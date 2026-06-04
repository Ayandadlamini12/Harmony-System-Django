"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Paginated, Patient } from "@/types/clinic";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/table-pagination";
import { RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";

export function DeletedPatientsClient({ initialData }: { initialData: Paginated<Patient> }) {
  const router = useRouter();
  const [patients, setPatients] = useState(initialData.results);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRestore = async (patientId: string, name: string) => {
    if (confirm(`Are you sure you want to restore the patient profile of ${name}?`)) {
      setRestoringId(patientId);
      setMessage(null);
      try {
        const res = await fetch(`/api/patients/${patientId}/restore`, {
          method: "POST",
        });
        if (res.ok) {
          setMessage({ type: "success", text: `Successfully restored ${name} to the active directory.` });
          setPatients((prev) => prev.filter((p) => p.public_id !== patientId));
          router.refresh();
        } else {
          setMessage({ type: "error", text: "Failed to restore patient. Please try again." });
        }
      } catch (err) {
        setMessage({ type: "error", text: "An error occurred. Please try again." });
      } finally {
        setRestoringId(null);
      }
    }
  };

  const calculateRetention = (deletedAtStr?: string | null) => {
    if (!deletedAtStr) return { daysRemaining: 30, pctRemaining: 100 };
    const deletedAt = new Date(deletedAtStr);
    const msDeleted = Date.now() - deletedAt.getTime();
    const daysDeleted = Math.floor(msDeleted / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysDeleted);
    const pctRemaining = Math.max(0, Math.min(100, (daysRemaining / 30) * 100));
    return { daysRemaining, pctRemaining };
  };

  return (
    <div className="grid gap-6">
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg border px-4 py-3.5 text-sm font-semibold shadow-sm transition-all duration-300 ${
            message.type === "success"
              ? "border-[#cce4d1] bg-[#f2fbf4] text-[#225c2c]"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          {message.text}
        </div>
      )}

      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Code</th>
                <th>Deleted On</th>
                <th>Retention Window</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => {
                const { daysRemaining, pctRemaining } = calculateRetention(patient.deleted_at);
                const isCritical = daysRemaining <= 5;

                return (
                  <tr key={patient.id} className="transition-all duration-300">
                    <td>
                      <div className="font-bold text-[#8a252c]">{patient.full_name_display}</div>
                      <div className="text-[11px] text-[#66736d]">
                        {patient.national_id || "No national/passport ID"}
                      </div>
                    </td>
                    <td className="font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</td>
                    <td className="text-[#66736d]">
                      {patient.deleted_at
                        ? new Date(patient.deleted_at).toLocaleDateString([], {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unknown date"}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 max-w-[160px]">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className={isCritical ? "text-red-600 font-bold" : "text-[#225c2c]"}>
                            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                          </span>
                          <span className="text-gray-400">{Math.round(pctRemaining)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isCritical ? "bg-red-500" : "bg-[#225c2c]"
                            }`}
                            style={{ width: `${pctRemaining}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="text-right">
                      <Button
                        size="sm"
                        className="bg-[#225c2c] hover:bg-[#1a4a22] text-white flex items-center gap-1.5 h-8 px-3 ml-auto shadow-sm"
                        disabled={restoringId === patient.public_id}
                        onClick={() => handleRestore(patient.public_id, patient.full_name_display)}
                      >
                        <RefreshCw size={14} className={restoringId === patient.public_id ? "animate-spin" : ""} />
                        {restoringId === patient.public_id ? "Restoring..." : "Restore"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-[#66736d]">
                    No deleted patient records found in dumpster. Excellent data health!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {initialData.count > 0 && <TablePagination count={initialData.count} />}
      </div>
    </div>
  );
}
