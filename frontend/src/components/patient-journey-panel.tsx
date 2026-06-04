"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";
import { ClinicalPanel } from "@/components/clinical-panel";
import { Button } from "@/components/ui/button";
import type { Patient } from "@/types/clinic";
import { showActionError } from "@/lib/action-error";

function ProcessMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--hh-border)] bg-white px-3 py-2 text-center shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-[#111827]">{value}</div>
    </div>
  );
}

export function PatientJourneyPanel({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const journey = patient.current_journey;

  async function handleCheckIn() {
    setIsCheckingIn(true);
    try {
      const res = await fetch("/api/check-ins/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient: patient.id,
          identifier: patient.patient_code,
          identifier_type: "patient_code",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to check in patient");
      }

      toast.success("Patient checked in and journey started");
      router.refresh();
    } catch (err) {
      showActionError({
        title: "Check-in Failed",
        message: "Could not start the patient journey. They may already have an active journey today.",
      });
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <ClinicalPanel title="Patient process today" icon={<ListChecks size={17} />}>
      {journey ? (
        <div className="grid gap-3">
          <div className="grid gap-2 grid-cols-3">
            <ProcessMetric label="Stage" value={journey.current_stage_label} />
            <ProcessMetric label="Flow" value={journey.flow_type_label} />
            <ProcessMetric label="Queue" value={journey.queue_number ? `#${journey.queue_number}` : journey.appointment_matched ? "Appointment" : "--"} />
          </div>
          <Button asChild variant="secondary" size="sm" className="w-full mt-1 text-xs">
            <Link href={`/patient-flow?identifier=${encodeURIComponent(patient.patient_code)}`}>Track full flow</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-2 text-center py-1 flex-row items-center justify-between sm:flex">
          <p className="text-sm text-[#66736d] leading-relaxed mb-2 sm:mb-0 text-left">No active establishment process has been started for this patient today.</p>
          <Button type="button" onClick={handleCheckIn} disabled={isCheckingIn} variant="secondary" size="sm" className="w-full sm:w-auto text-xs shrink-0 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200">
            {isCheckingIn ? "Checking in..." : "Check in patient"}
          </Button>
        </div>
      )}
    </ClinicalPanel>
  );
}
