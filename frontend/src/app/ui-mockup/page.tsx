import {
  Activity,
  Bell,
  CalendarCheck,
  Check,
  ChevronDown,
  ClipboardList,
  Eye,
  FileText,
  HeartPulse,
  Home,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Printer,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  X
} from "lucide-react";

const navItems = [
  ["Dashboard", LayoutDashboard],
  ["Patients", Users],
  ["Visits", Stethoscope],
  ["Appointments", CalendarCheck],
  ["Approvals", ShieldCheck],
  ["Messages", MessageSquare],
  ["Inventory", Package],
  ["Reports", FileText],
  ["Settings", Settings]
] as const;

const dashboardActions = [
  ["Waiting list", "8 checked in", "Patients ready for clinician review", UserCheck, "purple"],
  ["Approvals", "3 pending", "Elevated access requests from front desk", ShieldCheck, "amber"],
  ["Appointments", "14 today", "Booked visits and follow-up reviews", CalendarCheck, "green"],
  ["Messages", "6 unread", "Internal staff messages and patient follow-ups", MessageSquare, "neutral"]
] as const;

const clinicQueue = [
  ["10:20", "Zahara Dlamini", "Follow-up", "Ready"],
  ["10:45", "Mandla Nkosi", "New consultation", "Vitals pending"],
  ["11:10", "Anele Maseko", "Remedy review", "Waiting"],
  ["11:40", "Sibongile Dube", "Follow-up", "Waiting"]
] as const;

const tabs = [
  "Overview",
  "Complaints",
  "Assessments",
  "Diagnosis",
  "Remedies",
  "Vitals",
  "Follow-ups",
  "Documents",
  "Notes"
];

const timeline = [
  ["Today", "Follow-up visit", "Headache reduced; sleep improved. Continue review in 14 days."],
  ["May 10", "New consultation", "Chronic sinus symptoms, fatigue, and stress-related sleep disturbance."],
  ["Apr 22", "Phone check-in", "Patient reported improved energy after lifestyle adjustments."]
] as const;

const confidentialConditionRows = [
  ["Epilepsy", false],
  ["Mental disorders", false],
  ["Tuberculosis", false],
  ["Injuries", true],
  ["Gynecological diseases", false],
  ["Musculoskeletal diseases", true],
  ["Digestive diseases", false],
  ["Cancer", false],
  ["Headache", true],
  ["Neurological", false],
  ["Urinary", false],
  ["Cardiovascular disease", false],
  ["Liver", false],
  ["Skin", true],
  ["Vascular", false],
  ["Chronic respiratory", false],
  ["Stroke", false],
  ["STIs", false],
  ["Influenza", false],
  ["Enteric disease", false],
  ["Maternal and neonatal disorders", false]
] as const;

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "purple" | "neutral" }) {
  const tones = {
    green: "border-green-200 bg-green-50 text-green-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    purple: "border-[#e7d7ef] bg-[#f7f0fb] text-[var(--hh-purple)]",
    neutral: "border-slate-200 bg-slate-50 text-slate-700"
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>{children}</span>;
}

export default function UiMockupPage() {
  return (
    <main className="min-h-screen bg-[#eef3f0] text-[#1f2933]">
      <div className="mx-auto min-h-screen max-w-[1540px] bg-white shadow-xl">
        <TopBar />
        <div className="grid lg:grid-cols-[248px_1fr]">
          <Sidebar />
          <div className="min-w-0 bg-[#f7faf8]">
            <MainDashboard />
            <PatientWorkspace />
          </div>
        </div>
      </div>
    </main>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#dfe7e2] bg-[var(--hh-purple)] text-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-4">
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity size={20} />
            Harmony Health MIS
          </div>
        </div>
        <div className="hidden min-w-[320px] items-center gap-2 rounded-lg bg-white/12 px-3 py-2 text-sm text-white/90 md:flex">
          <Search size={17} />
          Search patients, visits, appointments
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10">
            <Bell size={19} />
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/12 px-3 text-sm font-bold hover:bg-white/20">
            Dr. Maseko
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="hidden border-r border-[#dfe7e2] bg-white lg:block">
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col">
        <div className="border-b border-[#eef2ef] p-4">
          <div className="text-xs font-bold uppercase text-[#66736d]">Workspace</div>
          <div className="mt-2 rounded-lg border border-[#dfe7e2] bg-[#f7faf8] p-3">
            <div className="font-bold text-[var(--hh-purple-dark)]">Clinician dashboard</div>
            <div className="mt-1 text-xs text-[#66736d]">Role-based navigation</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(([label, Icon]) => (
            <a
              key={label}
              href={label === "Patients" ? "#patient-workspace" : "#main-dashboard"}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold ${
                label === "Dashboard"
                  ? "bg-[#f7f0fb] text-[var(--hh-purple)]"
                  : "text-[#3f4d47] hover:bg-[#f7faf8] hover:text-[var(--hh-purple)]"
              }`}
            >
              <Icon size={18} />
              {label}
            </a>
          ))}
        </nav>
        <div className="border-t border-[#eef2ef] p-3">
          <a href="#main-dashboard" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#3f4d47] hover:bg-[#f7faf8]">
            <UserCog size={18} />
            Profile & account
          </a>
        </div>
      </div>
    </aside>
  );
}

function MainDashboard() {
  return (
    <section id="main-dashboard" className="border-b border-[#dfe7e2] p-4 sm:p-6">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--hh-green-dark)]">Main dashboard proposal</div>
          <h1 className="mt-1 text-2xl font-bold text-[var(--hh-purple-dark)]">Clinician workspace</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#53605a]">
            A role-based landing page for daily operations: queue, approvals, appointments, messages, and quick patient access.
          </p>
        </div>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--hh-purple)] px-4 text-sm font-bold text-white hover:bg-[var(--hh-purple-dark)]">
          <Plus size={16} />
          New patient visit
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardActions.map(([title, value, description, Icon, tone]) => (
          <ActionCard key={title} title={title} value={value} description={description} icon={<Icon size={20} />} tone={tone} />
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Today queue" icon={<ClipboardList size={17} />}>
          <div className="overflow-hidden rounded-lg border border-[#eef2ef]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#f7faf8] text-xs uppercase text-[#66736d]">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Patient</th>
                  <th className="px-3 py-3">Visit type</th>
                  <th className="px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef2ef]">
                {clinicQueue.map(([time, patient, type, status]) => (
                  <tr key={`${time}-${patient}`} className="bg-white">
                    <td className="px-3 py-3 font-bold text-[#53605a]">{time}</td>
                    <td className="px-3 py-3 font-bold text-[#1f2933]">{patient}</td>
                    <td className="px-3 py-3 text-[#53605a]">{type}</td>
                    <td className="px-3 py-3">
                      <Badge tone={status === "Ready" ? "green" : status === "Vitals pending" ? "amber" : "neutral"}>{status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Operational shortcuts" icon={<LayoutDashboard size={17} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Patient search", "Request approval", "Open reports", "Inventory dashboard", "Visit templates", "Account settings"].map((item) => (
              <button
                key={item}
                className="min-h-12 rounded-lg border border-[#dfe7e2] bg-white px-3 text-left text-sm font-bold text-[#2f3b36] hover:border-[#cdb4de] hover:bg-[#f7f0fb] hover:text-[var(--hh-purple)]"
              >
                {item}
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function PatientWorkspace() {
  return (
    <section id="patient-workspace" className="bg-[#f7faf8]">
      <div className="border-b border-[#dfe7e2] bg-white px-4 py-4 sm:px-6">
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--hh-green-dark)]">Patient workspace proposal</div>
          <h2 className="mt-1 text-2xl font-bold text-[var(--hh-purple-dark)]">Patient clinical workspace</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
              <UserRound size={42} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-bold text-[var(--hh-purple-dark)]">Zahara Dlamini</h3>
                <span className="font-mono text-sm font-bold text-[#66736d]">PAT-2026-000184</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#53605a]">
                <span>Female</span>
                <span>22 years</span>
                <span>+268 7600 1840</span>
                <span>Mbabane</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="green">Active patient</Badge>
                <Badge tone="purple">Clinician access active</Badge>
                <Badge tone="amber">Follow-up due in 7 days</Badge>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-[#dfe7e2] bg-[#f7faf8]">
            <div className="flex items-center justify-between border-b border-[#dfe7e2] px-4 py-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ClipboardList size={17} />
                Key notes
              </div>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-white">
                <Pencil size={15} />
              </button>
            </div>
            <p className="px-4 py-3 text-sm leading-6 text-[#3f4d47]">
              Patient reports better sleep and less sinus pressure. Review remedy response and update lifestyle plan.
            </p>
          </aside>
        </div>
      </div>

      <div className="sticky top-16 z-20 border-b border-[#dfe7e2] bg-white px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`min-h-12 shrink-0 border-b-2 px-3 text-sm font-semibold ${
                tab === "Overview"
                  ? "border-[var(--hh-purple)] text-[var(--hh-purple)]"
                  : "border-transparent text-[#3f4d47] hover:border-[#dfe7e2] hover:text-[#111827]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#dfe7e2] bg-white px-4 py-3 sm:px-6">
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--hh-purple)] px-4 text-sm font-bold text-white hover:bg-[var(--hh-purple-dark)]">
          <HeartPulse size={16} />
          New visit note
        </button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe7e2] bg-white px-4 text-sm font-bold text-[#2f3b36] hover:bg-[#f7faf8]">
          <Printer size={16} />
          Print summary
        </button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe7e2] bg-white px-4 text-sm font-bold text-[#2f3b36] hover:bg-[#f7faf8]">
          <CalendarCheck size={16} />
          Book follow-up
        </button>
        <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#dfe7e2] bg-white px-4 text-sm font-bold text-[#2f3b36] hover:bg-[#f7faf8]">
          <LockKeyhole size={16} />
          Access log
        </button>
      </div>

      <div className="grid gap-5 p-4 sm:p-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-5">
          <Panel title="Patient details" icon={<UserRound size={17} />}>
            <InfoGrid
              rows={[
                ["Patient code", "PAT-2026-000184"],
                ["Date of birth", "May 20, 2004"],
                ["Primary phone", "+268 7600 1840"],
                ["Locality", "Mbabane"],
                ["Primary contact", "Mother - Nokuthula"],
                ["Status", "Active"]
              ]}
            />
          </Panel>

          <Panel title="Homeopathy profile" icon={<Home size={17} />}>
            <InfoGrid
              rows={[
                ["Constitution", "Sensitive to cold, restless sleep"],
                ["Thermal state", "Chilly"],
                ["Food modalities", "Worse after dairy"],
                ["Sleep", "Wakes around 03:00"],
                ["Stress pattern", "Symptoms worse before exams"],
                ["Current remedy", "Pulsatilla 30C"]
              ]}
            />
          </Panel>

          <Panel title="Latest vitals" icon={<HeartPulse size={17} />}>
            <InfoGrid
              rows={[
                ["Blood pressure", "118 / 76"],
                ["Pulse", "74 bpm"],
                ["Temperature", "36.8 C"],
                ["Weight", "58.4 kg"],
                ["Respiration", "16 / min"],
                ["Recorded", "Today 10:22"]
              ]}
            />
          </Panel>

          <Panel title="Confidential records" icon={<LockKeyhole size={17} />}>
            <div className="space-y-4">
              <div className="rounded-lg border border-[#e7d7ef] bg-[#f7f0fb] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-bold text-[var(--hh-purple-dark)]">Protected clinical information</div>
                    <p className="mt-1 text-sm leading-6 text-[#53605a]">
                      Sickness records, sensitive diagnosis notes, HIV status, and protected disclosures require elevated clinician authentication.
                    </p>
                  </div>
                  <button className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--hh-purple)] px-4 text-sm font-bold text-white hover:bg-[var(--hh-purple-dark)]">
                    <Eye size={16} />
                    View records
                  </button>
                </div>
              </div>
              <div className="rounded-lg border border-[#d8c0e8] bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase text-[var(--hh-purple)]">Confidential HIV status</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600">Reactive</span>
                      <span className="rounded-full border border-[#bde5c4] bg-[var(--hh-green-light)] px-3 py-1 text-sm font-bold text-[var(--hh-green-dark)]">
                        Non-reactive
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-bold text-slate-600">Unknown</span>
                    </div>
                  </div>
                  <span className="inline-flex min-h-9 items-center rounded-full border border-[#d8c0e8] bg-[#f7f0fb] px-3 text-xs font-bold uppercase text-[var(--hh-purple)]">
                    Clinician access only
                  </span>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {confidentialConditionRows.map(([label, present]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-[#dfe7e2] bg-white px-3 py-2">
                    <span className="text-sm font-semibold">{label}</span>
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        present ? "bg-[var(--hh-green)] text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {present ? <Check size={17} /> : <X size={17} />}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-[#dfe7e2] bg-white p-3 text-sm text-[#53605a]">
                Access audit: every confidential-record view is logged after clinician password verification.
              </div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-5">
          <Panel title="History of present complaint" icon={<FileText size={17} />} action>
            <div className="space-y-4 text-sm leading-6 text-[#3f4d47]">
              <p>
                Chronic sinus pressure with intermittent frontal headaches. Symptoms worse in the morning and during exam stress. Patient reports nasal congestion, fatigue, and disturbed sleep.
              </p>
              <p>
                Previous allopathic medication gave temporary relief. No current emergency symptoms. Appetite normal. Energy improved after reducing dairy and increasing water intake.
              </p>
            </div>
          </Panel>

          <Panel title="Clinical assessment" icon={<Stethoscope size={17} />} action>
            <InfoGrid
              rows={[
                ["Main complaint", "Sinus pressure and headache"],
                ["Assessment", "Recurrent sinus symptoms with stress aggravation"],
                ["Diagnosis note", "Monitor response to remedy and lifestyle plan"],
                ["Plan", "Review in 14 days or earlier if symptoms worsen"]
              ]}
            />
          </Panel>

          <Panel title="Visit timeline" icon={<ClipboardList size={17} />}>
            <div className="divide-y divide-[#eef2ef]">
              {timeline.map(([date, title, note]) => (
                <div key={`${date}-${title}`} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[90px_1fr]">
                  <div className="text-xs font-bold uppercase text-[#66736d]">{date}</div>
                  <div>
                    <div className="font-bold">{title}</div>
                    <p className="mt-1 text-sm leading-6 text-[#53605a]">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function ActionCard({
  title,
  value,
  description,
  icon,
  tone
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  tone: string;
}) {
  const tones: Record<string, string> = {
    purple: "bg-[#f7f0fb] text-[var(--hh-purple)]",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]",
    neutral: "bg-slate-50 text-slate-700"
  };

  return (
    <div className="rounded-lg border border-[#dfe7e2] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
        <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-[#f7faf8]">
          <MoreHorizontal size={16} />
        </button>
      </div>
      <div className="mt-4 text-sm font-bold text-[#53605a]">{title}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--hh-purple-dark)]">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[#53605a]">{description}</p>
    </div>
  );
}

function Panel({ title, icon, children, action = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: boolean }) {
  return (
    <div className="rounded-lg border border-[#dfe7e2] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#eef2ef] px-4 py-3">
        <div className="flex items-center gap-2 font-bold">
          {icon}
          {title}
        </div>
        {action ? (
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-[#f7faf8]">
            <Pencil size={15} />
          </button>
        ) : (
          <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-[#f7faf8]">
            <MoreHorizontal size={16} />
          </button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoGrid({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="text-xs font-bold uppercase text-[#66736d]">{label}</div>
          <div className="mt-1 text-sm text-[#1f2933]">{value}</div>
        </div>
      ))}
    </div>
  );
}
