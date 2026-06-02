"use client";

import { CalendarPlus, Clock, MessageSquare, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { FormSectionHeader } from "@/components/form-section-header";
import { LoadingButton } from "@/components/harmony-loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Patient } from "@/types/clinic";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AppointmentBooking({
  patients,
  initialPatientId,
  lockedPatient = false,
  onBooked
}: {
  patients: Patient[];
  initialPatientId?: string;
  lockedPatient?: boolean;
  onBooked?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [patientId, setPatientId] = useState(initialPatientId || "");
  const selectedPatient = useMemo(() => patients.find((patient) => String(patient.id) === patientId), [patientId, patients]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      patient: Number(form.get("patient")),
      appointment_type: form.get("appointment_type"),
      appointment_date: form.get("appointment_date"),
      appointment_time: form.get("appointment_time") || null,
      source: form.get("source"),
      notes: form.get("notes") || ""
    };
    if (!payload.patient || !payload.appointment_date) {
      toast.error("Choose a patient and appointment date");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.detail || "Appointment could not be booked");
        return;
      }
      toast.success("Appointment booked");
      onBooked?.();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="px-5 py-4">
        <FormSectionHeader
          icon={CalendarPlus}
          title="Book appointment"
          description="Appointments can be entered by reception, a clinician, or later by external channels like WhatsApp and Telegram."
          tone="appointment"
        />
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {lockedPatient ? (
            <input name="patient" type="hidden" value={patientId} />
          ) : (
            <label className="grid gap-1.5">
              <span className="hh-label">Patient</span>
              <Select name="patient" value={patientId} onChange={(event) => setPatientId(event.currentTarget.value)} required>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name_display} - {patient.patient_code}
                  </option>
                ))}
              </Select>
            </label>
          )}

          {selectedPatient && (
            <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-3 text-sm">
              <div className="flex items-center gap-2 font-bold">
                <UserRound size={16} />
                {selectedPatient.full_name_display}
              </div>
              <div className="mt-1 text-[#66736d]">{selectedPatient.primary_phone || "No phone"} · {selectedPatient.patient_code}</div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="hh-label">Type</span>
              <Select name="appointment_type" defaultValue="follow_up">
                <option value="new_consultation">New consultation</option>
                <option value="follow_up">Follow up</option>
                <option value="review">Review</option>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="hh-label">Source</span>
              <Select name="source" defaultValue="internal">
                <option value="internal">Internal</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="api">API</option>
              </Select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="hh-label">Date</span>
              <Input name="appointment_date" type="date" defaultValue={today()} required />
            </label>
            <label className="grid gap-1.5">
              <span className="hh-label">Time</span>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={17} />
                <Input className="pl-10" name="appointment_time" type="time" />
              </div>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="hh-label">Notes</span>
            <Textarea name="notes" placeholder="Reason, channel details, or preparation notes" rows={4} />
          </label>

          <LoadingButton loading={submitting} loadingText="Booking..." type="submit">
            <MessageSquare size={17} />
            Book appointment
          </LoadingButton>
        </form>
      </CardContent>
    </Card>
  );
}
