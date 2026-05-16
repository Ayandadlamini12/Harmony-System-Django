import type { DashboardStats, Paginated, Patient, Visit } from "@/types/clinic";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: 10 }
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

export function getVisits() {
  return apiGet<Paginated<Visit>>("/visits/", {
    count: 0,
    next: null,
    previous: null,
    results: []
  });
}

export { API_BASE_URL };
