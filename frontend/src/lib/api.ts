import type { Appointment, Case, ClinicianProfile, DashboardStats, ElevatedAccessRequest, EmployeeEnrollmentRequest, FormDraft, Paginated, Patient, PatientCheckIn, PatientJourney, User, Visit, Vital } from "@/types/clinic";
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
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiGet<Paginated<Case>>(`/cases/${query}`, {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export function getVisits() {
  return apiGet<Paginated<Visit>>("/visits/", {
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
  return apiGet<Paginated<Patient>>("/patients/consent-forms/", {
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

export { API_BASE_URL };
