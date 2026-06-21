"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Calendar, Clock, Search, User, UserPlus, X, HelpCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createAppointment, getPractitionerAvailabilitiesForDate } from "@/app/appointments/actions";
import type { AppointmentType, ResourceRoom, SchedulingResources, UserCapabilities } from "@/types/scheduling";
import type { Patient, BookingPatient } from "@/types/clinic";

interface QuickBookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  selectedTime?: string; // HH:MM
  selectedPractitionerId?: number | null;
  selectedRoomId?: number | null;
  resources: SchedulingResources;
  capabilities: UserCapabilities;
  onSuccess: () => void;
  initialPatient?: BookingPatient | null;
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const parts = t.split(":").map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  return hours * 60 + minutes;
}

export function QuickBookingDrawer({
  isOpen,
  onClose,
  selectedDate,
  selectedTime = "08:00",
  selectedPractitionerId = null,
  selectedRoomId = null,
  resources,
  capabilities,
  onSuccess,
  initialPatient = null,
}: QuickBookingDrawerProps) {
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<BookingPatient | null>(null);

  // Form states
  const [apptTypeId, setApptTypeId] = useState<string>("");
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState(selectedTime);
  const [endTime, setEndTime] = useState("08:30");
  const [practitionerId, setPractitionerId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [priority, setPriority] = useState("medium");
  const [source, setSource] = useState("internal");
  const [notes, setNotes] = useState("");

  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);

  // Additional states for availability checks
  const [practitionerColumns, setPractitionerColumns] = useState<any[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityWarning, setAvailabilityWarning] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus patient search input on open
  useEffect(() => {
    if (isOpen && !selectedPatient) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedPatient]);

  // Synchronize form states on coordinates change
  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate);
      setStartTime(selectedTime);
      setPractitionerId(selectedPractitionerId ? String(selectedPractitionerId) : "");
      setRoomId(selectedRoomId ? String(selectedRoomId) : "");
      setServerError(null);
      setConflicts(null);
      setSelectedPatient(initialPatient);
      setPatientSearch("");
      setSearchResults([]);
      setNotes("");
      setPriority("medium");
      setSource("internal");

      // Auto-select first appointment type if available
      if (resources.appointment_types.length > 0) {
        setApptTypeId(String(resources.appointment_types[0].id));
      } else {
        setApptTypeId("");
      }
    }
  }, [isOpen, selectedDate, selectedTime, selectedPractitionerId, selectedRoomId, resources, initialPatient]);

  // Load practitioner availabilities on date change
  useEffect(() => {
    if (!isOpen || !date) return;

    let active = true;
    setIsCheckingAvailability(true);
    setAvailabilityWarning(null);

    getPractitionerAvailabilitiesForDate(date).then((res) => {
      if (!active) return;
      setIsCheckingAvailability(false);
      if (res.success && res.columns) {
        setPractitionerColumns(res.columns);
      } else {
        setPractitionerColumns([]);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, date]);

  // Perform availability checks
  useEffect(() => {
    if (!practitionerId || practitionerColumns.length === 0) {
      setAvailabilityWarning(null);
      return;
    }

    const [year, month, day] = date.split("-").map(Number);
    const jsDate = new Date(year, month - 1, day);
    const djangoWeekday = (jsDate.getDay() + 6) % 7; // Monday = 0, Sunday = 6

    const col = practitionerColumns.find((c: any) => c.id === Number(practitionerId));
    if (!col) {
      setAvailabilityWarning(null);
      return;
    }

    const availabilities = col.availabilities || [];
    const matchingAvailabilities = availabilities.filter((a: any) => a.weekday === djangoWeekday);

    if (matchingAvailabilities.length === 0) {
      setAvailabilityWarning("No configured availability for this clinician on this day");
      return;
    }

    const selectedStart = timeToMinutes(startTime);
    const selectedEnd = timeToMinutes(endTime);

    const fullyContained = matchingAvailabilities.some((avail: any) => {
      const availStart = timeToMinutes(avail.start_time);
      const availEnd = timeToMinutes(avail.end_time);
      return selectedStart >= availStart && selectedEnd <= availEnd;
    });

    if (!fullyContained) {
      const formatTimeStr = (t: string) => t.substring(0, 5); // "08:00:00" -> "08:00"
      const rangesStr = matchingAvailabilities
        .map((avail: any) => `${formatTimeStr(avail.start_time)}-${formatTimeStr(avail.end_time)}`)
        .join(", ");
      setAvailabilityWarning(`Selected time is outside configured availability: ${rangesStr}`);
    } else {
      setAvailabilityWarning(null);
    }
  }, [date, startTime, endTime, practitionerId, practitionerColumns]);

  // Handle auto-calculating end time based on selected appointment type duration
  useEffect(() => {
    const apptType = resources.appointment_types.find((t) => String(t.id) === apptTypeId);
    if (apptType && startTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + apptType.default_duration_minutes;

      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;

      const paddedHours = String(endHours).padStart(2, "0");
      const paddedMins = String(endMins).padStart(2, "0");
      setEndTime(`${paddedHours}:${paddedMins}`);
    }
  }, [apptTypeId, startTime, resources]);

  // Debounced patient search
  useEffect(() => {
    const text = patientSearch.trim();
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/patients/search?query=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        // Ignored
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(delayDebounce);
    };
  }, [patientSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Please select a patient.");
      return;
    }
    if (!apptTypeId) {
      toast.error("Please select an appointment type.");
      return;
    }

    setServerError(null);
    setConflicts(null);

    // Combine date and time to ISO format (assume local timezone)
    // Eswatini is CAT (GMT+2) but let's parse safely.
    // Standard ISO parse: "YYYY-MM-DDTHH:MM:00"
    const startAtStr = `${date}T${startTime}:00`;
    const endAtStr = `${date}T${endTime}:00`;

    const payload = {
      patient: selectedPatient.id,
      appointment_type: Number(apptTypeId),
      start_at: startAtStr,
      end_at: endAtStr,
      practitioner: practitionerId ? Number(practitionerId) : null,
      room: roomId ? Number(roomId) : null,
      priority,
      source,
      notes,
      status: "booked", // Default to booked
    };

    startTransition(async () => {
      const res = await createAppointment(payload);
      if (res.success) {
        toast.success("Appointment booked successfully.");
        onSuccess();
        onClose();
      } else {
        setServerError(res.error || "Failed to book appointment.");
        if (res.conflicts) {
          setConflicts(res.conflicts);
        }
      }
    });
  };

  const getFormattedDate = () => {
    if (!date) return "";
    try {
      const [year, month, day] = date.split("-").map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return date;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* Premium custom animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drawerSlideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.9;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes drawerSlideInBottom {
          from {
            transform: translateY(100%);
            opacity: 0.9;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-drawer-right {
          animation: drawerSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-drawer-bottom {
          animation: drawerSlideInBottom 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <SheetContent className="
        fixed z-50 bg-white/95 backdrop-blur-md overflow-y-auto outline-none border-[var(--hh-border)]
        max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:h-[85vh] max-sm:w-full max-sm:rounded-t-2xl max-sm:border-t max-sm:animate-drawer-bottom
        sm:inset-y-4 sm:right-4 sm:left-auto sm:h-[calc(100vh-32px)] sm:w-[min(calc(100vw-32px),540px)] sm:max-w-[540px] sm:rounded-2xl sm:border sm:shadow-2xl sm:animate-drawer-right
        p-6
      ">
        {/* Sticky Header with clear close button */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 pb-4 border-b border-[var(--hh-border)] flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <SheetTitle className="text-xl font-bold text-[#3f1d58] flex items-center gap-2">
              <UserPlus className="text-[var(--hh-purple)]" size={22} />
              Quick Book Appointment
            </SheetTitle>
            <p className="text-xs text-[#66736d] leading-relaxed">
              Securely allocate practitioners, resources, and time-slots. Conflicting requests will be safely rejected.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500 shrink-0"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>

        <div className="py-4">
          {/* Coordinates Banner */}
          <div className="mb-4 p-3.5 bg-slate-50 border border-slate-200/85 rounded-xl text-sm space-y-1.5 text-[#3f1d58] shadow-sm animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="font-semibold flex items-center gap-1.5">
                <Calendar size={15} className="text-[var(--hh-purple)]" />
                {getFormattedDate()}
              </span>
              <span className="font-semibold flex items-center gap-1.5">
                <Clock size={15} className="text-[var(--hh-purple)]" />
                {startTime} - {endTime}
              </span>
            </div>
            <div className="text-xs text-[#66736d] flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Clinician: <strong className="text-[#3f1d58]">{resources.practitioners.find(p => String(p.id) === practitionerId)?.name || "Unassigned / Walk-in pool"}</strong>
              </span>
              <span>
                Room: <strong className="text-[#3f1d58]">{resources.rooms.find(r => String(r.id) === roomId)?.name || "None allocated"}</strong>
              </span>
            </div>
          </div>

          {/* Missing Resources Warning */}
          {(resources.appointment_types.length === 0 || resources.practitioners.length === 0) && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-900 text-sm animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="grid gap-1">
                  <div className="font-bold text-xs">Missing Scheduling Resources</div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {resources.appointment_types.length === 0 && "- No appointment types are configured. "}
                    {resources.practitioners.length === 0 && "- No practitioners are registered. "}
                    Please configure resources in administrative settings before booking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Practitioner Availability Warning (Compact format) */}
          {practitionerId && availabilityWarning && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-amber-900 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-amber-600 shrink-0" size={14} />
                <span className="font-medium text-amber-800 leading-normal">{availabilityWarning}</span>
              </div>
            </div>
          )}

          {/* Conflict Warning Block */}
          {serverError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 text-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
                <div className="grid gap-1">
                  <div className="font-bold">{serverError}</div>
                  {conflicts && conflicts.length > 0 && (
                    <ul className="list-disc pl-5 mt-1 space-y-1 text-red-800 text-xs">
                      {conflicts.map((c: any, idx: number) => (
                        <li key={idx}>
                          {c.detail} {c.conflict_start && `(${new Date(c.conflict_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${new Date(c.conflict_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})`}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. Patient Selector / Autocomplete Search */}
          {!selectedPatient ? (
            <div className="space-y-3">
              <label className="grid gap-1.5">
                <span className="hh-label">Search Patient *</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={17} />
                  <Input
                    ref={searchInputRef}
                    className="pl-10 text-sm"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Enter phone, patient ID (e.g. HHPAT001), or full name"
                  />
                </div>
              </label>

              {searching && <div className="text-xs text-[#66736d] animate-pulse">Searching patients...</div>}

              {searchResults.length > 0 && (
                <div className="rounded-lg border border-[var(--hh-border)] bg-white shadow-sm max-h-56 overflow-y-auto divide-y divide-[var(--hh-border)]">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPatient(p)}
                      className="w-full text-left px-4 py-3 hover:bg-[#f7faf8] flex items-center justify-between text-sm transition"
                    >
                      <div>
                        <div className="font-bold text-[#3f1d58]">{p.full_name_display}</div>
                        <div className="text-xs text-[#66736d] mt-0.5 font-mono">{p.patient_code} · {p.primary_phone || "No phone"}</div>
                      </div>
                      <Badge variant="harmony" className="text-xs font-semibold">Select</Badge>
                    </button>
                  ))}
                </div>
              )}

              {patientSearch.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="text-sm text-center py-6 text-[#66736d] border border-dashed border-[var(--hh-border)] rounded-lg">
                  No matching patients found.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-[#e7d7ef] bg-[#f7f0fb] p-4 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.05em] text-[var(--hh-purple)]">Active Patient</span>
                <h3 className="text-lg font-bold text-[#3f1d58] mt-1">{selectedPatient.full_name_display}</h3>
                <div className="text-sm text-[#66736d] mt-0.5 flex flex-wrap gap-x-3 font-mono">
                  <span>{selectedPatient.patient_code}</span>
                  {selectedPatient.primary_phone && <span>· {selectedPatient.primary_phone}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="text-xs border-[#d1abe7] text-[var(--hh-purple)] bg-white hover:bg-[#fcf8fe]"
                onClick={() => setSelectedPatient(null)}
              >
                Change
              </Button>
            </div>
          )}

          {/* 2. Full Booking Form (Visible only when patient is selected) */}
          {selectedPatient && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5 animate-in fade-in duration-200">
              {/* Service Type Selector */}
              <div className="grid gap-1.5">
                <span className="hh-label">Appointment Type *</span>
                <Select
                  value={apptTypeId}
                  onChange={(e) => setApptTypeId(e.target.value)}
                  required
                >
                  <option value="">Select service type</option>
                  {resources.appointment_types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.default_duration_minutes} min)
                    </option>
                  ))}
                </Select>
              </div>

              {/* Date, Start Time, and End Time Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5 col-span-1">
                  <span className="hh-label">Date *</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d] pointer-events-none" size={15} />
                    <Input
                      type="date"
                      className="pl-9 pr-2 text-xs"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <span className="hh-label">Start Time *</span>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d] pointer-events-none" size={15} />
                    <Input
                      type="time"
                      className="pl-9 pr-2 text-xs"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <span className="hh-label">End Time *</span>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d] pointer-events-none" size={15} />
                    <Input
                      type="time"
                      className="pl-9 pr-2 text-xs"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Practitioners and Rooms Dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <span className="hh-label">Clinician (Practitioner)</span>
                  <Select
                    value={practitionerId}
                    onChange={(e) => setPractitionerId(e.target.value)}
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
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  >
                    <option value="">No room allocated</option>
                    {resources.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.location ? `(${r.location})` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Priority and Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <span className="hh-label">Priority *</span>
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    required
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <span className="hh-label">Booking Channel / Source *</span>
                  <Select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    required
                  >
                    <option value="internal">Internal Front Desk</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram Bot</option>
                    <option value="api">External API Sync</option>
                  </Select>
                </div>
              </div>

              {/* Booking Notes */}
              <div className="grid gap-1.5">
                <span className="hh-label">Operational / Booking Notes</span>
                <Textarea
                  placeholder="Reason for consultation, external contact links, special clinical prep notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="pt-4 border-t border-[var(--hh-border)] flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !capabilities.can_create_appointment}
                  className="bg-[var(--hh-purple)] hover:bg-[var(--hh-purple-dark)] text-white"
                >
                  {isPending ? "Validating schedule..." : "Lock & Book Slot"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
