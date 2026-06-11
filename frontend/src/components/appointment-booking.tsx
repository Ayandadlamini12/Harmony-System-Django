"use client";

import { CalendarPlus, Clock, MessageSquare, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FormSectionHeader } from "@/components/form-section-header";
import { LoadingButton } from "@/components/harmony-loading";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showActionError } from "@/lib/action-error";
import type { Patient } from "@/types/clinic";
import type { AppointmentType } from "@/types/scheduling";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const HOURLY_SLOTS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", 
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", 
  "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", 
  "24:00"
];

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || "");
  return null;
}

export function AppointmentBooking({
  patients,
  initialPatientId,
  lockedPatient = false,
  practitioners = [],
  appointmentTypes = [],
  userRole,
  currentPractitionerId,
  onBooked
}: {
  patients: Patient[];
  initialPatientId?: string;
  lockedPatient?: boolean;
  practitioners?: { id: number; name: string; role: string; }[];
  appointmentTypes?: AppointmentType[];
  userRole?: string;
  currentPractitionerId?: number | null;
  onBooked?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [patientId, setPatientId] = useState(initialPatientId || "");
  const selectedPatient = useMemo(() => patients.find((patient) => String(patient.id) === patientId), [patientId, patients]);

  const [localPractitioners, setLocalPractitioners] = useState(practitioners);
  const [localAppointmentTypes, setLocalAppointmentTypes] = useState(appointmentTypes);

  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");

  const startOptions = HOURLY_SLOTS.slice(0, -1); // 00:00 to 23:00
  const endOptions = HOURLY_SLOTS.slice(1);      // 01:00 to 24:00

  function handleStartTimeChange(time: string) {
    setStartTime(time);
    const startIdx = HOURLY_SLOTS.indexOf(time);
    const endIdx = HOURLY_SLOTS.indexOf(endTime);
    if (startIdx !== -1 && (endIdx === -1 || endIdx <= startIdx)) {
      setEndTime(HOURLY_SLOTS[startIdx + 1]);
    }
  }

  function handleEndTimeChange(time: string) {
    setEndTime(time);
    const endIdx = HOURLY_SLOTS.indexOf(time);
    const startIdx = HOURLY_SLOTS.indexOf(startTime);
    if (endIdx !== -1 && (startIdx === -1 || startIdx >= endIdx)) {
      setStartTime(HOURLY_SLOTS[endIdx - 1]);
    }
  }

  const activeRole = useMemo(() => {
    return (userRole || getCookie("harmony_role") || "receptionist").toLowerCase();
  }, [userRole]);

  const activePractitionerId = useMemo(() => {
    if (currentPractitionerId) return currentPractitionerId;
    const nameCookie = getCookie("harmony_name");
    const usernameCookie = getCookie("harmony_username");
    if (!nameCookie && !usernameCookie) return null;

    const match = localPractitioners.find((p) => {
      const pName = p.name.toLowerCase();
      return (
        (nameCookie && pName.includes(nameCookie.toLowerCase())) ||
        (usernameCookie && pName.includes(usernameCookie.toLowerCase()))
      );
    });
    return match ? match.id : null;
  }, [currentPractitionerId, localPractitioners]);

  const filteredPractitioners = useMemo(() => {
    if (activeRole === "receptionist") {
      // Receptionist: only clinicians
      return localPractitioners.filter((p) => p.role.toLowerCase() === "clinician");
    } else if (activeRole === "clinician") {
      // Clinician: other clinicians and receptionists
      return localPractitioners.filter((p) => {
        const isSelf = activePractitionerId && p.id === activePractitionerId;
        return !isSelf && (p.role.toLowerCase() === "clinician" || p.role.toLowerCase() === "receptionist");
      });
    }
    // Admin and other roles can see all practitioners
    return localPractitioners;
  }, [localPractitioners, activeRole, activePractitionerId]);

  useEffect(() => {
    if (practitioners.length > 0) {
      setLocalPractitioners(practitioners);
    }
  }, [practitioners]);

  useEffect(() => {
    if (appointmentTypes.length > 0) {
      setLocalAppointmentTypes(appointmentTypes);
    }
  }, [appointmentTypes]);

  useEffect(() => {
    if (practitioners.length === 0 || appointmentTypes.length === 0) {
      let active = true;
      async function loadResources() {
        try {
          const response = await fetch("/api/scheduling/resources");
          if (response.ok && active) {
            const data = await response.json();
            if (data.practitioners && practitioners.length === 0) {
              setLocalPractitioners(data.practitioners);
            }
            if (data.appointment_types && appointmentTypes.length === 0) {
              setLocalAppointmentTypes(data.appointment_types);
            }
          }
        } catch (err) {
          console.error("Failed to load scheduling resources for booking", err);
        }
      }
      loadResources();
      return () => {
        active = false;
      };
    }
  }, [practitioners, appointmentTypes]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const appointment_date = form.get("appointment_date");
    const practitionerVal = form.get("practitioner");

    if (!patientId || !appointment_date || !practitionerVal) {
      showActionError({
        title: "Appointment details missing",
        message: "Choose a patient, clinician, and appointment date."
      });
      return;
    }

    const startAtStr = `${appointment_date}T${startTime}:00`;
    const endAtStr = `${appointment_date}T${endTime === "24:00" ? "23:59:59" : endTime + ":00"}`;

    const payload = {
      patient: Number(patientId),
      appointment_type: Number(form.get("appointment_type")),
      start_at: startAtStr,
      end_at: endAtStr,
      practitioner: Number(practitionerVal),
      priority: "medium",
      source: form.get("source"),
      notes: form.get("notes") || "",
      status: "booked"
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/appointments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        showActionError({
          title: "Appointment could not be booked",
          message: data.detail || "Appointment could not be booked."
        });
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
              <Select name="appointment_type" required>
                {localAppointmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
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
              <span className="hh-label">Clinician (Practitioner)</span>
              <Select name="practitioner" required>
                <option value="">Select clinician</option>
                {filteredPractitioners.map((prac) => (
                  <option key={prac.id} value={prac.id}>
                    {prac.name} ({prac.role.toLowerCase().replace("_", " ")})
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="hh-label">Start Time</span>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={17} />
                <Select
                  className="pl-10"
                  name="start_time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                >
                  {startOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
              </div>
            </label>
            <label className="grid gap-1.5">
              <span className="hh-label">End Time</span>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={17} />
                <Select
                  className="pl-10"
                  name="end_time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                >
                  {endOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
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
