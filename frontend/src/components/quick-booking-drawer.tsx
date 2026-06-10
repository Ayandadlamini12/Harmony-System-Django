"use client";

import { useEffect, useState, useTransition } from "react";
import { Calendar, Clock, Search, User, UserPlus, X, HelpCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createAppointment } from "@/app/appointments/actions";
import type { AppointmentType, ResourceRoom, SchedulingResources, UserCapabilities } from "@/types/scheduling";
import type { Patient } from "@/types/clinic";

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
}: QuickBookingDrawerProps) {
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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

  // Synchronize form states on coordinates change
  useEffect(() => {
    if (isOpen) {
      setDate(selectedDate);
      setStartTime(selectedTime);
      setPractitionerId(selectedPractitionerId ? String(selectedPractitionerId) : "");
      setRoomId(selectedRoomId ? String(selectedRoomId) : "");
      setServerError(null);
      setConflicts(null);
      setSelectedPatient(null);
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
  }, [isOpen, selectedDate, selectedTime, selectedPractitionerId, selectedRoomId, resources]);

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

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(100vw,540px)] sm:max-w-[540px] overflow-y-auto bg-white/95 backdrop-blur-md border-l border-[var(--hh-border)]">
        <div className="pb-4 border-b border-[var(--hh-border)] space-y-1.5">
          <SheetTitle className="text-xl font-bold text-[#3f1d58] flex items-center gap-2">
            <UserPlus className="text-[var(--hh-purple)]" size={22} />
            Quick Book Appointment
          </SheetTitle>
          <p className="text-sm text-[#66736d]">
            Securely allocate practitioners, resources, and time-slots. Conflicting requests will be safely rejected.
          </p>
        </div>

        <div className="py-6">
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
                    className="pl-10 text-sm"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Enter phone, patient ID (e.g. HHPAT001), or full name"
                    autoFocus
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
