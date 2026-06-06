import {
  Activity,
  Archive,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  DatabaseBackup,
  KeyRound,
  ListChecks,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  MapPinned,
  MessageSquare,
  Package,
  FileText,
  HeartPulse,
  Plug,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  Users,
  UserRoundCog,
  UserPlus,
  Wrench,
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

const allRoles: UserRole[] = ["admin", "clinician", "receptionist", "supplier_contact", "supplier_manager", "partner_contact", "partner_manager"];

export const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: allRoles },
  {
    href: "/patients",
    label: "Patients",
    icon: Users,
    roles: ["admin", "clinician", "receptionist"],
    children: [
      { href: "/patients/new", label: "Add Patient", icon: UserPlus, roles: ["admin", "receptionist"] },
      { href: "/patients", label: "Patient List", icon: Users, roles: ["admin", "clinician", "receptionist"] },
      { href: "/check-ins", label: "Check-In", icon: ClipboardCheck, roles: ["admin", "receptionist"] },
      { href: "/patient-flow", label: "Track Patient Flow", icon: ListChecks, roles: ["admin", "clinician", "receptionist"] },
      { href: "/vitals/new", label: "Add Vitals", icon: HeartPulse, roles: ["admin", "clinician"] },
      { href: "/messages", label: "Send Message", icon: MessageSquare, roles: ["admin", "clinician", "receptionist"] }
    ]
  },
  { href: "/consent-forms", label: "Consent Forms", icon: FileText, roles: ["admin", "clinician", "receptionist"] },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck, roles: ["admin", "clinician", "receptionist"] },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, roles: ["admin", "clinician"] },
  { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["admin", "clinician", "receptionist"] },
  { href: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "clinician"] },
  { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "clinician"] },
  { href: "/partner-companies", label: "Partner Companies", icon: Building2, roles: ["admin", "clinician", "receptionist"] },
  {
    href: "/users",
    label: "User Management",
    icon: UserRoundCog,
    roles: ["admin"],
    children: [
      { href: "/employees/enrollment", label: "Employee Onboarding", icon: UserPlus, roles: ["admin"] },
      { href: "/users/enrol", label: "Create Login Account", icon: UserRoundCog, roles: ["admin"] },
      { href: "/users", label: "User Directory", icon: Users, roles: ["admin"] },
      { href: "/roles", label: "Roles & Permissions", icon: ShieldCheck, roles: ["admin"] },
      { href: "/teams", label: "Teams & Departments", icon: Users, roles: ["admin"] }
    ]
  },
  {
    href: "/administration/settings",
    label: "System Settings",
    icon: Settings,
    roles: ["admin"],
    children: [
      { href: "/administration/settings", label: "Email & Notifications", icon: MessageSquare, roles: ["admin"] },
      { href: "/administration/locations", label: "Location Settings", icon: MapPinned, roles: ["admin"] },
      { href: "/administration/devices", label: "Devices & Accessibility", icon: Activity, roles: ["admin"] },
      { href: "/administration/maintenance", label: "Maintenance Mode", icon: Wrench, roles: ["admin"] },
      { href: "/administration/api-tokens", label: "API / Tokens", icon: KeyRound, roles: ["admin"] },
      { href: "/administration/security", label: "Security & Sessions", icon: ShieldAlert, roles: ["admin"] },
      { href: "/administration/audit-logs", label: "Audit Logs", icon: FileText, roles: ["admin"] },
      { href: "/administration/integrations", label: "Integrations", icon: Plug, roles: ["admin"] },
      { href: "/administration/backup", label: "Backup & Restore", icon: DatabaseBackup, roles: ["admin"] },
      { href: "/administration/data-retention", label: "Data Retention", icon: Archive, roles: ["admin"] },
      { href: "/administration/branding", label: "Branding", icon: Settings, roles: ["admin"] },
      { href: "/administration/system-health", label: "System Health", icon: Activity, roles: ["admin"] }
    ]
  },
  { href: "/account", label: "Settings", icon: Settings, roles: allRoles }
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
