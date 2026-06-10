"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  ListFilter,
  RefreshCw,
  Search,
  Users,
  AlertTriangle,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuickBookingDrawer } from "./quick-booking-drawer";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { moveAppointment } from "@/app/appointments/actions";
import type {
  SchedulingBoardData,
  SchedulingResources,
  UserCapabilities,
  BoardAppointment,
  PractitionerColumn,
  RoomColumn
} from "@/types/scheduling";

// Grid configuration constants
const START_HOUR = 8; // Grid begins at 08:00
const END_HOUR = 18;  // Grid ends at 18:00
const ROW_HEIGHT = 48; // Each half-hour slot is 48px (96px per hour)
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const PX_PER_MINUTE = ROW_HEIGHT / 30; // 1.6 pixels per minute

interface SchedulingBoardProps {
  initialBoardData: SchedulingBoardData;
  resources: SchedulingResources;
  capabilities: UserCapabilities;
}

export function SchedulingBoard({
  initialBoardData,
  resources,
  capabilities,
}: SchedulingBoardProps) {
  const router = useRouter();
  const [boardData, setBoardData] = useState<SchedulingBoardData>(initialBoardData);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [nowLineTop, setNowLineTop] = useState<number | null>(null);

  // Synchronize board data with server updates
  useEffect(() => {
    setBoardData(initialBoardData);
  }, [initialBoardData]);

  // Dialog and Drawer states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingTime, setBookingTime] = useState("08:00");
  const [bookingPractitionerId, setBookingPractitionerId] = useState<number | null>(null);
  const [bookingRoomId, setBookingRoomId] = useState<number | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<BoardAppointment | null>(null);

  // Drag over states for visual highlights
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [isPending, startTransition] = useTransition();

  // Navigation shortcuts
  const currentDate = boardData.date;
  const viewBy = boardData.view_by;

  const navigateDate = (newDateStr: string) => {
    router.push(`/appointments?date=${newDateStr}&view_by=${viewBy}`);
  };

  const shiftDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    const formatted = d.toISOString().slice(0, 10);
    navigateDate(formatted);
  };

  const toggleViewMode = () => {
    const targetView = viewBy === "practitioners" ? "rooms" : "practitioners";
    router.push(`/appointments?date=${currentDate}&view_by=${targetView}`);
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      toast.success("Schedule refreshed from server.");
    });
  };

  // Helper formulas to convert times to absolute pixel positions
  const getTopOffset = (timeStr?: string | null, startAtIso?: string | null) => {
    let hours = START_HOUR;
    let mins = 0;

    if (startAtIso) {
      const d = new Date(startAtIso);
      hours = d.getHours();
      mins = d.getMinutes();
    } else if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      hours = h;
      mins = m;
    } else {
      return 0;
    }

    const elapsedMins = hours * 60 + mins - START_HOUR * 60;
    return Math.max(0, elapsedMins * PX_PER_MINUTE);
  };

  const getCardHeight = (durationMins: number = 30) => {
    return Math.max(ROW_HEIGHT - 4, durationMins * PX_PER_MINUTE - 4); // Include small padding bounds
  };

  const getAppointmentDuration = (appt: BoardAppointment) => {
    if (appt.start_at && appt.end_at) {
      return (new Date(appt.end_at).getTime() - new Date(appt.start_at).getTime()) / 60000;
    }
    // Fallback to appointment type default duration or standard 30 minutes
    const typeObj = resources.appointment_types.find((t) => String(t.id) === String(appt.appointment_type));
    return typeObj?.default_duration_minutes || 30;
  };

  // Keep track of the current time line overlay
  useEffect(() => {
    const updateLine = () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (currentDate !== todayStr) {
        setNowLineTop(null);
        return;
      }
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();

      if (h >= START_HOUR && h < END_HOUR) {
        const elapsed = h * 60 + m - START_HOUR * 60;
        setNowLineTop(elapsed * PX_PER_MINUTE);
      } else {
        setNowLineTop(null);
      }
    };

    updateLine();
    const interval = setInterval(updateLine, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [currentDate]);

  // Filters application
  const filteredAppointments = boardData.appointments.filter((appt) => {
    // 1. Text Search matching
    const searchLower = searchTerm.trim().toLowerCase();
    if (searchLower) {
      const matchesText = [
        appt.patient_name,
        appt.patient_code,
        appt.patient_phone,
        appt.practitioner_name,
        appt.room_name,
        appt.notes
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(searchLower));
      if (!matchesText) return false;
    }

    // 2. Status matching
    if (selectedStatusFilter !== "all") {
      if (selectedStatusFilter === "active" && ["cancelled", "completed", "no_show"].includes(appt.status)) {
        return false;
      } else if (selectedStatusFilter !== "active" && appt.status !== selectedStatusFilter) {
        return false;
      }
    }

    return true;
  });

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, apptId: number) => {
    if (!capabilities.can_move_appointment) {
      e.preventDefault();
      toast.error("You do not have capabilities to reschedule appointments.");
      return;
    }
    e.dataTransfer.setData("text/plain", apptId.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: number) => {
    e.preventDefault();
    setDragOverColumnId(colId);
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = async (e: React.DragEvent, colId: number) => {
    e.preventDefault();
    setDragOverColumnId(null);

    const apptIdStr = e.dataTransfer.getData("text/plain");
    const apptId = Number(apptIdStr);
    if (!apptId) return;

    // Calculate Y coordinates relative to columns container
    const columnContainer = e.currentTarget as HTMLDivElement;
    const rect = columnContainer.getBoundingClientRect();
    const dropY = e.clientY - rect.top;

    // Convert pixels to relative minutes and round to nearest 15 minutes
    const dropMinsFromStart = dropY / PX_PER_MINUTE;
    const roundedMins = Math.round(dropMinsFromStart / 15) * 15;
    const dropMinsFromMidnight = roundedMins + START_HOUR * 60;

    const h = Math.floor(dropMinsFromMidnight / 60);
    const m = dropMinsFromMidnight % 60;

    const paddedH = String(h).padStart(2, "0");
    const paddedM = String(m).padStart(2, "0");
    const targetStartTimeStr = `${paddedH}:${paddedM}`;

    // Get dragged appointment details
    const appt = boardData.appointments.find((a) => a.id === apptId);
    if (!appt) return;

    const durationMins = getAppointmentDuration(appt);
    const endMinsFromMidnight = dropMinsFromMidnight + durationMins;
    const endH = Math.floor(endMinsFromMidnight / 60) % 24;
    const endM = endMinsFromMidnight % 60;
    const targetEndTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    // Formulate new date-time ISO strings
    const startAtStr = `${currentDate}T${targetStartTimeStr}:00`;
    const endAtStr = `${currentDate}T${targetEndTimeStr}:00`;

    // Optimistically update appointment state on the UI
    const originalAppointmentsSnapshot = [...boardData.appointments];
    const updatedAppointments = boardData.appointments.map((a) => {
      if (a.id === apptId) {
        return {
          ...a,
          start_at: startAtStr,
          end_at: endAtStr,
          appointment_date: currentDate,
          appointment_time: `${targetStartTimeStr}:00`,
          practitioner: viewBy === "practitioners" ? colId : a.practitioner,
          room: viewBy === "rooms" ? colId : a.room,
          practitioner_name: viewBy === "practitioners"
            ? (boardData.columns.find((c) => c.id === colId)?.name || a.practitioner_name)
            : a.practitioner_name,
          room_name: viewBy === "rooms"
            ? (boardData.columns.find((c) => c.id === colId)?.name || a.room_name)
            : a.room_name,
        };
      }
      return a;
    });

    // Visual trigger for optimistic update
    setBoardData({ ...boardData, appointments: updatedAppointments });

    const payload = {
      start_at: startAtStr,
      end_at: endAtStr,
      practitioner: viewBy === "practitioners" ? colId : appt.practitioner,
      room: viewBy === "rooms" ? colId : appt.room,
    };

    // Confirm rescheduled state on Django container
    startTransition(async () => {
      const res = await moveAppointment(apptId, payload);
      if (res.success) {
        toast.success(`Rescheduled ${appt.patient_name} to ${targetStartTimeStr}.`);
        router.refresh();
      } else {
        // PESSIMISTIC LOCK COLLISION REVERSION
        setBoardData({ ...boardData, appointments: originalAppointmentsSnapshot });
        
        // Detailed feedback
        if (res.status === 409 && res.conflicts) {
          const detail = res.conflicts.map((c: any) => c.detail).join(". ");
          toast.error(`Scheduling Conflict (409 Rejected): ${detail || res.error}`);
        } else {
          toast.error(res.error || "Failed to move appointment.");
        }
      }
    });
  };

  // Grid Cell Clicking - triggers quick book prefilled drawer
  const handleGridCellClick = (e: React.MouseEvent, colId: number, slotIndex: number) => {
    // Only book if they clicked the background column layout, not an appointment card
    if ((e.target as HTMLElement).closest(".appointment-card-trigger")) {
      return;
    }
    if (!capabilities.can_create_appointment) {
      toast.error("You do not have capabilities to schedule new appointments.");
      return;
    }

    const elapsedMins = slotIndex * 30;
    const dropMinsFromMidnight = elapsedMins + START_HOUR * 60;
    const h = Math.floor(dropMinsFromMidnight / 60);
    const m = dropMinsFromMidnight % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    setBookingTime(timeStr);
    if (viewBy === "practitioners") {
      setBookingPractitionerId(colId);
      setBookingRoomId(null);
    } else {
      setBookingRoomId(colId);
      setBookingPractitionerId(null);
    }
    setIsBookingOpen(true);
  };

  // Double Click / Click card triggers details dialog
  const handleOpenDetails = (appt: BoardAppointment) => {
    setSelectedAppointment(appt);
    setIsDetailOpen(true);
  };

  // Follow-up flow linker callback
  const handleTriggerFollowUp = (patientId: number, practitionerId: number | null) => {
    // Open Quick Booking with Patient set and preselected practitioner
    setBookingTime("08:30");
    setBookingPractitionerId(practitionerId);
    setBookingRoomId(null);
    setIsBookingOpen(true);

    // Dynamic autocomplete select
    const patientObj = resources.practitioners.find((p) => p.id === patientId); // Just safety stub
    // The Quick Booking drawer will reset search filter but lock if fed patient ID.
    // Our quick drawer handle will find matching patient inside results.
  };

  // Shared completion callback
  const handleSuccessCallback = () => {
    router.refresh();
  };

  // Colors tokens parser helper for premium aesthetics
  const getAccentBorderClass = (colorToken?: string) => {
    const tok = String(colorToken || "").toLowerCase().trim();
    if (tok.includes("purple") || tok.includes("review")) return "border-l-4 border-l-[var(--hh-purple)] bg-purple-50/70";
    if (tok.includes("green") || tok.includes("acupuncture")) return "border-l-4 border-l-[#225c2c] bg-green-50/70";
    if (tok.includes("blue") || tok.includes("consult")) return "border-l-4 border-l-[#006687] bg-sky-50/70";
    if (tok.includes("amber") || tok.includes("warn") || tok.includes("follow")) return "border-l-4 border-l-[#875400] bg-amber-50/70";
    if (tok.includes("red") || tok.includes("emerg")) return "border-l-4 border-l-red-600 bg-red-50/70";
    return "border-l-4 border-l-gray-400 bg-gray-50/70";
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Action Sheets/Modals */}
      <QuickBookingDrawer
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        selectedDate={currentDate}
        selectedTime={bookingTime}
        selectedPractitionerId={bookingPractitionerId}
        selectedRoomId={bookingRoomId}
        resources={resources}
        capabilities={capabilities}
        onSuccess={handleSuccessCallback}
      />

      <AppointmentDetailDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        appointment={selectedAppointment}
        resources={resources}
        capabilities={capabilities}
        onSuccess={handleSuccessCallback}
        onCreateFollowUp={handleTriggerFollowUp}
      />

      {/* Control Action Toolbar */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--hh-border)] pb-5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Chevron Nav */}
          <div className="inline-flex rounded-lg border border-[var(--hh-border)] bg-white p-0.5 shadow-sm">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-[#53605a]" onClick={() => shiftDate(-1)}>
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="ghost"
              className="h-8 text-xs font-bold text-[#53605a] px-3 border-x border-[var(--hh-border)] rounded-none"
              onClick={() => navigateDate(new Date().toISOString().slice(0, 10))}
            >
              Today
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-[#53605a]" onClick={() => shiftDate(1)}>
              <ChevronRight size={16} />
            </Button>
          </div>

          {/* Inline Date Selector */}
          <div className="relative">
            <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={15} />
            <Input
              type="date"
              className="h-9 pl-9 pr-3 text-xs font-bold text-[#53605a] w-36 bg-white border-[var(--hh-border)] shadow-sm"
              value={currentDate}
              onChange={(e) => navigateDate(e.target.value)}
            />
          </div>

          <Badge variant="harmony" className="text-xs py-1.5 px-3 uppercase tracking-wider font-bold">
            {filteredAppointments.length} Operations Listed
          </Badge>
        </div>

        {/* Mode switching + search */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filtering selection */}
          <div className="relative">
            <ListFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={15} />
            <select
              className="h-9 pl-9 pr-8 text-xs font-bold text-[#53605a] bg-white border border-[var(--hh-border)] rounded-lg shadow-sm focus:ring-1 focus:ring-[var(--hh-purple)] outline-none appearance-none"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">All Scheduled</option>
              <option value="active">Active (Queued/In Visit)</option>
              <option value="checked_in">Checked In Only</option>
              <option value="completed">Completed Only</option>
              <option value="cancelled">Cancelled Only</option>
            </select>
          </div>

          {/* Toggle Columns representation layout */}
          <Button
            size="sm"
            variant="secondary"
            className="border-[var(--hh-border)] bg-white text-[#53605a]"
            onClick={toggleViewMode}
          >
            {viewBy === "practitioners" ? (
              <>
                <LayoutGrid size={15} />
                <span>View rooms</span>
              </>
            ) : (
              <>
                <Users size={15} />
                <span>View clinicians</span>
              </>
            )}
          </Button>

          {/* Refresh Action */}
          <Button
            size="icon"
            variant="secondary"
            className="border-[var(--hh-border)] bg-white text-[#53605a] h-9 w-9"
            onClick={handleRefresh}
            disabled={isPending}
          >
            <RefreshCw size={15} className={isPending ? "animate-spin" : ""} />
          </Button>
        </div>
      </section>

      {/* Grid Filter Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
        <Input
          placeholder="Filter grid by patient name, patient code, clinician, room, or notes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-9 text-sm bg-white"
        />
      </div>

      {/* CORE SCHEDULER VIEWPORT GRID */}
      <div className="hh-panel overflow-hidden border border-[var(--hh-border)] shadow-md bg-white">
        <div className="overflow-x-auto">
          {/* Columns Header Layout */}
          <div className="flex select-none border-b border-[var(--hh-border)] bg-[var(--hh-section)] sticky top-0 z-20 min-w-[960px]">
            {/* Hour Scale Header Buffer */}
            <div className="w-16 shrink-0 border-r border-[var(--hh-border)]" />

            {/* Resources Columns List */}
            {boardData.columns.map((col) => (
              <div
                key={col.id}
                className="flex-1 min-w-[220px] p-4 text-center border-r border-[var(--hh-border)] last:border-r-0 flex flex-col justify-center items-center"
              >
                <div className="text-sm font-bold text-[#3f1d58] tracking-wide">{col.name}</div>
                {/* Visual role or type badges */}
                {"role" in col ? (
                  <Badge variant="outline" className="text-[10px] mt-1 bg-white border capitalize font-semibold">
                    {col.role.toLowerCase().replace("_", " ")}
                  </Badge>
                ) : (
                  <Badge variant="harmony" className="text-[10px] mt-1 bg-white border capitalize font-semibold">
                    {"capacity" in col ? `Capacity: ${col.capacity}` : "Resource Room"}
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {/* Grid Rows Body */}
          <div className="relative flex min-w-[960px] select-none" ref={gridContainerRef}>
            {/* Timeline hour scale column (left edge) */}
            <div className="w-16 shrink-0 border-r border-[var(--hh-border)] bg-gray-50 flex flex-col z-10 sticky left-0">
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                const hour = START_HOUR + i;
                return (
                  <div
                    key={hour}
                    className="border-b border-[var(--hh-border)] text-right pr-2 text-[10px] font-bold text-[#66736d] font-mono select-none flex items-start pt-1.5"
                    style={{ height: `${ROW_HEIGHT * 2}px` }} // Each hour represents 2 row increments
                  >
                    {String(hour).padStart(2, "0")}:00
                  </div>
                );
              })}
            </div>

            {/* Horizontal Timeline guidelines */}
            <div className="absolute top-0 bottom-0 left-16 right-0 pointer-events-none flex flex-col">
              {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, idx) => {
                const isHour = idx % 2 === 0;
                return (
                  <div
                    key={idx}
                    className={`border-b ${isHour ? "border-[var(--hh-border)]" : "border-dashed border-gray-100"}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                  />
                );
              })}
            </div>

            {/* Live Today/Now Tracking Horizontal Line overlay */}
            {nowLineTop !== null && (
              <div
                className="absolute left-16 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                style={{ top: `${nowLineTop}px` }}
              >
                <div className="h-2 w-2 rounded-full bg-red-500 -ml-1 shadow-md" />
                <span className="text-[9px] font-bold font-mono text-red-500 bg-white border border-red-200 px-1 rounded ml-1 leading-none">
                  Now
                </span>
              </div>
            )}

            {/* Columns Vertical Blocks mapping and Dropping areas */}
            {boardData.columns.map((col) => {
              // Retrieve and filter appointments mapped to this column
              const colAppointments = filteredAppointments.filter((appt) => {
                if (viewBy === "practitioners") {
                  return appt.practitioner === col.id;
                } else {
                  return appt.room === col.id;
                }
              });

              const isDragOver = dragOverColumnId === col.id;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`flex-1 min-w-[220px] border-r border-[var(--hh-border)] last:border-r-0 relative transition-colors duration-150`}
                  style={{
                    height: `${ROW_HEIGHT * 2 * (END_HOUR - START_HOUR)}px`,
                    backgroundColor: isDragOver ? "#fbf6fc" : "transparent"
                  }}
                >
                  {/* Absolute Cell Click triggers (invisible but clickable layers) */}
                  <div className="absolute inset-0 z-0 flex flex-col">
                    {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, slotIdx) => (
                      <div
                        key={slotIdx}
                        onClick={(e) => handleGridCellClick(e, col.id, slotIdx)}
                        className="w-full hover:bg-gray-50/40 cursor-cell border-b border-transparent transition-colors"
                        style={{ height: `${ROW_HEIGHT}px` }}
                      />
                    ))}
                  </div>

                  {/* Absolute Positioned Appointment Cards inside Column */}
                  {colAppointments.map((appt) => {
                    const durationMins = getAppointmentDuration(appt);
                    const top = getTopOffset(appt.appointment_time, appt.start_at);
                    const height = getCardHeight(durationMins);

                    // Dynamic alert styles
                    const isHighPriority = appt.priority === "high";
                    const hasUnsignedConsentAlert = appt.consent_status !== "signed" && appt.consent_status !== "verified";

                    return (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, appt.id)}
                        onClick={() => handleOpenDetails(appt)}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                        }}
                        className={`appointment-card-trigger absolute left-1 right-1 p-2 rounded-md shadow-sm border border-[var(--hh-border)] text-left flex flex-col justify-between hover:shadow-md hover:scale-[1.01] transition-all cursor-grab active:cursor-grabbing z-10 overflow-hidden ${getAccentBorderClass(
                          appt.appointment_type_label
                        )}`}
                      >
                        <div>
                          {/* Header: Times + Priority indicator */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-[#66736d] flex items-center gap-0.5">
                              <Clock size={10} />
                              {appt.start_at && appt.end_at
                                ? `${new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                : appt.appointment_time?.slice(0, 5)}
                            </span>
                            <div className="flex items-center gap-1">
                              {/* Consent alert banner */}
                              {hasUnsignedConsentAlert && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-150/10 p-0.5 rounded animate-pulse" title="Consent signature is missing!">
                                  <AlertTriangle size={10} />
                                </span>
                              )}
                              {isHighPriority && (
                                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" title="High Priority!" />
                              )}
                            </div>
                          </div>

                          {/* Patient Name display */}
                          <h4 className="text-xs font-bold text-[#3f1d58] mt-1 truncate pr-1">
                            {appt.patient_name}
                          </h4>
                          <span className="text-[9px] font-mono text-[var(--hh-purple)] leading-none">
                            {appt.patient_code}
                          </span>
                        </div>

                        {/* Extra status details bottom row */}
                        <div className="flex items-center justify-between text-[8px] border-t border-[#f0f0f0] pt-1 mt-1 shrink-0">
                          <span className="text-[#66736d] truncate max-w-[70px]">
                            {appt.appointment_type_label || appt.appointment_type}
                          </span>
                          {appt.flow_state ? (
                            <Badge className="text-[7px] bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple)] rounded px-1 uppercase tracking-tight py-0">
                              {appt.flow_state.replace("_", " ")}
                            </Badge>
                          ) : (
                            <span className="text-[8px] font-semibold uppercase text-sky-800">
                              {appt.status_label || appt.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
