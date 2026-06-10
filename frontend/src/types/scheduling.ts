import type { Appointment } from "./clinic";

export interface UserCapabilities {
  can_create_appointment: boolean;
  can_move_appointment: boolean;
  can_check_in: boolean;
  can_cancel_appointment: boolean;
  can_assign_room: boolean;
  can_create_follow_up: boolean;
}

export interface ResourceRoom {
  id: number;
  name: string;
  location?: string | null;
  resource_type?: string;
  capacity: number;
  is_active: boolean;
}

export interface AppointmentType {
  id: number;
  name: string;
  default_duration_minutes: number;
  requires_practitioner: boolean;
  requires_room: boolean;
  requires_consent: boolean;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  color_token: string;
  is_active: boolean;
}

export interface PractitionerAvailability {
  id: number;
  practitioner: number;
  practitioner_name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  effective_from: string;
  effective_to?: string | null;
  location?: string | null;
}

export interface PractitionerColumn {
  id: number;
  name: string;
  role: string;
  availabilities: PractitionerAvailability[];
}

export interface RoomColumn {
  id: number;
  name: string;
  location?: string | null;
  capacity: number;
  resource_type?: string;
}

export interface SchedulingResources {
  rooms: ResourceRoom[];
  appointment_types: AppointmentType[];
  practitioners: {
    id: number;
    name: string;
    role: string;
  }[];
}

export interface BoardAppointment extends Appointment {
  start_at?: string | null;
  end_at?: string | null;
  practitioner?: number | null;
  practitioner_name?: string | null;
  room?: number | null;
  room_name?: string | null;
  flow_state?: string | null;
  consent_status?: "pending" | "generated" | "signed" | "verified" | null;
  consent_completed?: boolean;
  priority?: "low" | "medium" | "high" | null;
  priority_label?: string | null;
  created_by_name?: string | null;
  updated_by_name?: string | null;
  cancel_reason?: string | null;
}

export interface SchedulingBoardData {
  date: string;
  view_by: "practitioners" | "rooms";
  columns: (PractitionerColumn | RoomColumn)[];
  appointments: BoardAppointment[];
}

export interface SchedulingConflict {
  type: string;
  id: number;
  detail: string;
  conflict_start?: string;
  conflict_end?: string;
}

export interface ConflictErrorResponse {
  code: string;
  detail: string;
  conflicts: SchedulingConflict[];
}
