"use client";

import { HeartPulse } from "lucide-react";
import { useState } from "react";

import { VitalsForm } from "@/components/vitals-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Patient } from "@/types/clinic";

export function PatientVitalsDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = useState(false);
  const visits = patient.visits || [];
  const latestVisit = visits[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <HeartPulse size={16} />
          Add vitals
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,980px)]">
        <div className="border-b border-[var(--hh-border)] px-5 py-4 pr-14">
          <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Add patient vitals</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#66736d]">
            Record vitals for {patient.full_name_display}. The vitals must be linked to a visit and will keep their own recorded date and time.
          </DialogDescription>
        </div>
        <div className="p-5">
          {visits.length === 0 ? (
            <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4 text-sm leading-6 text-[#66736d]">
              No visit is available for this patient yet. Create a visit note first, then record vitals against that visit.
            </div>
          ) : (
            <VitalsForm
              patients={[patient]}
              patientId={String(patient.id)}
              visits={visits}
              visitId={latestVisit ? String(latestVisit.id) : undefined}
              lockedPatient
              onSaved={() => setOpen(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
