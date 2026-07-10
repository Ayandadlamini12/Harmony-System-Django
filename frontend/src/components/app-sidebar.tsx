"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  LifeBuoy,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SupportTicketDialog } from "@/components/support-ticket-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAccountMenu } from "@/components/user-account-menu";
import { allowedForRole, navItems } from "@/lib/role-workflows";
import type { UserRole } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { NavigationSummary } from "@/types/clinic";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  clinician: "Clinician",
  receptionist: "Receptionist",
  supplier_contact: "Supplier contact",
  supplier_manager: "Supplier manager",
  partner_contact: "Partner contact",
  partner_manager: "Partner manager",
};

export function AppSidebar({
  children,
  avatarUrl,
  name,
  role,
  title,
  signedIn
}: {
  action?: React.ReactNode;
  avatarUrl?: string;
  children: React.ReactNode;
  name: string;
  role: UserRole;
  title: string;
  signedIn: boolean;
  signOut: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isPatientView = pathname.startsWith("/patients/") && pathname !== "/patients/new" && pathname !== "/patients/dashboard";

  useEffect(() => {
    if (isPatientView) {
      setCollapsed(true);
    } else {
      const saved = window.localStorage.getItem("harmony-sidebar-collapsed");
      setCollapsed(saved === "true");
    }
  }, [pathname, isPatientView]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      if (!isPatientView) {
        window.localStorage.setItem("harmony-sidebar-collapsed", String(!current));
      }
      return !current;
    });
  }

  return (
    <div className="min-h-screen bg-[#f7faf8]">
      <TopBar avatarUrl={avatarUrl} name={name} onToggle={toggleCollapsed} signedIn={signedIn} title={title} />
      <DesktopSidebar collapsed={collapsed} isPatientView={isPatientView} name={name} role={role} />
      <main className={cn(
        "min-w-0 transition-[margin] duration-200 lg:pt-16",
        (isPatientView && collapsed) ? "lg:ml-0" : (collapsed ? "lg:ml-[76px]" : "lg:ml-[260px]")
      )}>
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

function TopBar({
  avatarUrl,
  name,
  onToggle,
  signedIn,
  title
}: {
  avatarUrl?: string;
  name: string;
  onToggle: () => void;
  signedIn: boolean;
  title: string;
}) {
  const [summary, setSummary] = useState<NavigationSummary | null>(null);

  // Focus global search when pressing '/' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        searchInput?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Polling summary from /api/navigation/summary
  useEffect(() => {
    if (!signedIn) return;

    let timerId: NodeJS.Timeout | null = null;
    let isActive = true;
    let consecutiveErrors = 0;
    let pollingConfig = {
      defaultIntervalSeconds: 30,
      backgroundIntervalSeconds: 300,
    };

    async function fetchSummary() {
      try {
        const res = await fetch("/api/navigation/summary");
        if (!res.ok) {
          throw new Error("Failed to fetch summary");
        }
        const data: NavigationSummary = await res.json();
        if (isActive) {
          setSummary(data);
          consecutiveErrors = 0;
          pollingConfig = {
            defaultIntervalSeconds: data.polling?.default_interval_seconds || 30,
            backgroundIntervalSeconds: data.polling?.background_interval_seconds || 300,
          };
        }
      } catch (err) {
        console.error("Navigation summary fetch error:", err);
        if (isActive) {
          consecutiveErrors += 1;
        }
      }
    }

    function scheduleNext() {
      if (!isActive) return;

      const baseInterval = document.visibilityState === "hidden"
        ? pollingConfig.backgroundIntervalSeconds * 1000
        : pollingConfig.defaultIntervalSeconds * 1000;

      // Exponential backoff up to 5 minutes
      const errorBackoff = consecutiveErrors > 0 
        ? Math.min(Math.pow(2, consecutiveErrors) * 1000, 300000) 
        : 0;

      const finalDelay = baseInterval + errorBackoff;

      timerId = setTimeout(async () => {
        await fetchSummary();
        scheduleNext();
      }, finalDelay);
    }

    void fetchSummary().then(() => {
      scheduleNext();
    });

    const handleVisibilityChange = () => {
      if (timerId) {
        clearTimeout(timerId);
      }
      if (document.visibilityState === "visible") {
        void fetchSummary().then(() => {
          scheduleNext();
        });
      } else {
        scheduleNext();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isActive = false;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [signedIn]);

  const alertBadgeCount = summary ? (summary.counters.inbox_unread + summary.counters.mentions) : 0;

  return (
    <header className="fixed inset-x-0 top-0 z-30 hidden border-b border-[#63258d] bg-[var(--hh-purple)] text-white lg:block">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
        
        {/* Left Side: Workspace Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <Button className="shrink-0 text-white hover:bg-white/10" onClick={onToggle} size="icon" type="button" variant="ghost">
            <Menu size={22} />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          
          <Link href="/" className="flex min-w-0 items-center gap-2 font-bold shrink-0">
            <img alt="" className="h-7 w-7 rounded-md bg-white object-cover" src="/brand/harmony-icon-sm.webp" />
            <span className="hidden xl:inline">Harmony Health MIS</span>
          </Link>

          {summary && (
            <div className="hidden lg:flex items-center gap-1.5 border-l border-white/20 pl-3">
              <span className="rounded bg-white/12 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                {summary.workspace.label}
              </span>
              {summary.workspace.environment !== "Clinic Live" && (
                <span className="rounded border border-amber-400 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  {summary.workspace.environment}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center Side: Global Search */}
        <div className="hidden min-w-[280px] max-w-sm flex-1 items-center gap-2 rounded-lg bg-white/12 px-3 py-1.5 text-sm text-white/90 md:flex focus-within:bg-white/18 transition-all">
          <Search size={17} className="text-white/70 shrink-0" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Search patients, visits, appointments..."
            className="bg-transparent text-white placeholder-white/60 outline-none w-full text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const query = e.currentTarget.value;
                if (query.trim()) {
                  window.location.href = `/patients?search=${encodeURIComponent(query)}`;
                }
              }
            }}
          />
          <span className="shrink-0 text-[9px] bg-white/20 text-white/90 px-1.5 py-0.5 rounded font-mono font-bold">/</span>
        </div>

        {/* Right Side: Operational Indicators */}
        <div className="flex shrink-0 items-center gap-2">
          
          {/* Queue Pill */}
          {summary && (
            <Link
              href="/patient-flow/queue"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 transition-colors shrink-0"
              title={`${summary.counters.waiting_queue} patients in waiting list`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              Queue {summary.counters.waiting_queue}
            </Link>
          )}

          {/* Today Pill */}
          {summary && (
            <Link
              href="/appointments"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 px-3 py-1 text-xs font-bold text-blue-200 hover:bg-blue-500/25 transition-colors shrink-0"
              title={`${summary.counters.appointments_today} appointments scheduled today`}
            >
              Today {summary.counters.appointments_today}
            </Link>
          )}

          {/* Inbox dropdown replacing passive bell */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="relative text-white hover:bg-white/10 h-9 w-9 flex items-center justify-center rounded-lg"
                type="button"
              >
                <Bell size={19} />
                {alertBadgeCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-md">
                    {alertBadgeCount}
                  </span>
                )}
                <span className="sr-only">Notifications</span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 w-80 rounded-lg border border-[var(--hh-border)] bg-white p-2 text-[#24302b] shadow-xl max-h-[480px] overflow-y-auto"
                sideOffset={8}
              >
                <div className="border-b border-[var(--hh-border)] px-3 py-2 flex items-center justify-between">
                  <div className="text-sm font-bold text-[#24302b]">Alerts & Inbox</div>
                  {alertBadgeCount > 0 && (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800">
                      {alertBadgeCount} pending
                    </span>
                  )}
                </div>

                <div className="divide-y divide-[var(--hh-border)]">
                  {summary && summary.alerts.length > 0 ? (
                    ["messages", "appointments", "patient_flow", "system"].map((category) => {
                      const catAlerts = summary.alerts.filter(alert => alert.category === category);
                      if (catAlerts.length === 0) return null;

                      const categoryLabels: Record<string, string> = {
                        messages: "Messages & Mentions",
                        appointments: "Appointments",
                        patient_flow: "Patient Flow",
                        system: "System Events",
                      };

                      return (
                        <div key={category} className="py-2">
                          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {categoryLabels[category] || category}
                          </div>
                          {catAlerts.map((alert) => (
                            <DropdownMenu.Item key={alert.id} asChild>
                              <Link
                                href={alert.href || "#"}
                                className="flex flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-[#f7f0fb] focus:bg-[#f7f0fb] outline-none transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className={cn(
                                    "text-xs font-bold text-slate-800",
                                    alert.priority === "high" && "text-red-700"
                                  )}>
                                    {alert.label}
                                  </span>
                                  {alert.priority === "high" && (
                                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-800 tracking-wider">
                                      High
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 line-clamp-2">{alert.detail}</span>
                                <span className="text-[9px] text-slate-400">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </Link>
                            </DropdownMenu.Item>
                          ))}
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium">
                      No active alerts or notifications
                    </div>
                  )}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* System Health Indicator */}
          {summary && summary.system_health.visible ? (
            <div
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shrink-0 transition-colors border",
                summary.system_health.status === "ok" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/25 text-red-400 animate-pulse"
              )}
              title={`System: ${summary.system_health.status === "ok" ? "OK" : "Attention Needed"}`}
            >
              <span className={cn("h-2 w-2 rounded-full", summary.system_health.status === "ok" ? "bg-emerald-500" : "bg-red-500")} />
              System
            </div>
          ) : (
            <div className="w-0 shrink-0" />
          )}

          {/* User Menu */}
          {signedIn ? (
            <UserAccountMenu avatarUrl={avatarUrl} name={name} title={title} />
          ) : (
            <Link
              aria-label="Sign in"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[var(--hh-purple)] ring-1 ring-white/25 hover:bg-[#f7f0fb]"
              href="/login"
              title="Sign in"
            >
              <img alt="" className="h-9 w-9 rounded-md object-cover" src="/brand/harmony-icon-sm.webp" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}


function DesktopSidebar({ collapsed, isPatientView, name, role }: { collapsed: boolean; isPatientView: boolean; name: string; role: UserRole }) {
  const pathname = usePathname();
  const nav = allowedForRole(navItems, role);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <aside className={cn(
      "fixed bottom-0 left-0 top-16 z-20 hidden bg-[#f9fcfa] lg:block transition-all duration-200",
      (isPatientView && collapsed) ? "w-0 border-r-0 overflow-hidden pointer-events-none opacity-0" : "border-r border-[#c7d7cd] opacity-100",
      collapsed ? "w-[76px]" : "w-[260px]"
    )}>
      <div className={cn(
        "flex h-full flex-col transition-all duration-200",
        (isPatientView && collapsed) ? "w-0 overflow-hidden" : (collapsed ? "w-[76px]" : "w-[260px]")
      )}>
        <div className="border-b border-[#d7e3dc] bg-white/70 p-3">
          {!collapsed ? (
            <>
              <div className="text-xs font-bold uppercase text-[#66736d]">Workspace</div>
              <div className="mt-2 rounded-lg border border-[#c7d7cd] bg-gradient-to-br from-[#fbfdfc] to-[#f2fbf4] p-3 shadow-sm">
                <div className="font-bold text-[var(--hh-purple-dark)]">{roleLabels[role]} dashboard</div>
                <div className="mt-1 text-xs text-[#66736d]">{roleLabels[role]}-based navigation</div>
              </div>
            </>
          ) : (
            <div className="flex h-11 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
              <img alt="Harmony Health" className="h-9 w-9 rounded-md object-cover" src="/brand/harmony-icon-sm.webp" />
            </div>
          )}
        </div>

        <TooltipProvider delayDuration={150}>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3 pr-2 [scrollbar-gutter:stable]">
            {nav.map((item) => {
              const Icon = item.icon;
              const children = item.children ? allowedForRole(item.children, role) : [];
              const hasChildren = children.length > 0;
              const childActive = children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || childActive;
              const expanded = openGroups[item.href] ?? active;

              if (hasChildren) {
                return (
                  <div key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className={cn(
                            "w-full justify-start gap-3 border-l-4 border-l-transparent px-3 text-sm font-bold text-[#24302b] hover:bg-white hover:text-[var(--hh-purple)] hover:shadow-sm",
                            active && "border-l-[var(--hh-purple)] bg-white text-[var(--hh-purple)] shadow-sm",
                            collapsed && "justify-center px-0"
                          )}
                          onClick={() => setOpenGroups((current) => ({ ...current, [item.href]: !expanded }))}
                          type="button"
                          variant="ghost"
                        >
                          <Icon size={18} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} size={16} />
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>

                    {!collapsed && expanded && (
                      <div className="mt-1 grid gap-1 pl-8">
                        {children.map((child) => {
                          const ChildIcon = child.icon;
                          const childCurrent = pathname === child.href || pathname.startsWith(`${child.href}/`);
                          return (
                            <Button
                              key={child.href}
                              asChild
                              className={cn(
                                "w-full justify-start gap-2 border-l-4 border-l-transparent px-3 text-xs font-bold text-[#52615a] hover:bg-white hover:text-[var(--hh-purple)]",
                                childCurrent && "border-l-[var(--hh-purple)] bg-white text-[var(--hh-purple)] shadow-sm"
                              )}
                              variant="ghost"
                            >
                              <Link href={child.href}>
                                <ChildIcon size={15} />
                                <span>{child.label}</span>
                                {child.status === "planned" && <span className="ml-auto text-[10px] uppercase text-[#66736d]">Future</span>}
                              </Link>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      className={cn(
                        "w-full justify-start gap-3 border-l-4 border-l-transparent px-3 text-sm font-bold text-[#24302b] hover:bg-white hover:text-[var(--hh-purple)] hover:shadow-sm",
                        active && "border-l-[var(--hh-purple)] bg-white text-[var(--hh-purple)] shadow-sm",
                        collapsed && "justify-center px-0"
                      )}
                      variant="ghost"
                    >
                      <Link href={item.href}>
                        <Icon size={18} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>

        <div className="border-t border-[#d7e3dc] bg-white/70 p-3 space-y-1.5">
          {role === "admin" ? (
            <>
              <Button
                asChild
                className={cn(
                  "w-full justify-start gap-3 text-sm font-bold border rounded-lg transition-all",
                  "bg-[#f2fbf4] hover:bg-[#e6f7e9] text-[#225c2c] border-[#cce4d1]",
                  collapsed ? "justify-center p-2" : "p-2.5",
                  pathname === "/administration/support-tickets" && "bg-[#e6f7e9] border-[#a3d4ac] shadow-sm"
                )}
                variant="ghost"
              >
                <Link href="/administration/support-tickets" title={collapsed ? "Support Tickets" : undefined}>
                  <LifeBuoy size={18} className="shrink-0" />
                  {!collapsed && <span>Support Tickets</span>}
                </Link>
              </Button>

              <Button
                asChild
                className={cn(
                  "w-full justify-start gap-3 text-sm font-bold border rounded-lg transition-all",
                  "bg-[#f2fbf4] hover:bg-[#e6f7e9] text-[#225c2c] border-[#cce4d1]",
                  collapsed ? "justify-center p-2" : "p-2.5",
                  pathname === "/administration/deleted-patients" && "bg-[#e6f7e9] border-[#a3d4ac] shadow-sm"
                )}
                variant="ghost"
              >
                <Link href="/administration/deleted-patients" title={collapsed ? "Deleted Patients" : undefined}>
                  <Trash2 size={18} className="shrink-0" />
                  {!collapsed && <span>Deleted Patients</span>}
                </Link>
              </Button>
            </>
          ) : (
            <SupportTicketDialog
              trigger={
                <Button
                  className={cn(
                    "w-full justify-start gap-3 text-sm font-bold border rounded-lg transition-all",
                    "bg-[#f2fbf4] hover:bg-[#e6f7e9] text-[#225c2c] border-[#cce4d1]",
                    collapsed ? "justify-center p-2" : "p-2.5"
                  )}
                  variant="ghost"
                  type="button"
                >
                  <LifeBuoy size={18} className="shrink-0" />
                  {!collapsed && <span>Contact Support</span>}
                </Button>
              }
            />
          )}

          {!collapsed && <div className="mt-2 truncate px-3 text-xs text-[#66736d] font-semibold">{name}</div>}
        </div>
      </div>
    </aside>
  );
}
