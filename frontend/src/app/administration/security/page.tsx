import { ShieldAlert, KeyRound, ShieldCheck, Cpu, Lock, Unlock, FileText, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { getSystemSecurityStatus } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function SecurityAndSessionsPage() {
  const [session, securityStatus] = await Promise.all([
    getSessionUser(),
    getSystemSecurityStatus(),
  ]);

  // Assert admin privilege - if not an admin, return dynamic 404 (Access Denied)
  if (session.role !== "admin") {
    notFound();
  }

  return (
    <AppShell title="Security & Sessions">
      <div className="space-y-6">
        {/* Header Block */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <KeyRound className="text-[var(--hh-purple)]" size={24} />
                <h2 className="text-xl font-bold text-[#3f1d58]">Security & Sessions</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#66736d]">
                Review operational security status, token lifespans, deployment environment contracts, and active identity provider configurations.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d9e3dd] bg-white px-3 py-1 text-xs font-bold uppercase text-[#52635b] w-fit shrink-0">
              <ShieldCheck size={14} className="text-[#225c2c]" />
              Admin Only
            </span>
          </div>
        </div>

        {/* Auth Failure / Empty State Handler */}
        {!securityStatus ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-xs">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={24} />
              <div>
                <h3 className="font-bold text-lg text-red-950">Administrative Authorization Failed</h3>
                <p className="mt-2 text-sm leading-relaxed text-red-900">
                  The backend security status endpoint returned an unexpected authorization or connectivity failure.
                  Please ensure your administrator session is valid and try reloading the page.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Warnings Alert Panel (If present) */}
            {securityStatus.warnings && securityStatus.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <h3 className="font-bold text-sm uppercase tracking-wider text-amber-900">Active Security Alerts</h3>
                </div>
                <div className="space-y-3">
                  {securityStatus.warnings.map((warning, idx) => (
                    <div key={idx} className="flex gap-2.5 text-xs text-amber-950">
                      {warning.severity === "critical" ? (
                        <XCircle className="text-red-600 shrink-0 mt-0.5" size={15} />
                      ) : (
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={15} />
                      )}
                      <div>
                        <span className="font-semibold">{warning.detail}</span>
                        {warning.fields && warning.fields.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[10px] text-amber-800">
                            {warning.fields.map((f, fIdx) => (
                              <span key={fIdx} className="bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200/50">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Cards Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* 1. KEYCLOAK IDENTITY STATUS CARD */}
              <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <KeyRound className="text-[var(--hh-purple)]" size={18} />
                    <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider">Identity Provider (Keycloak)</h3>
                  </div>
                  {securityStatus.keycloak.enabled ? (
                    <Badge className="border-green-200 bg-green-50 text-green-800 rounded-full font-bold uppercase text-[10px] px-2.5">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="border-gray-200 bg-gray-50 text-gray-500 rounded-full font-bold uppercase text-[10px] px-2.5">
                      Inactive
                    </Badge>
                  )}
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs leading-relaxed">
                    {/* Server URL */}
                    <div className="col-span-2">
                      <div className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Server Endpoint URL</div>
                      <div className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-[#3f1d58] mt-1 break-all">
                        {securityStatus.keycloak.server_url || <span className="text-gray-400 italic">Not set</span>}
                      </div>
                    </div>

                    {/* Realm */}
                    <div>
                      <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Realm</span>
                      <div className="font-semibold text-sm text-[#3f1d58] mt-1">
                        {securityStatus.keycloak.realm || "--"}
                      </div>
                    </div>

                    {/* Client ID */}
                    <div>
                      <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Client ID</span>
                      <div className="font-semibold text-sm text-[#3f1d58] mt-1">
                        {securityStatus.keycloak.client_id || "--"}
                      </div>
                    </div>

                    {/* Client Secret */}
                    <div className="pt-2 border-t border-[var(--hh-border)]">
                      <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Client Secret</span>
                      <div className="mt-1 flex items-center gap-1.5 font-bold">
                        {securityStatus.keycloak.client_secret_configured ? (
                          <>
                            <CheckCircle2 className="text-[#225c2c]" size={14} />
                            <span className="text-[#225c2c] text-xs">Configured</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="text-red-600" size={14} />
                            <span className="text-red-700 text-xs">Missing</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Admin Client Credentials */}
                    <div className="pt-2 border-t border-[var(--hh-border)]">
                      <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Admin Credentials</span>
                      <div className="mt-1 flex items-center gap-1.5 font-bold">
                        {securityStatus.keycloak.admin_username_configured && securityStatus.keycloak.admin_password_configured ? (
                          <>
                            <CheckCircle2 className="text-[#225c2c]" size={14} />
                            <span className="text-[#225c2c] text-xs">Configured</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="text-red-600" size={14} />
                            <span className="text-red-700 text-xs">Incomplete</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Local Fallback */}
                    <div className="col-span-2 pt-2 border-t border-[var(--hh-border)] flex items-center justify-between">
                      <div>
                        <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Local Authentication Fallback</span>
                        <p className="text-[10px] text-[#66736d] mt-0.5">Allows logging in via local user credentials if Keycloak is unavailable.</p>
                      </div>
                      <div className="font-bold flex items-center gap-1">
                        {securityStatus.keycloak.allow_local_fallback ? (
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Enabled</span>
                        ) : (
                          <span className="text-[#225c2c] bg-green-50 border border-green-200 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Locked Out</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SESSION POLICY CARD */}
              <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <Lock className="text-[var(--hh-purple)]" size={18} />
                    <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider">Session Policy & Tokens</h3>
                  </div>
                  {securityStatus.sessions.cookie_secure ? (
                    <Badge className="border-[#bfe3eb] bg-[#f0f9fb] text-sky-800 rounded-full font-bold uppercase text-[10px] px-2.5">
                      Secure Cookies
                    </Badge>
                  ) : (
                    <Badge className="border-orange-200 bg-orange-50 text-orange-700 rounded-full font-bold uppercase text-[10px] px-2.5">
                      HTTP Fallback
                    </Badge>
                  )}
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="grid grid-cols-1 gap-4 text-xs leading-relaxed">
                    {/* Access Token Lifetime */}
                    <div className="flex justify-between items-center border-b border-[var(--hh-border)] pb-3">
                      <div>
                        <div className="font-bold text-[#3f1d58] text-sm">Access Token Lifetime</div>
                        <p className="text-[10px] text-[#66736d] mt-0.5">Short-lived credentials utilized for API access request authentication.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#3f1d58]">{securityStatus.sessions.access_token_lifetime_minutes}</span>
                        <span className="text-[10px] text-[#66736d] font-bold uppercase ml-1">Mins</span>
                      </div>
                    </div>

                    {/* Refresh Token Lifetime */}
                    <div className="flex justify-between items-center border-b border-[var(--hh-border)] pb-3">
                      <div>
                        <div className="font-bold text-[#3f1d58] text-sm">Refresh Token Lifetime</div>
                        <p className="text-[10px] text-[#66736d] mt-0.5">Persistent lifetime duration of cookie-stored refresh tokens.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#3f1d58]">{securityStatus.sessions.refresh_token_lifetime_days}</span>
                        <span className="text-[10px] text-[#66736d] font-bold uppercase ml-1">Days</span>
                      </div>
                    </div>

                    {/* Keycloak Email Action Lifespan */}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-[#3f1d58] text-sm">Action Email Lifespan</div>
                        <p className="text-[10px] text-[#66736d] mt-0.5">Validity duration of reset passwords or verification action emails.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-[#3f1d58]">{securityStatus.keycloak.action_email_lifespan}</span>
                        <span className="text-[10px] text-[#66736d] font-bold uppercase ml-1">Secs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. DEPLOYMENT ENV SAFETY CONTRACT CARD */}
              <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden flex flex-col md:col-span-2">
                <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <Cpu className="text-[var(--hh-purple)]" size={18} />
                    <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider">Docker Compose & Deployment Environment Contract</h3>
                  </div>
                  {securityStatus.deployment.backend_keycloak_env_ok ? (
                    <Badge className="border-green-200 bg-green-50 text-green-800 rounded-full font-bold uppercase text-[10px] px-2.5">
                      Env Match OK
                    </Badge>
                  ) : (
                    <Badge className="border-red-200 bg-red-50 text-red-700 rounded-full font-bold uppercase text-[10px] px-2.5 animate-pulse">
                      Env Incomplete
                    </Badge>
                  )}
                </div>

                <div className="p-5 space-y-5">
                  <div className="grid gap-5 lg:grid-cols-2 text-xs leading-relaxed">
                    {/* Checklist of required vars */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Required Environment Variables Checklist</span>
                        <p className="text-[10px] text-[#66736d] mt-0.5">Status parameters extracted from active container system logs.</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {securityStatus.deployment.required_keycloak_vars.map((variable) => {
                          const isMissing = securityStatus.keycloak.missing_required.includes(variable);
                          return (
                            <div key={variable} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-2.5 py-2">
                              {isMissing ? (
                                <XCircle className="text-red-600 shrink-0" size={14} />
                              ) : (
                                <CheckCircle2 className="text-[#225c2c] shrink-0" size={14} />
                              )}
                              <span className="font-mono text-[10px] truncate text-[#3f1d58]">{variable}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Environment Contract Note */}
                    <div className="space-y-3 lg:border-l lg:border-[var(--hh-border)] lg:pl-5">
                      <div>
                        <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Celery & Worker Environment Constraint</span>
                        <p className="text-[10px] text-[#66736d] mt-0.5">Rule validation parameters required during container scaling.</p>
                      </div>
                      <div className="bg-[#f0e7f3]/30 border border-[#e7d7ef] p-3 rounded-lg text-xs text-[var(--hh-purple-dark)] space-y-2">
                        <div className="flex gap-2">
                          <ShieldCheck size={16} className="text-[var(--hh-purple)] shrink-0 mt-0.5" />
                          <p className="font-semibold leading-relaxed">
                            {securityStatus.deployment.compose_env_contract}
                          </p>
                        </div>
                        {securityStatus.deployment.worker_services_must_preserve_keycloak_env && (
                          <div className="border-t border-[#f0e7f3] pt-2 text-[10px] text-[#66736d] font-medium italic">
                            Strict Rule: Celery Workers and Celery Beat scheduler run standalone and must share matching environment contexts.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
