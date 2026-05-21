"use client";

import { Activity, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { allowedForRole, navItems } from "@/lib/role-workflows";
import type { UserRole } from "@/lib/session";
import { cn } from "@/lib/utils";

function SidebarContent({ name, role, onNavigate }: { name: string; role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const nav = allowedForRole(navItems, role);

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
      <div className="mx-3 mb-3 rounded-lg bg-white/8 px-3 py-3">
        <div className="text-sm font-bold">{name}</div>
        <div className="mt-1 text-xs capitalize text-white/65">{role} workspace</div>
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

export function MobileSidebar({ name, role }: { name: string; role: UserRole }) {
  return (
    <Sheet>
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
        <SheetTrigger asChild>
          <Button size="icon" type="button" variant="secondary">
            <Menu size={21} />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
      </div>

      <SheetContent className="lg:hidden">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SheetClose className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
          <X size={18} />
          <span className="sr-only">Close menu</span>
        </SheetClose>
        <SidebarContent name={name} role={role} />
      </SheetContent>
    </Sheet>
  );
}
