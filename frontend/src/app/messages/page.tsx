import { Mail, MessageCircle, Send } from "lucide-react";

import { AppShell } from "@/components/app-shell";

const channels = [
  ["Internal", "Clinic staff messages and handoffs.", MessageCircle],
  ["Email", "Convert a message into an email draft later.", Mail],
  ["WhatsApp / Telegram", "External messaging connectors will be configured after the core record workflow.", Send]
] as const;

export default function MessagesPage() {
  return (
    <AppShell title="Messages">
      <section className="grid gap-4 lg:grid-cols-3">
        {channels.map(([title, description, Icon]) => (
          <div key={title} className="hh-panel p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f5edfa] text-[var(--hh-purple)]">
              <Icon size={22} />
            </div>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#66736d]">{description}</p>
          </div>
        ))}
      </section>
      <div className="mt-6 hh-panel p-5">
        <h2 className="font-bold">Internal chat foundation</h2>
        <p className="mt-2 text-sm leading-6 text-[#66736d]">
          This route is ready for the inbuilt chat model. We will add threads, participants, attachments, and external-send actions once patient and access workflows are stable.
        </p>
      </div>
    </AppShell>
  );
}
