import {
  Archive,
  CalendarCheck,
  ClipboardCheck,
  ListChecks,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  Package,
  FileText,
  HeartPulse,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  UserRoundCog,
  UserPlus,
  type LucideIcon
} from "lucide-react";

import type { UserRole } from "@/lib/session";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  status?: "ready" | "planned";
  children?: NavItem[];
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
  {
    href: "/patients",
    label: "Patients",
    icon: Users,
    roles: ["admin", "clinician", "receptionist"],
    children: [
      { href: "/patients/new", label: "Add Patient", icon: UserPlus, roles: ["admin", "receptionist"] },
      { href: "/patients", label: "Patient List", icon: Users, roles: ["admin", "clinician", "receptionist"] },
      { href: "/visits/new", label: "Add Visit", icon: Stethoscope, roles: ["admin", "clinician"] },
      { href: "/check-ins", label: "Check-In", icon: ClipboardCheck, roles: ["admin", "receptionist"] },
      { href: "/patient-flow", label: "Track Patient Flow", icon: ListChecks, roles: ["admin", "clinician", "receptionist"] },
      { href: "/vitals/new", label: "Add Vitals", icon: HeartPulse, roles: ["admin", "clinician"] },
      { href: "/messages", label: "Send Message", icon: MessageSquare, roles: ["admin", "clinician", "receptionist"], status: "planned" }
    ]
  },
  { href: "/consent-forms", label: "Consent Forms", icon: FileText, roles: ["admin", "clinician", "receptionist"] },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck, roles: ["admin", "clinician", "receptionist"] },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, roles: ["admin", "clinician"] },
  { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["admin", "clinician", "receptionist"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "clinician"] },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "clinician"] },
  {
    href: "/users",
    label: "User Management",
    icon: UserRoundCog,
    roles: ["admin"],
    children: [
      { href: "/employees/enrollment", label: "Employee Enrollment", icon: UserPlus, roles: ["admin"], status: "planned" },
      { href: "/users/enrol", label: "Enrol User", icon: UserRoundCog, roles: ["admin"] },
      { href: "/users", label: "Users", icon: Users, roles: ["admin"] },
      { href: "/roles", label: "Roles", icon: ShieldCheck, roles: ["admin"], status: "planned" },
      { href: "/teams", label: "Teams", icon: Users, roles: ["admin"], status: "planned" }
    ]
  },
  { href: "/account", label: "Settings", icon: Settings, roles: ["admin", "clinician", "receptionist"] }
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
    roles: ["admin", "clinician"]
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
    title: "Consent Forms",
    description: "Patients awaiting consent signature or requiring renewal.",
    href: "/consent-forms",
    icon: FileText,
    roles: ["admin", "clinician", "receptionist"]
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
    title: "Patient flow tracking",
    description: "Search by phone, patient ID, or identity number to see where a patient is in today's establishment flow.",
    href: "/patient-flow",
    icon: ListChecks,
    roles: ["admin", "clinician", "receptionist"]
  },
  {
    title: "Check-in desk",
    description: "Mark arrivals from reception or open the mounted tablet self check-in screen.",
    href: "/check-ins",
    icon: ClipboardCheck,
    roles: ["admin", "receptionist"]
  }
];

export function allowedForRole<T extends { roles: UserRole[] }>(items: T[], role: UserRole) {
  return items.filter((item) => item.roles.includes(role));
}
