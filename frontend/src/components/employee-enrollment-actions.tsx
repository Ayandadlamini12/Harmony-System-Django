"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { showActionError } from "@/lib/action-error";

export function EmployeeEnrollmentActions({ requestId, status }: { requestId: number; status: string }) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  async function submit(action: "approve" | "reject") {
    const isApprove = action === "approve";
    if (isApprove) setApproving(true);
    else setRejecting(true);

    try {
      const response = await fetch(`/api/employee-enrollment-requests/${requestId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        showActionError({
          title: "Enrollment request update failed",
          message: data.error || `Could not ${action} request.`
        });
        return;
      }
      toast.success(isApprove ? "Employee onboarding approved" : "Employee onboarding rejected");
      router.refresh();
    } finally {
      if (isApprove) setApproving(false);
      else setRejecting(false);
    }
  }

  if (status !== "pending") {
    return <span className="text-xs font-bold uppercase text-[#66736d]">Reviewed</span>;
  }

  return (
    <div className="flex gap-2 lg:justify-end">
      <LoadingButton size="sm" loading={approving} loadingText="Approving..." onClick={() => submit("approve")}>
        <CheckCircle2 size={16} />
        Approve
      </LoadingButton>
      <LoadingButton variant="secondary" size="sm" loading={rejecting} loadingText="Rejecting..." onClick={() => submit("reject")}>
        <XCircle size={16} />
        Reject
      </LoadingButton>
    </div>
  );
}
