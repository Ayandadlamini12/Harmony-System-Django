"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

async function getAuthHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get("harmony_access")?.value;
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  return `Bearer ${token}`;
}

export async function createAppointment(payload: {
  patient: number;
  appointment_type: number;
  start_at: string;
  end_at: string;
  practitioner?: number | null;
  room?: number | null;
  priority: string;
  source: string;
  notes?: string;
  status: string;
}) {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/appointments/`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.detail || "Failed to create appointment.",
        conflicts: data.conflicts || null,
      };
    }

    revalidatePath("/appointments");
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message === "UNAUTHORIZED" ? "You must be logged in." : "Network connection error.",
    };
  }
}
export async function moveAppointment(
  appointmentId: number,
  payload: {
    start_at: string;
    end_at: string;
    practitioner?: number | null;
    room?: number | null;
  }
) {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/move/`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.detail || "Failed to reschedule appointment.",
        conflicts: data.conflicts || null,
      };
    }

    revalidatePath("/appointments");
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message === "UNAUTHORIZED" ? "You must be logged in." : "Network connection error.",
    };
  }
}

export async function checkInAppointment(appointmentId: number) {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/check-in/`, {
      method: "POST",
      headers: {
        Authorization: auth,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.detail || "Failed to check in appointment.",
      };
    }

    revalidatePath("/appointments");
    revalidatePath("/patient-flow");
    revalidatePath("/check-ins");
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message === "UNAUTHORIZED" ? "You must be logged in." : "Network connection error.",
    };
  }
}

export async function cancelAppointment(appointmentId: number, cancelReason: string) {
  try {
    if (!cancelReason.trim()) {
      return { success: false, error: "A cancellation reason is required." };
    }

    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel/`, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_reason: cancelReason }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        error: data.detail || "Failed to cancel appointment.",
      };
    }

    revalidatePath("/appointments");
    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: err.message === "UNAUTHORIZED" ? "You must be logged in." : "Network connection error.",
    };
  }
}

export async function getPractitionerAvailabilitiesForDate(date: string) {
  try {
    const auth = await getAuthHeader();
    const response = await fetch(`${API_BASE_URL}/scheduling/board/?date=${encodeURIComponent(date)}&view_by=practitioners`, {
      method: "GET",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        columns: [],
        error: data.detail || "Failed to fetch availabilities.",
      };
    }

    return { success: true, columns: data.columns || [] };
  } catch (err: any) {
    return {
      success: false,
      columns: [],
      error: "Network connection error.",
    };
  }
}

export async function getAppointmentsRangeAction(
  startAt: string,
  endAt: string,
  filters: { practitioner?: number | string | null; room?: number | string | null } = {}
) {
  try {
    const auth = await getAuthHeader();
    const params = new URLSearchParams({
      start_at: startAt,
      end_at: endAt,
    });
    if (filters.practitioner) params.set("practitioner", String(filters.practitioner));
    if (filters.room) params.set("room", String(filters.room));

    const response = await fetch(`${API_BASE_URL}/scheduling/appointments/?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        appointments: [],
        error: data.detail || "Failed to load range appointments.",
      };
    }

    return { success: true, appointments: data.appointments || [] };
  } catch (err: any) {
    return {
      success: false,
      appointments: [],
      error: "Network connection error.",
    };
  }
}

export async function getAppointmentsHistoryAction(filters: {
  status?: string;
  start_at?: string;
  end_at?: string;
  practitioner?: string | number;
  patient?: string | number;
  page?: number;
} = {}) {
  try {
    const auth = await getAuthHeader();
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.start_at) params.set("start_at", filters.start_at);
    if (filters.end_at) params.set("end_at", filters.end_at);
    if (filters.practitioner) params.set("practitioner", String(filters.practitioner));
    if (filters.patient) params.set("patient", String(filters.patient));
    if (filters.page) params.set("page", String(filters.page));

    const response = await fetch(`${API_BASE_URL}/appointments/history/?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        success: false,
        results: [],
        count: 0,
        error: data.detail || "Failed to load appointment history.",
      };
    }

    if (Array.isArray(data)) {
      return { success: true, results: data, count: data.length };
    } else if (data && Array.isArray(data.results)) {
      return { success: true, results: data.results, count: data.count || data.results.length };
    } else {
      return { success: true, results: [], count: 0 };
    }
  } catch (err: any) {
    return {
      success: false,
      results: [],
      count: 0,
      error: "Network connection error.",
    };
  }
}

