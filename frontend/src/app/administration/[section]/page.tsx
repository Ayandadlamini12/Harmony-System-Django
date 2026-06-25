import {
  Activity,
  Archive,
  DatabaseBackup,
  FileText,
  KeyRound,
  MapPinned,
  Palette,
  Plug,
  ShieldAlert,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { AdminAuditLogsViewer } from "@/components/admin-audit-logs-viewer";
import { AdminApiTokensViewer } from "@/components/admin-api-tokens-viewer";

type SectionConfig = {
  title: string;
  description: string;
  icon: LucideIcon;
  focus: string[];
};

const sections: Record<string, SectionConfig> = {
  locations: {
    title: "Location Settings",
    description: "Manage clinic locations, coordinate access rules, and location-based availability.",
    icon: MapPinned,
    focus: [
      "Clinic branches and service locations",
      "Coordinate zones where the app can be accessed",
      "Allowed location exceptions for approved roles",
      "Location audit logs for sensitive workflows"
    ]
  },
  devices: {
    title: "Devices & Accessibility",
    description: "Review device access, browser logs, trusted devices, and accessibility controls.",
    icon: Activity,
    focus: [
      "Known devices and browser fingerprints",
      "Trusted, blocked, and pending devices",
      "Device access history by user",
      "Accessibility preferences and device policy"
    ]
  },
  maintenance: {
    title: "Maintenance Mode",
    description: "Schedule maintenance windows and control user-facing maintenance notifications.",
    icon: Wrench,
    focus: [
      "Maintenance mode on/off control",
      "Scheduled downtime notices",
      "Module-level maintenance restrictions",
      "Notification messages sent before maintenance"
    ]
  },
  "api-tokens": {
    title: "API / Tokens",
    description: "Manage server-to-server tokens for n8n, Telegram, WhatsApp, and future integrations.",
    icon: KeyRound,
    focus: [
      "Scoped API tokens and expiry dates",
      "Webhook secrets and token rotation",
      "Integration permissions by data area",
      "Revocation and access audit history"
    ]
  },
  security: {
    title: "Security & Sessions",
    description: "Configure session rules, identity provider controls, and future Keycloak policy mapping.",
    icon: ShieldAlert,
    focus: [
      "Keycloak realm and client configuration",
      "Session timeout and logout rules",
      "Password and MFA policy references",
      "Role and permission enforcement checks"
    ]
  },
  "audit-logs": {
    title: "Audit Logs",
    description: "Review traceability records for user actions, clinical access, approvals, and data changes.",
    icon: FileText,
    focus: [
      "Create, update, delete, and approval actions",
      "Sensitive patient record access",
      "Exportable audit reports",
      "Before/after data change history"
    ]
  },
  integrations: {
    title: "Integrations",
    description: "Centralize external workflow and communication integrations connected to Harmony MIS.",
    icon: Plug,
    focus: [
      "n8n workflow connection status",
      "Telegram and WhatsApp workflow channels",
      "Brevo email integration",
      "Future AI document scanning workflows"
    ]
  },
  backup: {
    title: "Backup & Restore",
    description: "Track backup status, restore readiness, and retention checks for system data.",
    icon: DatabaseBackup,
    focus: [
      "Database backup status",
      "Patient document backup verification",
      "Restore point history",
      "Backup failure alerts"
    ]
  },
  "data-retention": {
    title: "Data Retention",
    description: "Define retention rules for consent forms, documents, audit logs, and inactive records.",
    icon: Archive,
    focus: [
      "Consent validity and renewal rules",
      "Document archive policy",
      "Audit log retention periods",
      "Inactive patient record handling"
    ]
  },
  branding: {
    title: "Branding",
    description: "Manage organization identity used across the app, PDFs, reports, and generated documents.",
    icon: Palette,
    focus: [
      "Logo and favicon assets",
      "Document stamp and letterhead",
      "PDF/report visual standards",
      "System display name and brand colors"
    ]
  },
  "system-health": {
    title: "System Health",
    description: "Monitor app services, background jobs, queues, and integration health checks.",
    icon: Activity,
    focus: [
      "Backend, frontend, database, Redis, and tunnel health",
      "Celery worker and beat status",
      "Failed background jobs",
      "Integration availability checks"
    ]
  }
};

export default async function AdministrationSectionPage({
  params
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = sections[section];
  if (!config) notFound();

  const Icon = config.icon;

  return (
    <AppShell title={config.title}>
      <section className="hh-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <Icon className="text-[var(--hh-purple)]" size={22} />
              <h2 className="font-bold">{config.title}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">{config.description}</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/administration/settings">Email settings</Link>
          </Button>
        </div>

        {section === "audit-logs" ? (
          <div className="mt-6">
            <AdminAuditLogsViewer />
          </div>
        ) : section === "api-tokens" ? (
          <div className="mt-6">
            <AdminApiTokensViewer />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {config.focus.map((item) => (
              <div key={item} className="rounded-lg border border-[var(--hh-border-strong)] bg-[#f7faf8] px-4 py-3 text-sm font-semibold text-[#24302b]">
                {item}
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
