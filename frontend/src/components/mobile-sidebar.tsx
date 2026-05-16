"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Activity, ClipboardList, HeartPulse, LayoutDashboard, Menu, Search, UserPlus, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Search },
  { href: "/patients/new", label: "Register", icon: UserPlus },
  { href: "/visits", label: "Visits", icon: ClipboardList },
  { href: "/visits/new", label: "Add Visit", icon: HeartPulse },
  { href: "/staff", label: "Staff", icon: Users }
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-[var(--hh-purple-dark)] text-white">
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12">
          <Activity size={22} />
        </div>
        <div>
          <div className="font-bold">Harmony Health</div>
          <div className="text-xs text-white/70">Clinic system</div>
        </div>
      </div>
      <nav className="grid gap-1 px-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/82 transition-colors hover:bg-white/10",
                active && "bg-white/14 text-white"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileSidebar() {
  return (
    <Dialog.Root>
      <div className="flex h-16 items-center justify-between border-b border-[var(--hh-border)] bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--hh-purple)] text-white">
            <Activity size={22} />
          </div>
          <div>
            <div className="font-bold">Harmony Health</div>
            <div className="text-xs text-[#66736d]">Clinic system</div>
          </div>
        </div>
        <Dialog.Trigger className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--hh-border)] bg-white text-[var(--hh-text)]">
          <Menu size={21} />
          <span className="sr-only">Open menu</span>
        </Dialog.Trigger>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(84vw,320px)] shadow-2xl outline-none lg:hidden">
          <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
          <Dialog.Close className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
            <X size={18} />
            <span className="sr-only">Close menu</span>
          </Dialog.Close>
          <SidebarContent />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
