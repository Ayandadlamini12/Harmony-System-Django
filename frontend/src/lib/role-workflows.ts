import {
  Archive,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon
} from "lucide-react";

import type { UserRole } from "@/lib/session";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  status?: "ready" | "planned";
};

export type WorkflowCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  status?: "ready" | "planned";
};

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "clinician", "receptionist"] },
  { href: "/patients/dashboard", label: "Patient Hub", icon: Users, roles: ["admin", "clinician", "receptionist"] },
  { href: "/patients", label: "Patient Records", icon: Search, roles: ["admin", "clinician", "receptionist"] },
  { href: "/patients/new", label: "Register Patient", icon: UserPlus, roles: ["admin", "receptionist"] },
  { href: "/visits", label: "Visit Records", icon: ClipboardList, roles: ["admin", "clinician"] },
  { href: "/visits/new", label: "Add Visit", icon: HeartPulse, roles: ["admin", "clinician"] },
  { href: "/staff", label: "Staff", icon: UserCog, roles: ["admin"] },
  { href: "/account", label: "Account", icon: Settings, roles: ["admin", "clinician", "receptionist"] }
];

export const workflowCards: WorkflowCard[] = [
  {
    title: "Patient management",
    description: "Search, register, update demographic records, and open patient workspaces.",
    href: "/patients/dashboard",
    icon: Users,
    roles: ["admin", "clinician", "receptionist"]
  },
  {
    title: "Waiting list",
    description: "Patients who have arrived and are waiting to be seen by a clinician.",
    href: "/waiting-list",
    icon: Inbox,
    roles: ["admin", "clinician"],
    status: "planned"
  },
  {
    title: "Approvals",
    description: "Authorize receptionist requests for elevated access to confidential records.",
    href: "/approvals",
    icon: ShieldCheck,
    roles: ["admin", "clinician"],
    status: "planned"
  },
  {
    title: "Appointments",
    description: "Review booked appointments and check in patients who have arrived.",
    href: "/appointments",
    icon: CalendarCheck,
    roles: ["admin", "clinician", "receptionist"],
    status: "planned"
  },
  {
    title: "Messages",
    description: "Internal chat foundation with future email, WhatsApp, and Telegram actions.",
    href: "/messages",
    icon: MessageSquare,
    roles: ["admin", "clinician", "receptionist"],
    status: "planned"
  },
  {
    title: "Inventory",
    description: "Open inventory management for remedies, supplies, stock movement, and reorder alerts.",
    href: "/inventory",
    icon: Package,
    roles: ["admin", "clinician"],
    status: "planned"
  },
  {
    title: "Clinical records",
    description: "Confidential visits, vitals, diagnosis, remedies, and follow-up evaluations.",
    href: "/visits",
    icon: Stethoscope,
    roles: ["admin", "clinician"]
  },
  {
    title: "Access requests",
    description: "Request temporary elevated access when non-clinical staff need medical context.",
    href: "/access-requests",
    icon: LockKeyhole,
    roles: ["receptionist"],
    status: "planned"
  },
  {
    title: "Reports",
    description: "Operational reporting, exports, patient activity, visit trends, and inventory reports.",
    href: "/reports",
    icon: Archive,
    roles: ["admin", "clinician"],
    status: "planned"
  },
  {
    title: "Check-in desk",
    description: "Mark arrivals, update demographic details, and move patients into the waiting list.",
    href: "/check-ins",
    icon: ClipboardCheck,
    roles: ["admin", "receptionist"],
    status: "planned"
  }
];

export function allowedForRole<T extends { roles: UserRole[] }>(items: T[], role: UserRole) {
  return items.filter((item) => item.roles.includes(role));
}
