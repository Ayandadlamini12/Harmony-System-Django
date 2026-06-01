import { MailCheck, Settings2, ShieldCheck } from "lucide-react";

import { sendSystemEmailTest, updateSystemEmailSettings } from "@/app/administration/settings/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getEmailDeliveryLogs, getSystemEmailSettings } from "@/lib/api";

export default async function AdministrationSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; tested?: string; error?: string }>;
}) {
  const [emailSettings, logs, params] = await Promise.all([getSystemEmailSettings(), getEmailDeliveryLogs(), searchParams]);

  return (
    <AppShell title="Administration settings">
      <div className="grid gap-5">
        <section className="hh-panel p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <Settings2 className="text-[var(--hh-purple)]" size={22} />
                <h2 className="font-bold">System administration</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#66736d]">
                Configure shared system services used by user onboarding, password flows, notifications, and future workflow automations.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e3dd] bg-white px-3 py-1 text-xs font-bold uppercase text-[#52635b]">
              <ShieldCheck size={14} />
              Admin only
            </span>
          </div>

          {params.saved === "email" && (
            <div className="mt-4 rounded-lg border border-[#b7e2c0] bg-[#f2fbf4] px-4 py-3 text-sm font-semibold text-[var(--hh-green-dark)]">
              Email settings saved.
            </div>
          )}
          {params.tested === "email" && (
            <div className="mt-4 rounded-lg border border-[#b7e2c0] bg-[#f2fbf4] px-4 py-3 text-sm font-semibold text-[var(--hh-green-dark)]">
              Test email sent.
            </div>
          )}
          {params.error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {params.error === "email_test_failed" ? "The test email could not be sent." : "The settings could not be saved."}
            </div>
          )}
        </section>

        <section className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border-strong)] px-5 py-4">
            <div className="flex items-center gap-3">
              <MailCheck className="text-[var(--hh-purple)]" size={20} />
              <div>
                <h3 className="font-bold">Transactional email SMTP</h3>
                <p className="mt-1 text-sm text-[#66736d]">
                  Brevo API is the preferred production provider. SMTP remains available as a fallback for providers that do not expose a transactional API.
                </p>
              </div>
            </div>
          </div>

          <form action={updateSystemEmailSettings} className="grid gap-5 p-5">
            <label className="flex items-center gap-3 text-sm font-bold text-[#16211c]">
              <input name="is_enabled" type="checkbox" defaultChecked={emailSettings?.is_enabled ?? false} />
              Enable system email sending
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="hh-label">Email provider</span>
                <select className="hh-input" name="provider" defaultValue={emailSettings?.provider || "brevo_api"}>
                  <option value="brevo_api">Brevo API - recommended</option>
                  <option value="smtp">SMTP fallback</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="hh-label">Brevo API key</span>
                <input className="hh-input" name="brevo_api_key" type="password" placeholder={emailSettings?.brevo_api_key_is_set ? "Saved - leave blank to keep current key" : "Enter Brevo API key"} autoComplete="new-password" />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2">
                <span className="hh-label">SMTP host</span>
                <input className="hh-input" name="smtp_host" defaultValue={emailSettings?.smtp_host || "smtp-relay.brevo.com"} required />
              </label>
              <label className="grid gap-2">
                <span className="hh-label">SMTP port</span>
                <input className="hh-input" name="smtp_port" type="number" min={1} max={65535} defaultValue={emailSettings?.smtp_port || 587} required />
              </label>
              <label className="grid gap-2">
                <span className="hh-label">Encryption</span>
                <select className="hh-input" name="encryption" defaultValue={emailSettings?.encryption || "starttls"}>
                  <option value="starttls">STARTTLS</option>
                  <option value="ssl">SSL/TLS</option>
                  <option value="none">None</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="hh-label">SMTP username</span>
                <input className="hh-input" name="username" defaultValue={emailSettings?.username || ""} autoComplete="off" />
              </label>
              <label className="grid gap-2">
                <span className="hh-label">SMTP password / key</span>
                <input className="hh-input" name="password" type="password" placeholder={emailSettings?.password_is_set ? "Saved - leave blank to keep current key" : "Enter SMTP key"} autoComplete="new-password" />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="grid gap-2">
                <span className="hh-label">From email</span>
                <input className="hh-input" name="from_email" type="email" defaultValue={emailSettings?.from_email || "noreply@harmonyhealthsz.com"} required />
              </label>
              <label className="grid gap-2">
                <span className="hh-label">From display name</span>
                <input className="hh-input" name="from_name" defaultValue={emailSettings?.from_name || "Harmony Health MIS"} />
              </label>
              <label className="grid gap-2">
                <span className="hh-label">Reply-to email</span>
                <input className="hh-input" name="reply_to_email" type="email" defaultValue={emailSettings?.reply_to_email || "info@harmonyhealthsz.com"} />
              </label>
              <label className="grid gap-2">
                <span className="hh-label">Reply-to display name</span>
                <input className="hh-input" name="reply_to_name" defaultValue={emailSettings?.reply_to_name || "Harmony Health"} />
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save SMTP settings</Button>
            </div>
          </form>

          <form action={sendSystemEmailTest} className="border-t border-[var(--hh-border-strong)] bg-[#f7faf8] p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="hh-label">Send test email to</span>
                <input className="hh-input" name="recipient" type="email" placeholder="admin@example.com" />
              </label>
              <Button type="submit" variant="secondary">Send test email</Button>
            </div>
          </form>
        </section>

        <section className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border-strong)] px-5 py-4">
            <h3 className="font-bold">Recent email delivery log</h3>
            <p className="mt-1 text-sm text-[#66736d]">Trace sent and failed transactional emails from onboarding and future notification workflows.</p>
          </div>
          {logs.results.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-xs uppercase text-[#66736d]">
                  <tr>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Template</th>
                    <th className="px-5 py-3">Recipient</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Provider</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.results.slice(0, 10).map((log) => (
                    <tr key={log.id} className="border-t border-[var(--hh-border-strong)]">
                      <td className="px-5 py-3 font-bold capitalize">{log.status}</td>
                      <td className="px-5 py-3 font-mono text-xs">{log.template_key}</td>
                      <td className="px-5 py-3">{log.to?.join(", ") || "--"}</td>
                      <td className="px-5 py-3">{log.subject}</td>
                      <td className="px-5 py-3">{log.provider === "brevo_api" ? "Brevo API" : "SMTP"}</td>
                      <td className="px-5 py-3">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-8 text-sm text-[#66736d]">No email delivery attempts recorded yet.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
