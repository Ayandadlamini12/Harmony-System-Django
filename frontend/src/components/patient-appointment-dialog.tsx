"use client";

import { CalendarCheck } from "lucide-react";
import { useState } from "react";

import { AppointmentBooking } from "@/components/appointment-booking";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Patient } from "@/types/clinic";

export function PatientAppointmentDialog({
  patient,
  userRole,
  currentPractitionerId
}: {
  patient: Patient;
  userRole?: string;
  currentPractitionerId?: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <CalendarCheck size={16} />
          Book follow-up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="border-b border-[var(--hh-border)] px-5 py-4 pr-14">
          <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Book follow-up appointment</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#66736d]">
            Create an appointment for {patient.full_name_display}. It will be matched automatically when the patient checks in on the appointment date.
          </DialogDescription>
        </div>
        <div className="p-5">
          <AppointmentBooking
            patients={[patient]}
            initialPatientId={String(patient.id)}
            lockedPatient
            userRole={userRole}
            currentPractitionerId={currentPractitionerId}
            onBooked={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
