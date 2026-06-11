import type { Appointment, Case, ClinicianProfile, DashboardStats, ElevatedAccessRequest, EmployeeEnrollmentRequest, EmailDeliveryLog, FormDraft, MessageRecipient, MessageThread, Paginated, PartnerCompany, Patient, PatientCheckIn, PatientJourney, RoleModuleMatrix, SupportTicket, SystemEmailSettings, User, Visit, Vital, UserNotificationSettings } from "@/types/clinic";
import type { SchedulingBoardData, SchedulingResources, UserCapabilities } from "@/types/scheduling";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("harmony_access")?.value;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      cache: "no-store"
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export function getDashboardStats() {
  return apiGet<DashboardStats>("/dashboard/stats/", {
    total_patients: 0,
    today_visits: 0,
    pending_drafts: 0,
    my_drafts: 0,
    follow_ups_due: 0
  });
}

export function getPatients(search = "") {
  if (search.includes("=")) {
    return apiGet<Paginated<Patient>>(`/patients/?${search}`, {
      count: 0,
      next: null,
      previous: null,
      results: []
    });
  }
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<Patient>>(`/patients/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getPatient(id: string | number) {
  return apiGet<Patient | null>(`/patients/${id}/`, null);
}

export function getCases(search = "") {
  if (search.includes("=")) {
    return apiGet<Paginated<Case>>(`/cases/?${search}`, {
      count: 0,
      next: null,
      previous: null,
      results: []
    });
  }
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<Case>>(`/cases/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getCase(id: string | number) {
  return apiGet<Case | null>(`/cases/${id}/`, null);
}

export function getVisits(search = "") {
  if (search.includes("=")) {
    return apiGet<Paginated<Visit>>(`/visits/?${search}`, {
      count: 0,
      next: null,
      previous: null,
      results: []
    });
  }
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<Visit>>(`/visits/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getSupportTickets(filter = "") {
  const query = filter ? (filter.includes("=") ? `?${filter}` : `?status=${encodeURIComponent(filter)}`) : "";
  return apiGet<Paginated<SupportTicket>>(`/support-tickets/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getVitals() {
  return apiGet<Paginated<Vital>>("/vitals/", {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getCheckIns(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<Paginated<PatientCheckIn>>(`/check-ins/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getAppointments(filter = "") {
  const query = filter ? `?${filter}` : "";
  return apiGet<Paginated<Appointment>>(`/appointments/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getPatientJourneys(filter = "") {
  const query = filter ? `?${filter}` : "";
  return apiGet<Paginated<PatientJourney>>(`/patient-journeys/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getAccessRequests() {
  return apiGet<Paginated<ElevatedAccessRequest>>("/access-requests/", {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getMessageThreads(filter = "") {
  const query = filter ? `?${filter}` : "";
  return apiGet<Paginated<MessageThread>>(`/message-threads/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getMessageRecipients() {
  return apiGet<MessageRecipient[]>("/message-threads/recipients/", []);
}

export function getFormDrafts(status = "draft") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<Paginated<FormDraft>>(`/form-drafts/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getFormDraft(draftKey: string) {
  return apiGet<FormDraft | null>(`/form-drafts/${draftKey}/`, null);
}

export function getUsers(search = "") {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<User>>(`/users/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getMyClinicianProfile() {
  return apiGet<ClinicianProfile | null>("/users/me/clinician-profile/", null);
}

export function getConsentForms() {
  return apiGet<Patient[]>("/patients/consent-forms/", []);
}

export function getDeletedPatients(search = "") {
  if (search.includes("=")) {
    return apiGet<Paginated<Patient>>(`/patients/deleted/?${search}`, {
      count: 0,
      next: null,
      previous: null,
      results: []
    });
  }
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<Patient>>(`/patients/deleted/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getEmployeeEnrollmentRequests(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet<Paginated<EmployeeEnrollmentRequest>>(`/employee-enrollment-requests/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getRoleModuleMatrix() {
  return apiGet<RoleModuleMatrix>("/role-module-permissions/matrix/", {
    roles: ["admin", "clinician", "receptionist", "supplier_contact", "supplier_manager", "partner_contact", "partner_manager"],
    modules: [],
    permissions: {
      admin: {},
      clinician: {},
      receptionist: {},
      supplier_contact: {},
      supplier_manager: {},
      partner_contact: {},
      partner_manager: {}
    }
  });
}

export function getSystemEmailSettings() {
  return apiGet<SystemEmailSettings | null>("/system/email-settings/", null);
}

export function getEmailDeliveryLogs() {
  return apiGet<Paginated<EmailDeliveryLog>>("/email-delivery-logs/", {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getPartnerCompanies(search = "") {
  if (search.includes("=")) {
    return apiGet<Paginated<PartnerCompany>>(`/partner-companies/?${search}`, {
      count: 0,
      next: null,
      previous: null,
      results: []
    });
  }
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<PartnerCompany>>(`/partner-companies/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getSchedulingBoard(date = "", viewBy = "practitioners") {
  const query = `?date=${encodeURIComponent(date)}&view_by=${encodeURIComponent(viewBy)}`;
  return apiGet<SchedulingBoardData>(`/scheduling/board/${query}`, {
    date: date || new Date().toISOString().slice(0, 10),
    view_by: viewBy as "practitioners" | "rooms",
    columns: [],
    appointments: []
  });
}

export function getSchedulingResources() {
  return apiGet<SchedulingResources>("/scheduling/resources/", {
    rooms: [],
    appointment_types: [],
    practitioners: []
  });
}

export function getUserCapabilities() {
  return apiGet<UserCapabilities>("/me/capabilities/", {
    can_create_appointment: false,
    can_move_appointment: false,
    can_check_in: false,
    can_cancel_appointment: false,
    can_assign_room: false,
    can_create_follow_up: false
  });
}

export function getUserNotificationSettings() {
  return apiGet<UserNotificationSettings | null>("/users/me/notification-settings/", null);
}

export { API_BASE_URL };

