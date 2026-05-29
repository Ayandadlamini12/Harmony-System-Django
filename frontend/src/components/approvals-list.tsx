"use client";

import { useState } from "react";
import { ApproveRejectForm } from "@/components/approve-reject-form";
import type { ElevatedAccessRequest } from "@/types/clinic";

export function ApprovalsList({ initialPending }: { initialPending: ElevatedAccessRequest[] }) {
  const [pending, setPending] = useState(initialPending);
  const [feedback, setFeedback] = useState<{ type: "approved" | "rejected" | "error"; text: string } | null>(null);

  function handleDone(id: number, action: "approved" | "rejected") {
    setPending((prev) => prev.filter((r) => r.id !== id));
    setFeedback({
      type: action,
      text: action === "approved" ? "Access request approved." : "Access request rejected.",
    });
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <>
      {feedback && (
        <div className={`mb-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
          feedback.type === "approved"
            ? "border-green-200 bg-green-50 text-green-700"
            : feedback.type === "rejected"
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {feedback.text}
        </div>
      )}

      <div className="hh-panel overflow-hidden">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">Pending elevated access requests</h2>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {pending.map((request) => (
            <div key={request.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{request.patient_name || `Patient #${request.patient}`}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold uppercase text-amber-700">{request.status}</span>
                </div>
                <div className="mt-1 font-mono text-xs text-[var(--hh-purple)]">{request.patient_code}</div>
                <p className="mt-2 text-sm leading-6 text-[#66736d]">{request.reason || "No reason provided."}</p>
                <p className="mt-2 text-xs text-[#66736d]">Requested by {request.requested_by_name || "Reception"}</p>
              </div>
              <ApproveRejectForm requestId={request.id} onDone={(action) => handleDone(request.id, action)} />
            </div>
          ))}
          {pending.length === 0 && <div className="px-5 py-10 text-sm text-[#66736d]">No pending approvals.</div>}
        </div>
      </div>
    </>
  );
}
