"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Ban,
  ClipboardPlus,
  RefreshCw,
  UserCheck,
  MapPin,
  Tag,
  Share2
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { checkInAppointment, cancelAppointment, moveAppointment } from "@/app/appointments/actions";
import type { BoardAppointment, SchedulingResources, UserCapabilities } from "@/types/scheduling";

interface AppointmentDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: BoardAppointment | null;
  resources: SchedulingResources;
  capabilities: UserCapabilities;
  onSuccess: () => void;
  onCreateFollowUp?: (patientId: number, practitionerId: number | null) => void;
}

export function AppointmentDetailDialog({
  isOpen,
  onClose,
  appointment,
  resources,
  capabilities,
  onSuccess,
  onCreateFollowUp,
}: AppointmentDetailDialogProps) {
  const [isPending, startTransition] = useTransition();

  // Cancel action states
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const startsAt = appointment?.start_at ? new Date(appointment.start_at).getTime() : null;
  const isWithin15Mins = startsAt ? (startsAt - Date.now()) <= 15 * 60 * 1000 : false;

  // Edit action states
  const [isEditing, setIsEditMode] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editPractitionerId, setEditPractitionerId] = useState("");
  const [editRoomId, setEditRoomId] = useState("");

  const [serverError, setServerError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);

  // Sync state on load
  useEffect(() => {
    if (isOpen && appointment) {
      setIsCancelling(false);
      setCancelReason("");
      setIsEditMode(false);
      setServerError(null);
      setConflicts(null);

      // Populate edit states from appointment
      setEditDate(appointment.appointment_date || "");
      if (appointment.start_at) {
        setEditStartTime(new Date(appointment.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
      } else {
        setEditStartTime(appointment.appointment_time?.slice(0, 5) || "08:00");
      }
      if (appointment.end_at) {
        setEditEndTime(new Date(appointment.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
      } else {
        setEditEndTime("08:30");
      }
      setEditPractitionerId(appointment.practitioner ? String(appointment.practitioner) : "");
      setEditRoomId(appointment.room ? String(appointment.room) : "");
    }
  }, [isOpen, appointment]);

  if (!appointment) return null;

  const handleCheckIn = () => {
    setServerError(null);
    startTransition(async () => {
      const res = await checkInAppointment(appointment.id);
      if (res.success) {
        toast.success("Patient successfully checked in! Visit flow started.");
        onSuccess();
        onClose();
      } else {
        setServerError(res.error || "Failed to complete check-in.");
      }
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const res = await cancelAppointment(appointment.id, cancelReason);
      if (res.success) {
        toast.success("Appointment has been cancelled.");
        onSuccess();
        onClose();
      } else {
        setServerError(res.error || "Failed to cancel appointment.");
      }
    });
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setConflicts(null);

    const startAtStr = `${editDate}T${editStartTime}:00`;
    const endAtStr = `${editDate}T${editEndTime}:00`;

    const payload = {
      start_at: startAtStr,
      end_at: endAtStr,
      practitioner: editPractitionerId ? Number(editPractitionerId) : null,
      room: editRoomId ? Number(editRoomId) : null,
    };

    startTransition(async () => {
      const res = await moveAppointment(appointment.id, payload);
      if (res.success) {
        toast.success("Appointment rescheduled successfully.");
        onSuccess();
        setIsEditMode(false);
        onClose();
      } else {
        setServerError(res.error || "Failed to reschedule appointment.");
        if (res.conflicts) {
          setConflicts(res.conflicts);
        }
      }
    });
  };

  // Status mapping colors
  const statusColors: Record<string, string> = {
    draft: "border-[#e0e0e0] bg-[#f5f5f5] text-gray-700",
    booked: "border-[#bfe3eb] bg-[#f0f9fb] text-sky-800",
    confirmed: "border-[#cce4d1] bg-[#f2fbf4] text-green-800",
    checked_in: "border-[#e5ccee] bg-[#faf2fc] text-[var(--hh-purple-dark)]",
    completed: "border-gray-200 bg-gray-50 text-gray-500",
    cancelled: "border-red-150 bg-red-50 text-red-700",
    no_show: "border-orange-200 bg-orange-50 text-orange-700",
  };

  // Priority colors
  const priorityColors: Record<string, string> = {
    low: "border-blue-100 bg-blue-50 text-blue-800",
    medium: "border-amber-100 bg-amber-50 text-amber-800",
    high: "border-red-100 bg-red-50 text-red-800",
  };

  const formattedDate = appointment.appointment_date
    ? new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(new Date(appointment.appointment_date))
    : "--";

  const apptTimeText = appointment.start_at && appointment.end_at
    ? `${new Date(appointment.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : appointment.appointment_time?.slice(0, 5) || "Unset time";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(100vw,540px)] sm:max-w-[540px] overflow-y-auto bg-white/95 backdrop-blur-md border-l border-[var(--hh-border)]">
        <div className="pb-4 border-b border-[var(--hh-border)] space-y-1.5">
          <SheetTitle className="text-xl font-bold text-[#3f1d58] flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="text-[var(--hh-purple)]" size={22} />
              Appointment Record Detail
            </span>
            <Badge className={`${statusColors[appointment.status] || "bg-gray-150 text-gray-800"} text-xs border uppercase tracking-wider px-2.5 py-0.5 rounded-full`}>
              {appointment.status_label || appointment.status}
            </Badge>
          </SheetTitle>
          <p className="text-sm text-[#66736d]">
            Clinic operations ID: <span className="font-mono text-xs">{appointment.id}</span>
          </p>
        </div>

        <div className="py-5">
          {/* Conflict or Error Notification */}
          {serverError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <div className="grid gap-1">
                  <div className="font-bold">{serverError}</div>
                  {conflicts && conflicts.length > 0 && (
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-red-800 text-xs">
                      {conflicts.map((c: any, idx: number) => (
                        <li key={idx}>{c.detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Patient Quick Info Card */}
          <div className="mb-6 rounded-lg border border-[#e7d7ef] bg-[#fcf9fe] p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--hh-purple)]">Patient Overview</span>
                <h3 className="text-lg font-bold text-[#3f1d58] mt-1">{appointment.patient_name}</h3>
                <div className="text-xs text-[#66736d] mt-0.5 flex flex-wrap gap-x-2 font-mono">
                  <span>{appointment.patient_code}</span>
                  {appointment.patient_phone && <span>· {appointment.patient_phone}</span>}
                </div>
              </div>
              {appointment.consent_status && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#66736d] block">Consent Form</span>
                  {appointment.consent_completed ? (
                    <Badge variant="success" className="text-[10px] uppercase font-semibold mt-1">Signed</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] uppercase font-semibold mt-1 animate-pulse text-red-700 border-red-200 bg-red-50">Unsigned</Badge>
                  )}
                </div>
              )}
            </div>

            {/* If flow state is available (active Patient Journey stage) */}
            {appointment.flow_state && (
              <div className="mt-4 pt-3 border-t border-[#f0e7f3] flex items-center justify-between">
                <span className="text-xs text-[#53605a] flex items-center gap-1.5 font-bold">
                  <UserCheck size={14} className="text-[#225c2c]" />
                  Active Flow Stage:
                </span>
                <Badge variant="harmony" className="text-xs uppercase px-2 py-0.5">{appointment.flow_state.replace("_", " ")}</Badge>
              </div>
            )}
          </div>

          {/* VIEW MODE DETAILS */}
          {!isEditing && !isCancelling && (
            <div className="space-y-4">
              {/* Timing */}
              <div className="flex gap-3 text-sm border-b border-[var(--hh-border)] pb-3">
                <div className="p-2 bg-[#f0f9fb] text-sky-800 rounded-lg shrink-0 h-10 w-10 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="font-bold text-[#3f1d58]">{formattedDate}</div>
                  <div className="text-[#66736d] flex items-center gap-1 mt-0.5 font-mono text-xs">
                    <Clock size={12} />
                    {apptTimeText}
                  </div>
                </div>
              </div>

              {/* Grid Context: practitioner + room */}
              <div className="grid grid-cols-2 gap-4 text-sm border-b border-[var(--hh-border)] pb-3">
                <div className="flex gap-2">
                  <div className="p-2 bg-[#f7faf8] text-[#53605a] rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                    <User size={16} />
                  </div>
                  <div>
                    <div className="text-xs text-[#66736d]">Practitioner</div>
                    <div className="font-bold text-[#3f1d58]">{appointment.practitioner_name || "Unassigned"}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="p-2 bg-[#f7faf8] text-[#53605a] rounded-lg shrink-0 h-9 w-9 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <div className="text-xs text-[#66736d]">Allocated Resource</div>
                    <div className="font-bold text-[#3f1d58]">{appointment.room_name || "No Room Allocated"}</div>
                  </div>
                </div>
              </div>

              {/* Categorization: type + priority + source */}
              <div className="grid grid-cols-3 gap-2 border-b border-[var(--hh-border)] pb-3 text-xs">
                <div>
                  <div className="text-[#66736d]">Service Type</div>
                  <div className="font-bold text-[#3f1d58] mt-1 flex items-center gap-1">
                    <Tag size={12} className="text-[var(--hh-purple)]" />
                    {appointment.appointment_type_label || appointment.appointment_type}
                  </div>
                </div>
                <div>
                  <div className="text-[#66736d]">Priority</div>
                  <div className="mt-1">
                    <Badge className={`${(appointment.priority && priorityColors[appointment.priority]) || "bg-gray-100 text-gray-800"} text-[10px] rounded-full px-2 py-0`}>
                      {appointment.priority_label || appointment.priority}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-[#66736d]">Channel / Source</div>
                  <div className="font-bold text-[#3f1d58] mt-1 flex items-center gap-1">
                    <Share2 size={12} className="text-[#53605a]" />
                    {appointment.source_label || appointment.source}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className="text-xs text-[#66736d]">Clinical & Booking Notes</div>
                <div className="mt-1.5 p-3 rounded-lg border border-[var(--hh-border)] bg-gray-50 text-sm leading-relaxed text-[#3f1d58] whitespace-pre-wrap">
                  {appointment.notes || <span className="text-gray-400 italic">No notes captured.</span>}
                </div>
              </div>

              {/* Audit Details */}
              <div className="mt-4 p-3 rounded-lg bg-gray-50 text-[10px] text-[#66736d] space-y-1 font-mono">
                <div>Created by: {appointment.created_by_name || "System Autocomplete"} · {appointment.created_at ? new Date(appointment.created_at).toLocaleString() : "--"}</div>
                {appointment.updated_by_name && (
                  <div>Last updated: {appointment.updated_by_name} · {appointment.updated_at ? new Date(appointment.updated_at).toLocaleString() : "--"}</div>
                )}
                {appointment.cancel_reason && (
                  <div className="mt-2 text-red-700 border-t border-red-100 pt-1">
                    <strong>Cancellation Reason:</strong> {appointment.cancel_reason}
                  </div>
                )}
              </div>

              {/* MAIN OPERATION COMMAND FOOTER */}
              <div className="pt-6 border-t border-[var(--hh-border)] flex flex-wrap justify-between gap-3">
                <div className="flex gap-2">
                  {/* Cancel Trigger */}
                  {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending || !capabilities.can_cancel_appointment}
                      className="text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
                      onClick={() => setIsCancelling(true)}
                    >
                      <Ban size={15} />
                      Cancel Appt
                    </Button>
                  )}

                  {/* Edit/Reschedule Trigger */}
                  {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending || !capabilities.can_move_appointment}
                      onClick={() => setIsEditMode(true)}
                    >
                      <RefreshCw size={15} />
                      Reschedule
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Follow-Up Trigger */}
                  {onCreateFollowUp && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isPending || !capabilities.can_create_follow_up}
                      onClick={() => {
                        onCreateFollowUp(appointment.patient, appointment.practitioner ?? null);
                        onClose();
                      }}
                    >
                      Create Follow-Up
                    </Button>
                  )}

                  {/* Arrived Check-In Flow Trigger */}
                  {appointment.status !== "checked_in" && appointment.status !== "completed" && appointment.status !== "cancelled" && (
                    <Button
                      size="sm"
                      disabled={isPending || !capabilities.can_check_in}
                      className="bg-[var(--hh-purple)] hover:bg-[var(--hh-purple-dark)] text-white"
                      onClick={handleCheckIn}
                    >
                      <ClipboardPlus size={15} />
                      Check In (Arrived)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EDIT/RESCHEDULE FORM */}
          {isEditing && (
            <form onSubmit={handleRescheduleSubmit} className="space-y-4 animate-in slide-in-from-right duration-200">
              <h3 className="font-bold text-[#3f1d58] border-b border-[var(--hh-border)] pb-2 flex items-center gap-1.5 text-base">
                <RefreshCw size={16} className="text-[var(--hh-purple)] animate-spin-slow" />
                Reschedule Operational Slot
              </h3>

              <div className="grid gap-1.5">
                <span className="hh-label">Date *</span>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <span className="hh-label">Start Time *</span>
                  <Input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-1.5">
                  <span className="hh-label">End Time *</span>
                  <Input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <span className="hh-label">Clinician (Practitioner)</span>
                <Select
                  value={editPractitionerId}
                  onChange={(e) => setEditPractitionerId(e.target.value)}
                >
                  <option value="">Unassigned / Walk-in Pool</option>
                  {resources.practitioners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid gap-1.5">
                <span className="hh-label">Resource Room</span>
                <Select
                  value={editRoomId}
                  onChange={(e) => setEditRoomId(e.target.value)}
                >
                  <option value="">No room allocated</option>
                  {resources.rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.location ? `(${r.location})` : ""}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="pt-4 border-t border-[var(--hh-border)] flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsEditMode(false)} disabled={isPending}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-[var(--hh-purple)] hover:bg-[var(--hh-purple-dark)] text-white"
                >
                  {isPending ? "Re-checking conflicts..." : "Confirm Reschedule"}
                </Button>
              </div>
            </form>
          )}

          {/* CANCELLATION FORM */}
          {isCancelling && (
            <form onSubmit={handleCancelSubmit} className="space-y-4 animate-in slide-in-from-right duration-200">
              <h3 className="font-bold text-red-800 border-b border-red-100 pb-2 flex items-center gap-1.5 text-base">
                <Ban size={16} className="text-red-600" />
                Cancel Appointment Slot
              </h3>

              {isWithin15Mins && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 text-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                    <div className="grid gap-1">
                      <div className="font-bold">Cancellation Lockout Active</div>
                      <p className="text-xs text-red-800 leading-relaxed">
                        This appointment is inside the 15-minute cancellation lockout. It cannot be cancelled from the standard workflow.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-1.5">
                <span className="hh-label text-red-900">Reason for Cancellation *</span>
                <Textarea
                  placeholder="Patient requested rescheduled channel, practitioner sick, room maintenance..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="pt-4 border-t border-[var(--hh-border)] flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsCancelling(false)} disabled={isPending}>
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || isWithin15Mins}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isPending ? "Cancelling..." : "Confirm Cancellation"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
