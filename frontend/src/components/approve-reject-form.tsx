"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

export function ApproveRejectForm({ requestId, onDone }: { requestId: number; onDone: (action: "approved" | "rejected") => void }) {
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  async function handleApprove(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setApproveLoading(true);
    setApproveError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/access-requests/${requestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: Number(form.get("hours") || 4), review_note: String(form.get("review_note") || "").trim() }),
    });

    const data = await res.json();
    if (data.success) {
      onDone("approved");
    } else {
      setApproveError("Failed to approve.");
    }
    setApproveLoading(false);
  }

  async function handleReject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRejectLoading(true);
    setRejectError(null);

    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/access-requests/${requestId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ review_note: String(form.get("review_note") || "").trim() }),
    });

    const data = await res.json();
    if (data.success) {
      onDone("rejected");
    } else {
      setRejectError("Failed to reject.");
    }
    setRejectLoading(false);
  }

  return (
    <div className="grid gap-3">
      <form onSubmit={handleApprove} className="grid gap-2">
        <input className="hh-input" name="hours" type="number" min="1" max="24" defaultValue="4" aria-label="Approval hours" />
        <input className="hh-input" name="review_note" placeholder="Approval note" />
        {approveError && <div className="text-xs text-red-600">{approveError}</div>}
        <Button type="submit" disabled={approveLoading}>{approveLoading ? "Approving..." : "Approve"}</Button>
      </form>
      <form onSubmit={handleReject} className="grid gap-2">
        <input className="hh-input" name="review_note" placeholder="Rejection note" />
        {rejectError && <div className="text-xs text-red-600">{rejectError}</div>}
        <Button type="submit" variant="secondary" disabled={rejectLoading}>{rejectLoading ? "Rejecting..." : "Reject"}</Button>
      </form>
    </div>
  );
}
