"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  Printer,
  CalendarDays,
  Plus,
  ShieldCheck,
  UserCheck,
  Activity,
  CheckCircle,
  FileText,
  UserRound,
  Trash2,
  XCircle,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { QuickBookingDrawer } from "./quick-booking-drawer";
import { AppointmentDetailDialog } from "./appointment-detail-dialog";
import { moveAppointment, getAppointmentsRangeAction } from "@/app/appointments/actions";
import type { SessionUser } from "@/lib/session";
import type { Patient, BookingPatient } from "@/types/clinic";
import type {
  SchedulingBoardData,
  SchedulingResources,
  UserCapabilities,
  BoardAppointment,
  PractitionerColumn,
  RoomColumn
} from "@/types/scheduling";

// Local Date Math Helpers (Monday-start week)
function getLocalDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekRangeAndDays(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayOfWeek = date.getDay();
  // Monday is day index 1.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  
  const startAt = getLocalDateString(days[0]);
  const endAt = getLocalDateString(days[6]);
  return { startAt, endAt, days };
}

function getMonthRangeAndDays(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  const dayOfWeek = firstOfMonth.getDay();
  // Monday is day index 1.
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const startGridDate = new Date(firstOfMonth);
  startGridDate.setDate(firstOfMonth.getDate() + diffToMonday);
  
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(startGridDate);
    day.setDate(startGridDate.getDate() + i);
    days.push(day);
  }
  
  const startAt = getLocalDateString(days[0]);
  const endAt = getLocalDateString(days[41]);
  return { startAt, endAt, days };
}

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
  session: SessionUser;
}

export function SchedulingBoard({
  initialBoardData,
  resources,
  capabilities,
  session,
}: SchedulingBoardProps) {
  const router = useRouter();
  const [boardData, setBoardData] = useState<SchedulingBoardData>(initialBoardData);
  const currentDate = boardData.date;
  const viewBy = boardData.view_by;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [nowLineTop, setNowLineTop] = useState<number | null>(null);

  // Calendar views and range states
  const [currentView, setCurrentView] = useState<"day" | "week" | "month">("day");
  const [rangeAppointments, setRangeAppointments] = useState<BoardAppointment[]>([]);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [bookingDate, setBookingDate] = useState<string>(initialBoardData.date);
  const [rangeRefreshKey, setRangeRefreshKey] = useState<number>(0);

  // Tabs layout navigation
  const [activeTab, setActiveTab] = useState<"schedule" | "print">("schedule");

  // Administrator testing sandbox roles
  const [actingRole, setActingRole] = useState<string>(session.role);
  const [actingClinicianId, setActingClinicianId] = useState<number | null>(() => {
    // Default to the logged-in clinician matching their name or username
    const clinicians = resources.practitioners.filter((p) => p.role.toLowerCase() === "clinician");
    const match = clinicians.find(
      (p) =>
        p.name.toLowerCase().includes(session.name.toLowerCase()) ||
        p.name.toLowerCase().includes(session.username.toLowerCase())
    );
    return match ? match.id : (clinicians[0]?.id || null);
  });

  // Selected employee calendar dropdown (null is "All Clinicians")
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<number | null>(null);

  // Synchronize board data with server updates
  useEffect(() => {
    setBoardData(initialBoardData);
  }, [initialBoardData]);

  // Sync booking date on currentDate updates
  useEffect(() => {
    setBookingDate(initialBoardData.date);
  }, [initialBoardData.date]);

  // Load appointments range on-the-fly for week/month views
  useEffect(() => {
    if (currentView === "day") {
      setRangeAppointments([]);
      return;
    }

    let isCurrent = true;
    const loadRange = async () => {
      setIsLoadingRange(true);
      let startStr = "";
      let endStr = "";
      if (currentView === "week") {
        const week = getWeekRangeAndDays(initialBoardData.date);
        startStr = week.startAt;
        endStr = week.endAt;
      } else {
        const month = getMonthRangeAndDays(initialBoardData.date);
        startStr = month.startAt;
        endStr = month.endAt;
      }

      const startIso = `${startStr}T00:00:00`;
      const endIso = `${endStr}T23:59:59`;

      const filters: { practitioner?: number | null; room?: number | null } = {};
      if (viewBy === "practitioners") {
        filters.practitioner = actingRole === "clinician" ? actingClinicianId : selectedPractitionerId;
      }

      const res = await getAppointmentsRangeAction(startIso, endIso, filters);
      if (isCurrent) {
        if (res.success) {
          setRangeAppointments(res.appointments || []);
        } else {
          toast.error(res.error || "Failed to load range schedules.");
          setRangeAppointments([]);
        }
        setIsLoadingRange(false);
      }
    };

    loadRange();

    return () => {
      isCurrent = false;
    };
  }, [currentView, initialBoardData.date, selectedPractitionerId, actingClinicianId, viewBy, actingRole, rangeRefreshKey]);

  // Dialog and Drawer states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingTime, setBookingTime] = useState("08:00");
  const [bookingPractitionerId, setBookingPractitionerId] = useState<number | null>(null);
  const [bookingRoomId, setBookingRoomId] = useState<number | null>(null);
  const [bookingPatient, setBookingPatient] = useState<BookingPatient | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<BoardAppointment | null>(null);

  // Drag over states for visual highlights
  const [dragOverColumnId, setDragOverColumnId] = useState<number | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [isPending, startTransition] = useTransition();

  // Sync acting clinicians when session loads
  useEffect(() => {
    setActingRole(session.role);
    if (session.role === "clinician") {
      const clinicians = resources.practitioners.filter((p) => p.role.toLowerCase() === "clinician");
      const match = clinicians.find(
        (p) =>
          p.name.toLowerCase().includes(session.name.toLowerCase()) ||
          p.name.toLowerCase().includes(session.username.toLowerCase())
      );
      if (match) setActingClinicianId(match.id);
    }
  }, [session, resources.practitioners]);

  const weekDays = useMemo(() => {
    return getWeekRangeAndDays(currentDate).days;
  }, [currentDate]);

  const monthDays = useMemo(() => {
    return getMonthRangeAndDays(currentDate).days;
  }, [currentDate]);

  const appointmentsToFilter = useMemo(() => {
    return currentView === "day" ? boardData.appointments : rangeAppointments;
  }, [currentView, boardData.appointments, rangeAppointments]);

  const formattedDateHeader = useMemo(() => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (currentView === "day") {
      return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } else if (currentView === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `Week of ${startStr} - ${endStr}`;
    } else {
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
    }
  }, [currentDate, currentView, weekDays]);

  const navigateDate = (newDateStr: string) => {
    router.push(`/appointments?date=${newDateStr}&view_by=${viewBy}`);
  };

  const shiftDate = (amount: number) => {
    const [y, m, d] = currentDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (currentView === "day") {
      date.setDate(date.getDate() + amount);
    } else if (currentView === "week") {
      date.setDate(date.getDate() + amount * 7);
    } else if (currentView === "month") {
      date.setMonth(date.getMonth() + amount);
    }
    const formatted = getLocalDateString(date);
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
    return Math.max(ROW_HEIGHT - 4, durationMins * PX_PER_MINUTE - 4);
  };

  const getAppointmentDuration = (appt: BoardAppointment) => {
    if (appt.start_at && appt.end_at) {
      return (new Date(appt.end_at).getTime() - new Date(appt.start_at).getTime()) / 60000;
    }
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
    const interval = setInterval(updateLine, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  // Apply filters including text matching, status, and acting role filters
  const filteredAppointments = appointmentsToFilter.filter((appt) => {
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

    // 3. Personalized Clinician filter
    if (actingRole === "clinician") {
      if (viewBy === "practitioners" && appt.practitioner !== actingClinicianId) {
        return false;
      }
    } else if (selectedPractitionerId !== null && viewBy === "practitioners") {
      // Receptionist / Admin selecting a specific clinician
      if (appt.practitioner !== selectedPractitionerId) {
        return false;
      }
    }

    return true;
  });

  // Filter columns based on who is logged in or selected
  const displayedColumns = boardData.columns.filter((col) => {
    if (viewBy === "rooms") return true;

    // Filter out non-clinicians (e.g. admin, receptionist, etc.)
    if ("role" in col && col.role.toLowerCase() !== "clinician") {
      return false;
    }

    if (actingRole === "clinician") {
      return col.id === actingClinicianId;
    }

    if (selectedPractitionerId !== null) {
      return col.id === selectedPractitionerId;
    }

    return true;
  });

  // Native HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, apptId: number) => {
    if (!capabilities.can_move_appointment && actingRole !== "admin") {
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

    const columnContainer = e.currentTarget as HTMLDivElement;
    const rect = columnContainer.getBoundingClientRect();
    const dropY = e.clientY - rect.top;

    const dropMinsFromStart = dropY / PX_PER_MINUTE;
    const roundedMins = Math.round(dropMinsFromStart / 15) * 15;
    const dropMinsFromMidnight = roundedMins + START_HOUR * 60;

    const h = Math.floor(dropMinsFromMidnight / 60);
    const m = dropMinsFromMidnight % 60;

    const paddedH = String(h).padStart(2, "0");
    const paddedM = String(m).padStart(2, "0");
    const targetStartTimeStr = `${paddedH}:${paddedM}`;

    const appt = boardData.appointments.find((a) => a.id === apptId);
    if (!appt) return;

    const durationMins = getAppointmentDuration(appt);
    const endMinsFromMidnight = dropMinsFromMidnight + durationMins;
    const endH = Math.floor(endMinsFromMidnight / 60) % 24;
    const endM = endMinsFromMidnight % 60;
    const targetEndTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    const startAtStr = `${currentDate}T${targetStartTimeStr}:00`;
    const endAtStr = `${currentDate}T${targetEndTimeStr}:00`;

    // Optimistic Update
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

    setBoardData({ ...boardData, appointments: updatedAppointments });

    const payload = {
      start_at: startAtStr,
      end_at: endAtStr,
      practitioner: viewBy === "practitioners" ? colId : appt.practitioner,
      room: viewBy === "rooms" ? colId : appt.room,
    };

    startTransition(async () => {
      const res = await moveAppointment(apptId, payload);
      if (res.success) {
        toast.success(`Rescheduled ${appt.patient_name} to ${targetStartTimeStr}.`);
        router.refresh();
        setRangeRefreshKey((prev) => prev + 1);
      } else {
        setBoardData({ ...boardData, appointments: originalAppointmentsSnapshot });
        if (res.status === 409 && res.conflicts) {
          const detail = res.conflicts.map((c: any) => c.detail).join(". ");
          toast.error(`Scheduling Conflict (409): ${detail || res.error}`);
        } else {
          toast.error(res.error || "Failed to move appointment.");
        }
      }
    });
  };

  // Click on empty cell: switches to Create Appointment tab prefilled
  const handleGridCellClick = (e: React.MouseEvent, colId: number, slotIndex: number) => {
    if ((e.target as HTMLElement).closest(".appointment-card-trigger")) {
      return;
    }
    if (!capabilities.can_create_appointment && actingRole !== "admin") {
      toast.error("You do not have capabilities to schedule new appointments.");
      return;
    }

    const elapsedMins = slotIndex * 30;
    const dropMinsFromMidnight = elapsedMins + START_HOUR * 60;
    const h = Math.floor(dropMinsFromMidnight / 60);
    const m = dropMinsFromMidnight % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    setBookingPatient(null);
    setBookingTime(timeStr);
    if (viewBy === "practitioners") {
      setBookingPractitionerId(colId);
      setBookingRoomId(null);
    } else {
      setBookingRoomId(colId);
      setBookingPractitionerId(null);
    }

    // Open booking drawer immediately
    setIsBookingOpen(true);
    toast.success(`Selected slot at ${timeStr}. Prefilling creation form.`);
  };

  const handleWeekGridCellClick = (e: React.MouseEvent, dayStr: string, slotIndex: number) => {
    if ((e.target as HTMLElement).closest(".appointment-card-trigger")) {
      return;
    }
    if (!capabilities.can_create_appointment && actingRole !== "admin") {
      toast.error("You do not have capabilities to schedule new appointments.");
      return;
    }

    const elapsedMins = slotIndex * 30;
    const dropMinsFromMidnight = elapsedMins + START_HOUR * 60;
    const h = Math.floor(dropMinsFromMidnight / 60);
    const m = dropMinsFromMidnight % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    setBookingPatient(null);
    setBookingTime(timeStr);
    setBookingDate(dayStr);

    if (viewBy === "practitioners") {
      const practitionerId = actingRole === "clinician" ? actingClinicianId : selectedPractitionerId;
      setBookingPractitionerId(practitionerId);
      setBookingRoomId(null);
    } else {
      setBookingRoomId(null);
      setBookingPractitionerId(null);
    }

    setIsBookingOpen(true);
    toast.success(`Selected slot at ${timeStr} on ${dayStr}. Prefilling creation form.`);
  };

  const handleMonthCellClick = (e: React.MouseEvent, dayStr: string) => {
    if (
      (e.target as HTMLElement).closest(".appointment-card-trigger") ||
      (e.target as HTMLElement).closest("a") ||
      (e.target as HTMLElement).closest("button")
    ) {
      return;
    }
    if (!capabilities.can_create_appointment && actingRole !== "admin") {
      toast.error("You do not have capabilities to schedule new appointments.");
      return;
    }

    setBookingPatient(null);
    setBookingTime("08:00");
    setBookingDate(dayStr);

    if (viewBy === "practitioners") {
      const practitionerId = actingRole === "clinician" ? actingClinicianId : selectedPractitionerId;
      setBookingPractitionerId(practitionerId);
      setBookingRoomId(null);
    } else {
      setBookingRoomId(null);
      setBookingPractitionerId(null);
    }

    setIsBookingOpen(true);
    toast.success(`Selected date ${dayStr}. Prefilling creation form.`);
  };

  const handleOpenDetails = (appt: BoardAppointment) => {
    setSelectedAppointment(appt);
    setIsDetailOpen(true);
  };

  const handleTriggerFollowUp = (patientId: number, practitionerId: number | null) => {
    setBookingTime("08:30");
    setBookingPractitionerId(practitionerId);
    setBookingRoomId(null);
    if (selectedAppointment) {
      setBookingPatient({
        id: selectedAppointment.patient,
        full_name_display: selectedAppointment.patient_name || "Unknown Patient",
        patient_code: selectedAppointment.patient_code || "",
        primary_phone: selectedAppointment.patient_phone || "",
      });
    } else {
      setBookingPatient(null);
    }
    setIsBookingOpen(true);
    toast.info("Prefilled follow-up appointment slots.");
  };

  const handleSuccessCallback = () => {
    router.refresh();
    setRangeRefreshKey((prev) => prev + 1);
  };

  const handlePrintTrigger = () => {
    window.print();
  };

  // Color mappings for Schedule-X style border left tags
  const getAccentBorderClass = (colorToken?: string) => {
    const tok = String(colorToken || "").toLowerCase().trim();
    if (tok.includes("purple") || tok.includes("review")) return "border-l-4 border-l-[var(--hh-purple)] bg-purple-50/75 hover:bg-purple-100/90";
    if (tok.includes("green") || tok.includes("acupuncture")) return "border-l-4 border-l-[#225c2c] bg-green-50/75 hover:bg-green-100/90";
    if (tok.includes("blue") || tok.includes("consult")) return "border-l-4 border-l-[#006687] bg-sky-50/75 hover:bg-sky-100/90";
    if (tok.includes("amber") || tok.includes("warn") || tok.includes("follow")) return "border-l-4 border-l-[#875400] bg-amber-50/75 hover:bg-amber-100/90";
    if (tok.includes("red") || tok.includes("emerg")) return "border-l-4 border-l-red-600 bg-red-50/75 hover:bg-red-100/90";
    return "border-l-4 border-l-gray-400 bg-gray-50/75 hover:bg-gray-100/90";
  };

  // Filter practitioners list shown in dropdowns based on role
  const filterDropdownPractitioners = useMemo(() => {
    return resources.practitioners.filter((p) => p.role.toLowerCase() === "clinician");
  }, [resources.practitioners]);

  // Filter print summary entries
  const currentPrintedClinician = resources.practitioners.find(
    (p) => p.id === (actingRole === "clinician" ? actingClinicianId : selectedPractitionerId)
  );

  return (
    <div className="space-y-6">
      {/* Dynamic Action Sheets/Modals */}
      <QuickBookingDrawer
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        selectedDate={bookingDate}
        selectedTime={bookingTime}
        selectedPractitionerId={bookingPractitionerId}
        selectedRoomId={bookingRoomId}
        resources={resources}
        capabilities={capabilities}
        onSuccess={handleSuccessCallback}
        initialPatient={bookingPatient}
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

      {/* ADMIN TESTING SANDBOX PANEL */}
      {session.role === "admin" && (
        <section className="no-print relative overflow-hidden rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--hh-purple)] text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3f1d58] flex items-center gap-2">
                  Sandbox Testing Controls
                  <Badge variant="outline" className="text-[10px] bg-purple-100 text-[var(--hh-purple)] font-bold">
                    Admin Active
                  </Badge>
                </h3>
                <p className="text-xs text-gray-500">
                  Switch roles instantly to evaluate different user experiences on the scheduler.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white p-1 shadow-inner">
                <Button
                  size="sm"
                  variant={actingRole === "admin" ? "default" : "ghost"}
                  onClick={() => {
                    setActingRole("admin");
                    setSelectedPractitionerId(null);
                  }}
                  className="h-8 text-xs font-semibold px-3"
                >
                  <ShieldCheck size={14} className="mr-1" />
                  Admin
                </Button>
                <Button
                  size="sm"
                  variant={actingRole === "receptionist" ? "default" : "ghost"}
                  onClick={() => {
                    setActingRole("receptionist");
                    setSelectedPractitionerId(null);
                  }}
                  className="h-8 text-xs font-semibold px-3"
                >
                  <UserCheck size={14} className="mr-1" />
                  Receptionist
                </Button>
                <Button
                  size="sm"
                  variant={actingRole === "clinician" ? "default" : "ghost"}
                  onClick={() => setActingRole("clinician")}
                  className="h-8 text-xs font-semibold px-3"
                >
                  <Activity size={14} className="mr-1" />
                  Clinician
                </Button>
              </div>

              {actingRole === "clinician" && (
                <div className="relative">
                  <select
                    className="h-9 pl-3 pr-8 text-xs font-bold text-[#53605a] bg-white border border-purple-200 rounded-lg shadow-sm focus:ring-1 focus:ring-[var(--hh-purple)] outline-none"
                    value={actingClinicianId || ""}
                    onChange={(e) => setActingClinicianId(Number(e.target.value))}
                  >
                    {resources.practitioners
                      .filter((p) => p.role.toLowerCase() === "clinician")
                      .map((prac) => (
                        <option key={prac.id} value={prac.id}>
                          Acting: {prac.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CORE MODULAR SUB-MENU TABS */}
      <nav className="no-print flex border-b border-[var(--hh-border)] bg-gray-50/50 p-1.5 rounded-xl gap-1">
        <Button
          variant={activeTab === "schedule" ? "default" : "ghost"}
          onClick={() => setActiveTab("schedule")}
          className="flex-1 md:flex-none justify-center gap-2 font-bold text-sm h-10 px-6 rounded-lg transition-all"
        >
          <CalendarDays size={16} />
          Check Schedule
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setBookingPatient(null);
            setBookingTime("08:00");
            setBookingPractitionerId(null);
            setBookingRoomId(null);
            setIsBookingOpen(true);
          }}
          className="flex-1 md:flex-none justify-center gap-2 font-bold text-sm h-10 px-6 rounded-lg transition-all"
        >
          <Plus size={16} />
          Create Appointment
        </Button>
        <Button
          variant={activeTab === "print" ? "default" : "ghost"}
          onClick={() => setActiveTab("print")}
          className="flex-1 md:flex-none justify-center gap-2 font-bold text-sm h-10 px-6 rounded-lg transition-all"
        >
          <Printer size={16} />
          Print Schedule
        </Button>
      </nav>

      {/* INLINE CSS OVERRIDES FOR PRINT UTILITY */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #print-agenda-section, #print-agenda-section * {
                visibility: visible;
              }
              #print-agenda-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `,
        }}
      />

      {/* TAB 1: SCHEDULE VIEW */}
      {activeTab === "schedule" && (
        <div className="space-y-6 no-print">
          {/* Action Toolbar */}
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--hh-border)] pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--hh-border)] bg-white p-0.5 shadow-sm">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-[#53605a]" onClick={() => shiftDate(-1)}>
                  <ChevronLeft size={16} />
                </Button>
                <Button
                  variant="ghost"
                  className="h-8 text-xs font-bold text-[#53605a] px-3 border-x border-[var(--hh-border)] rounded-none"
                  onClick={() => navigateDate(getLocalDateString(new Date()))}
                >
                  Today
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-[#53605a]" onClick={() => shiftDate(1)}>
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="inline-flex rounded-lg border border-[var(--hh-border)] bg-white p-0.5 shadow-sm">
                <Button
                  variant={currentView === "day" ? "secondary" : "ghost"}
                  onClick={() => setCurrentView("day")}
                  className={`h-8 text-xs font-bold px-3 ${currentView === "day" ? "bg-gray-100 text-[#3f1d58]" : "text-[#53605a]"}`}
                >
                  Day
                </Button>
                <Button
                  variant={currentView === "week" ? "secondary" : "ghost"}
                  onClick={() => setCurrentView("week")}
                  className={`h-8 text-xs font-bold px-3 border-x border-[var(--hh-border)] rounded-none ${currentView === "week" ? "bg-gray-100 text-[#3f1d58]" : "text-[#53605a]"}`}
                >
                  Week
                </Button>
                <Button
                  variant={currentView === "month" ? "secondary" : "ghost"}
                  onClick={() => setCurrentView("month")}
                  className={`h-8 text-xs font-bold px-3 ${currentView === "month" ? "bg-gray-100 text-[#3f1d58]" : "text-[#53605a]"}`}
                >
                  Month
                </Button>
              </div>

              <div className="relative">
                <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={15} />
                <Input
                  type="date"
                  className="h-9 pl-9 pr-3 text-xs font-bold text-[#53605a] w-36 bg-white border-[var(--hh-border)] shadow-sm"
                  value={currentDate}
                  onChange={(e) => navigateDate(e.target.value)}
                />
              </div>

              <div className="text-sm font-bold text-[#3f1d58] ml-2">
                {formattedDateHeader}
              </div>

              {actingRole !== "clinician" && (
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={15} />
                  <select
                    className="h-9 pl-9 pr-8 text-xs font-bold text-[#53605a] bg-white border border-[var(--hh-border)] rounded-lg shadow-sm focus:ring-1 focus:ring-[var(--hh-purple)] outline-none appearance-none"
                    value={selectedPractitionerId || ""}
                    onChange={(e) => setSelectedPractitionerId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">All Clinicians</option>
                    {filterDropdownPractitioners.map((prac) => (
                      <option key={prac.id} value={prac.id}>
                        {prac.name} ({prac.role.toLowerCase().replace("_", " ")})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {actingRole === "clinician" && (
                <Badge variant="harmony" className="text-xs py-1.5 px-3 uppercase tracking-wider font-bold">
                  Personal Dashboard: {resources.practitioners.find((p) => p.id === actingClinicianId)?.name}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
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

          {/* Quick Filter Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <Input
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 text-sm bg-white"
            />
          </div>

          {/* GRID WRAPPER */}
          {viewBy === "practitioners" && displayedColumns.length === 0 ? (
            <div className="hh-panel border border-[var(--hh-border)] shadow-md bg-gradient-to-b from-white to-gray-50/50 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm mb-6 animate-pulse">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-bold text-[#3f1d58] mb-2">No Clinicians Configured</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
                There are no active clinicians configured with schedule roles in the system.
              </p>
              {actingRole === "admin" ? (
                <Button
                  onClick={() => router.push("/appointments/availability")}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-6 py-2 rounded-lg gap-2 shadow-sm transition-all"
                >
                  <CalendarDays size={16} />
                  Configure Availability Settings
                </Button>
              ) : (
                <div className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-150 px-4 py-2.5 rounded-lg max-w-sm mx-auto">
                  Please ask an Administrator to configure clinician availability in "Availability Settings".
                </div>
              )}
            </div>
          ) : (
            <div className="hh-panel overflow-hidden border border-[var(--hh-border)] shadow-md bg-white rounded-xl">
              {isLoadingRange ? (
                <div className="flex flex-col items-center justify-center p-12 min-h-[400px] text-[#53605a]">
                  <RefreshCw className="h-8 w-8 animate-spin mb-4 text-[var(--hh-purple)] animate-infinite" />
                  <p className="text-sm font-semibold">Loading schedule range...</p>
                </div>
              ) : (
                <>
                  {currentView === "day" && (
                    <div className="overflow-x-auto">
                      <div className="flex select-none border-b border-[var(--hh-border)] bg-[var(--hh-section)] sticky top-0 z-20 min-w-[960px]">
                        <div className="w-16 shrink-0 border-r border-[var(--hh-border)]" />
                        {displayedColumns.map((col) => (
                          <div
                            key={col.id}
                            className="flex-1 min-w-[220px] p-4 text-center border-r border-[var(--hh-border)] last:border-r-0 flex flex-col justify-center items-center"
                          >
                            <div className="text-sm font-bold text-[#3f1d58] tracking-wide">{col.name}</div>
                            {"role" in col ? (
                              <Badge variant="outline" className="text-[10px] mt-1 bg-white border capitalize font-semibold text-purple-700">
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

                      {/* TIMELINE ROWS */}
                      <div className="relative flex min-w-[960px] select-none" ref={gridContainerRef}>
                        <div className="w-16 shrink-0 border-r border-[var(--hh-border)] bg-gray-50 flex flex-col z-10 sticky left-0 shadow-sm">
                          {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                            const hour = START_HOUR + i;
                            return (
                              <div
                                key={hour}
                                className="border-b border-[var(--hh-border)] text-right pr-2 text-[10px] font-bold text-[#66736d] font-mono select-none flex items-start pt-1.5"
                                style={{ height: `${ROW_HEIGHT * 2}px` }}
                              >
                                {String(hour).padStart(2, "0")}:00
                              </div>
                            );
                          })}
                        </div>

                        {/* HORIZONTAL DASHED LINES */}
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

                        {/* NOW TIMELINE INDICATOR */}
                        {nowLineTop !== null && (
                          <div
                            className="absolute left-16 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                            style={{ top: `${nowLineTop}px` }}
                          >
                            <div className="h-2.5 w-2.5 rounded-full bg-red-600 -ml-1.5 shadow-md" />
                            <span className="text-[8px] font-bold font-mono text-white bg-red-600 px-1 py-0.5 rounded ml-1 leading-none shadow-sm">
                              Now
                            </span>
                          </div>
                        )}

                        {/* ABSOLUTE COLUMN APPOINTMENT CHIPS */}
                        {displayedColumns.map((col) => {
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
                              {/* Cell Click to Schedule Overlay */}
                              <div className="absolute inset-0 z-0 flex flex-col">
                                {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, slotIdx) => (
                                  <div
                                    key={slotIdx}
                                    onClick={(e) => handleGridCellClick(e, col.id, slotIdx)}
                                    className="w-full hover:bg-gray-100/60 cursor-cell border-b border-transparent transition-colors"
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                    title="Click slot to schedule appointment here"
                                  />
                                ))}
                              </div>

                              {colAppointments.map((appt) => {
                                const durationMins = getAppointmentDuration(appt);
                                const top = getTopOffset(appt.appointment_time, appt.start_at);
                                const height = getCardHeight(durationMins);

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
                                    className={`appointment-card-trigger absolute left-1 right-1 p-2.5 rounded-lg shadow-sm border border-[var(--hh-border)] text-left flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing z-10 overflow-hidden ${getAccentBorderClass(
                                      appt.appointment_type_label || appt.appointment_type
                                    )}`}
                                  >
                                    <div className="w-full">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-mono font-bold text-[#66736d] flex items-center gap-0.5">
                                          <Clock size={9} />
                                          {appt.start_at && appt.end_at
                                            ? `${new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                                            : appt.appointment_time?.slice(0, 5)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {hasUnsignedConsentAlert && (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 p-0.5 rounded animate-pulse" title="Consent signature is missing!">
                                              <AlertTriangle size={10} />
                                            </span>
                                          )}
                                          {isHighPriority && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" title="High Priority!" />
                                          )}
                                        </div>
                                      </div>

                                      <h4 className="text-xs font-bold text-[#3f1d58] mt-1.5 truncate">
                                        {appt.patient_name}
                                      </h4>
                                      <span className="text-[9px] font-mono text-[var(--hh-purple)] block leading-none mt-0.5 font-bold">
                                        {appt.patient_code}
                                      </span>
                                    </div>

                                    {/* CLINICIAN PERSONALIZED ACTION BUTTONS */}
                                    {actingRole === "clinician" && (
                                      <div className="mt-1 flex items-center gap-1 z-20">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 rounded-md hover:bg-purple-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/patients/${appt.patient_public_id || appt.patient}`);
                                          }}
                                          title="Open patient record workspace"
                                        >
                                          <FileText size={11} className="text-[var(--hh-purple)]" />
                                        </Button>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-[8px] border-t border-gray-200/50 pt-1 mt-1 shrink-0">
                                      <span className="text-[#66736d] truncate font-medium max-w-[90px]">
                                        {appt.appointment_type_label || appt.appointment_type.replaceAll("_", " ")}
                                      </span>
                                      {appt.flow_state ? (
                                        <Badge className="text-[7px] bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple)] rounded px-1 uppercase tracking-tight py-0">
                                          {appt.flow_state.replace("_", " ")}
                                        </Badge>
                                      ) : (
                                        <span className="text-[8px] font-bold uppercase text-sky-800">
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
                  )}

                  {currentView === "week" && (
                    <div className="overflow-x-auto">
                      <div className="flex select-none border-b border-[var(--hh-border)] bg-[var(--hh-section)] sticky top-0 z-20 min-w-[960px]">
                        <div className="w-16 shrink-0 border-r border-[var(--hh-border)]" />
                        {weekDays.map((day) => {
                          const dayName = day.toLocaleDateString("en-US", { weekday: "short" });
                          const dayNum = day.getDate();
                          const dayStr = getLocalDateString(day);
                          const isToday = dayStr === getLocalDateString(new Date());
                          return (
                            <div
                              key={dayStr}
                              className="flex-1 min-w-[130px] p-4 text-center border-r border-[var(--hh-border)] last:border-r-0 flex flex-col justify-center items-center"
                            >
                              <div className="text-sm font-bold text-[#3f1d58] tracking-wide flex items-center gap-1.5">
                                <span>{dayName}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday ? "bg-[var(--hh-purple)] text-white" : "bg-gray-100 text-[#53605a]"}`}>
                                  {dayNum}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* TIMELINE ROWS */}
                      <div className="relative flex min-w-[960px] select-none">
                        <div className="w-16 shrink-0 border-r border-[var(--hh-border)] bg-gray-50 flex flex-col z-10 sticky left-0 shadow-sm">
                          {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                            const hour = START_HOUR + i;
                            return (
                              <div
                                key={hour}
                                className="border-b border-[var(--hh-border)] text-right pr-2 text-[10px] font-bold text-[#66736d] font-mono select-none flex items-start pt-1.5"
                                style={{ height: `${ROW_HEIGHT * 2}px` }}
                              >
                                {String(hour).padStart(2, "0")}:00
                              </div>
                            );
                          })}
                        </div>

                        {/* HORIZONTAL DASHED LINES */}
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

                        {/* ABSOLUTE COLUMN APPOINTMENT CHIPS FOR EACH DAY OF WEEK */}
                        {weekDays.map((day) => {
                          const dayStr = getLocalDateString(day);
                          const isToday = dayStr === getLocalDateString(new Date());

                          const dayAppointments = filteredAppointments.filter((appt) => {
                            const apptDateStr = appt.start_at ? getLocalDateString(new Date(appt.start_at)) : (appt.appointment_date || "");
                            return apptDateStr === dayStr;
                          });

                          return (
                            <div
                              key={dayStr}
                              className="flex-1 min-w-[130px] border-r border-[var(--hh-border)] last:border-r-0 relative"
                              style={{
                                height: `${ROW_HEIGHT * 2 * (END_HOUR - START_HOUR)}px`,
                              }}
                            >
                              {/* NOW TIMELINE INDICATOR (Only for today's column) */}
                              {isToday && nowLineTop !== null && (
                                <div
                                  className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                                  style={{ top: `${nowLineTop}px` }}
                                >
                                  <div className="h-2.5 w-2.5 rounded-full bg-red-600 -ml-1.2 shadow-md" />
                                </div>
                              )}

                              {/* Cell Click to Schedule Overlay */}
                              <div className="absolute inset-0 z-0 flex flex-col">
                                {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, slotIdx) => (
                                  <div
                                    key={slotIdx}
                                    onClick={(e) => handleWeekGridCellClick(e, dayStr, slotIdx)}
                                    className="w-full hover:bg-gray-100/60 cursor-cell border-b border-transparent transition-colors"
                                    style={{ height: `${ROW_HEIGHT}px` }}
                                    title="Click slot to schedule appointment here"
                                  />
                                ))}
                              </div>

                              {dayAppointments.map((appt) => {
                                const durationMins = getAppointmentDuration(appt);
                                const top = getTopOffset(appt.appointment_time, appt.start_at);
                                const height = getCardHeight(durationMins);

                                const isHighPriority = appt.priority === "high";
                                const hasUnsignedConsentAlert = appt.consent_status !== "signed" && appt.consent_status !== "verified";

                                return (
                                  <div
                                    key={appt.id}
                                    onClick={() => handleOpenDetails(appt)}
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                    }}
                                    className={`appointment-card-trigger absolute left-1 right-1 p-2 rounded-lg shadow-sm border border-[var(--hh-border)] text-left flex flex-col justify-between transition-all cursor-pointer z-10 overflow-hidden hover:scale-[1.01] hover:shadow-md ${getAccentBorderClass(
                                      appt.appointment_type_label || appt.appointment_type
                                    )}`}
                                  >
                                    <div className="w-full">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-mono font-bold text-[#66736d] flex items-center gap-0.5">
                                          <Clock size={9} />
                                          {appt.start_at && appt.end_at
                                            ? `${new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                                            : appt.appointment_time?.slice(0, 5)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          {hasUnsignedConsentAlert && (
                                            <span className="text-[10px] font-bold text-red-600 bg-red-100 p-0.5 rounded animate-pulse" title="Consent signature is missing!">
                                              <AlertTriangle size={10} />
                                            </span>
                                          )}
                                          {isHighPriority && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-ping" title="High Priority!" />
                                          )}
                                        </div>
                                      </div>

                                      <h4 className="text-[11px] font-bold text-[#3f1d58] mt-1 truncate">
                                        {appt.patient_name}
                                      </h4>
                                      {/* Include compact clinician display if viewing all practitioners */}
                                      {selectedPractitionerId === null && actingRole !== "clinician" && (
                                        <span className="text-[8px] font-semibold text-gray-500 block truncate leading-none mt-0.5">
                                          {appt.practitioner_name}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center justify-between text-[8px] border-t border-gray-200/50 pt-1 mt-1 shrink-0">
                                      <span className="text-[#66736d] truncate font-medium max-w-[85px]">
                                        {appt.appointment_type_label || appt.appointment_type.replaceAll("_", " ")}
                                      </span>
                                      {appt.flow_state ? (
                                        <Badge className="text-[7px] bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple)] rounded px-1 uppercase tracking-tight py-0">
                                          {appt.flow_state.replace("_", " ")}
                                        </Badge>
                                      ) : (
                                        <span className="text-[8px] font-bold uppercase text-sky-800">
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
                  )}

                  {currentView === "month" && (
                    <div className="overflow-x-auto">
                      <div className="min-w-[960px]">
                        <div className="grid grid-cols-7 border-b border-[var(--hh-border)] bg-[var(--hh-section)] sticky top-0 z-20 select-none text-center">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((wd) => (
                            <div key={wd} className="p-3 text-xs font-bold text-[#3f1d58] border-r border-[var(--hh-border)] last:border-r-0">
                              {wd}
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-7 bg-gray-50/50">
                          {monthDays.map((day) => {
                            const dayStr = getLocalDateString(day);
                            const isToday = dayStr === getLocalDateString(new Date());
                            const [currentY, currentM] = currentDate.split("-").map(Number);
                            const isCurrentMonth = day.getMonth() === currentM - 1;

                            const dayAppointments = filteredAppointments.filter((appt) => {
                              const apptDateStr = appt.start_at ? getLocalDateString(new Date(appt.start_at)) : (appt.appointment_date || "");
                              return apptDateStr === dayStr;
                            });

                            const visibleAppointments = dayAppointments.slice(0, 3);
                            const extraCount = dayAppointments.length - 3;

                            return (
                              <div
                                key={dayStr}
                                onClick={(e) => handleMonthCellClick(e, dayStr)}
                                className={`min-h-[110px] p-2 border-b border-r border-[var(--hh-border)] last:border-r-0 bg-white flex flex-col justify-between cursor-pointer transition-colors duration-150 hover:bg-gray-50/70 relative ${
                                  !isCurrentMonth ? "bg-gray-50/30 text-gray-400" : "text-gray-900"
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span
                                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                      isToday ? "bg-[var(--hh-purple)] text-white" : !isCurrentMonth ? "text-gray-300 animate-none opacity-50" : "text-gray-600"
                                    }`}
                                  >
                                    {day.getDate()}
                                  </span>
                                  {dayAppointments.length > 0 && (
                                    <span className="text-[10px] font-bold text-[#53605a] bg-gray-100 px-1.5 py-0.5 rounded-full font-mono">
                                      {dayAppointments.length}
                                    </span>
                                  )}
                                </div>

                                {/* Chips List */}
                                <div className="flex-1 flex flex-col gap-1 z-10">
                                  {visibleAppointments.map((appt) => {
                                    const isHighPriority = appt.priority === "high";
                                    const hasUnsignedConsentAlert = appt.consent_status !== "signed" && appt.consent_status !== "verified";

                                    // Compact accent color class
                                    const tok = String(appt.appointment_type_label || appt.appointment_type).toLowerCase().trim();
                                    let chipColor = "border-l-2 border-l-gray-400 bg-gray-50 hover:bg-gray-100";
                                    if (tok.includes("purple") || tok.includes("review")) chipColor = "border-l-2 border-l-[var(--hh-purple)] bg-purple-50 hover:bg-purple-100";
                                    if (tok.includes("green") || tok.includes("acupuncture")) chipColor = "border-l-2 border-l-[#225c2c] bg-green-50 hover:bg-green-100";
                                    if (tok.includes("blue") || tok.includes("consult")) chipColor = "border-l-2 border-l-[#006687] bg-sky-50 hover:bg-sky-100";
                                    if (tok.includes("amber") || tok.includes("warn") || tok.includes("follow")) chipColor = "border-l-2 border-l-[#875400] bg-amber-50 hover:bg-amber-100";
                                    if (tok.includes("red") || tok.includes("emerg")) chipColor = "border-l-2 border-l-red-600 bg-red-50 hover:bg-red-100";

                                    return (
                                      <div
                                        key={appt.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDetails(appt);
                                        }}
                                        className={`appointment-card-trigger p-1 px-1.5 rounded text-[10px] font-bold flex items-center justify-between truncate shadow-sm border border-gray-100 cursor-pointer ${chipColor}`}
                                      >
                                        <span className="truncate flex items-center gap-1">
                                          <span className="font-mono text-[9px] text-[#66736d] font-bold shrink-0">
                                            {appt.start_at
                                              ? new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                                              : appt.appointment_time?.slice(0, 5)}
                                          </span>
                                          <span className="truncate text-[#3f1d58]">
                                            {appt.patient_name}
                                          </span>
                                        </span>
                                        <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                          {hasUnsignedConsentAlert && (
                                            <AlertTriangle size={9} className="text-red-600" />
                                          )}
                                          {isHighPriority && (
                                            <span className="h-1.5 w-1.5 rounded-full bg-red-600 shrink-0" />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {extraCount > 0 && (
                                  <div className="text-[9px] font-bold text-[var(--hh-purple)] bg-purple-50 hover:bg-purple-100 px-1.5 py-0.5 rounded mt-1 text-right font-mono self-end">
                                    + {extraCount} more
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}



      {/* TAB 3: PRINT VIEW */}
      {activeTab === "print" && (
        <div className="space-y-6 max-w-4xl mx-auto print-container">
          {/* Print controls */}
          <div className="no-print hh-panel p-5 bg-white border border-[var(--hh-border)] rounded-xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-[#3f1d58] flex items-center gap-1.5">
                <Printer size={16} />
                Daily Schedule Printer
              </h3>
              <p className="text-xs text-gray-500">
                Generate and print clean, physical summaries of today's schedule for paper review.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {actingRole !== "clinician" && (
                <select
                  className="h-9 px-3 text-xs font-bold text-[#53605a] bg-white border border-[var(--hh-border)] rounded-lg shadow-sm"
                  value={selectedPractitionerId || ""}
                  onChange={(e) => setSelectedPractitionerId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">All Clinicians</option>
                  {filterDropdownPractitioners.map((prac) => (
                    <option key={prac.id} value={prac.id}>
                      {prac.name}
                    </option>
                  ))}
                </select>
              )}

              <Button onClick={handlePrintTrigger} className="h-9 text-xs font-bold gap-1.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-lg">
                <Printer size={14} />
                Print Daily Schedule
              </Button>
            </div>
          </div>

          {/* PHYSICAL AGENDA SHEET (Targeted by CSS overrides) */}
          <div id="print-agenda-section" className="bg-white border border-[var(--hh-border)] p-8 rounded-xl shadow-sm">
            <header className="border-b border-gray-200 pb-4 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 uppercase">
                  Harmony Health System SZ
                </h1>
                <p className="text-xs text-gray-500 uppercase font-semibold">
                  Daily Clinic Appointment Agenda
                </p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <div>Date: <strong className="font-bold text-gray-900">{currentDate}</strong></div>
                <div>Printed: {new Date().toLocaleDateString()}</div>
                <div>Practitioner: <strong className="font-bold text-gray-900">{currentPrintedClinician?.name || "All Clinicians"}</strong></div>
              </div>
            </header>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-gray-300 text-gray-600 font-bold uppercase tracking-wider">
                  <th className="py-2.5 pr-3">Time</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Notes / Reason</th>
                  <th className="py-2.5 pl-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredAppointments
                  .sort((a, b) => {
                    const t1 = a.start_at || a.appointment_time || "";
                    const t2 = b.start_at || b.appointment_time || "";
                    return t1.localeCompare(t2);
                  })
                  .map((appt) => (
                    <tr key={appt.id} className="hover:bg-gray-50">
                      <td className="py-3 pr-3 font-mono font-bold text-gray-900">
                        {appt.start_at
                          ? new Date(appt.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                          : appt.appointment_time?.slice(0, 5)}
                      </td>
                      <td className="py-3 px-3 font-bold text-gray-800">{appt.patient_name}</td>
                      <td className="py-3 px-3 font-mono text-gray-600">{appt.patient_code}</td>
                      <td className="py-3 px-3 text-gray-500">{appt.patient_phone || "None"}</td>
                      <td className="py-3 px-3 font-semibold capitalize text-purple-800">
                        {(appt.appointment_type_label || appt.appointment_type).replaceAll("_", " ")}
                      </td>
                      <td className="py-3 px-3 text-gray-600 italic truncate max-w-xs">{appt.notes || "No notes"}</td>
                      <td className="py-3 pl-3 font-semibold capitalize text-gray-800">{appt.status_label || appt.status}</td>
                    </tr>
                  ))}
                {filteredAppointments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                      No appointments scheduled for this clinician on this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <footer className="mt-12 pt-4 border-t border-gray-150 text-[10px] text-gray-400 flex justify-between">
              <span>Harmony Health MIS • mis.harmonyhealthsz.com</span>
              <span>Generated dynamically via Harmony Administrator Portal</span>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
