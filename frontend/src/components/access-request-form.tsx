"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import type { Patient } from "@/types/clinic";

export function AccessRequestForm({ patients }: { patients: Patient[] }) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/access-requests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient: Number(form.get("patient")), reason: String(form.get("reason") || "").trim() }),
    });

    const data = await res.json();
    if (data.success) {
      setMessage({ type: "success", text: "Access request submitted." });
      toast.success("Access request submitted");
      e.currentTarget.reset();
    } else {
      setMessage({ type: "error", text: "Could not submit request." });
      toast.error("Could not submit access request");
    }
    setLoading(false);
  }

  return (
    <>
      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm font-semibold ${
          message.type === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label>
          <span className="hh-label">Patient</span>
          <select className="hh-input" name="patient" required>
            <option value="">Select patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>{patient.full_name_display} - {patient.patient_code}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="hh-label">Reason</span>
          <textarea className="hh-input min-h-28" name="reason" placeholder="Explain why temporary clinical access is needed." required />
        </label>
        <LoadingButton type="submit" loading={loading} loadingText="Submitting request...">
          Submit request
        </LoadingButton>
      </form>
    </>
  );
}
