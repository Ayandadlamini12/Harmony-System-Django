"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  KeyRound,
  ShieldCheck,
  Cpu,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Fingerprint,
  Eye,
  Server,
  Activity,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SystemSecurityStatus } from "@/types/clinic";

interface SecurityDashboardClientProps {
  initialStatus: SystemSecurityStatus;
}

export function SecurityDashboardClient({ initialStatus }: SecurityDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");

  return (
    <div className="space-y-6">
      {/* Tab Navigation Controller */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-[var(--hh-border-strong)] bg-white px-5 rounded-t-xl">
          <TabsList className="flex gap-2 overflow-x-auto">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 py-3">
              <Eye size={15} />
              Overview
            </TabsTrigger>
            <TabsTrigger value="keycloak" className="flex items-center gap-1.5 py-3">
              <KeyRound size={15} />
              Keycloak IDP
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center gap-1.5 py-3">
              <Clock size={15} />
              Sessions & Cookies
            </TabsTrigger>
            <TabsTrigger value="authentication_activity" className="flex items-center gap-1.5 py-3">
              <History size={15} />
              Auth & Security Logs
            </TabsTrigger>
            <TabsTrigger value="deployment_contract" className="flex items-center gap-1.5 py-3">
              <Cpu size={15} />
              Deployment Contract
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-1.5 py-3">
              <Lock size={15} />
              System Policies
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ----------------- TAB 1: OVERVIEW ----------------- */}
        <TabsContent value="overview" className="space-y-6">
          {/* Warnings Alert Panel (Always visible on top of Overview if warnings are active) */}
          {initialStatus.warnings && initialStatus.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 space-y-3.5">
              <div className="flex items-center gap-2 border-b border-amber-100 pb-2">
                <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900">Active Security Alerts ({initialStatus.overview.active_warning_count})</h3>
              </div>
              <div className="space-y-3">
                {initialStatus.warnings.map((warning, idx) => (
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

          {/* Core Posture Metrics Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Metric 1 */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Identity Provider</div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="text-lg font-bold text-[#3f1d58]">Keycloak</div>
                {initialStatus.overview.keycloak_ready ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-800 border border-green-200">Ready</span>
                ) : (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-700 border border-red-200">Config Missing</span>
                )}
              </div>
            </div>

            {/* Metric 2 */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Local Fallback Auth</div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="text-lg font-bold text-[#3f1d58]">
                  {initialStatus.overview.local_fallback_enabled ? "Allowed" : "Enforced"}
                </div>
                {initialStatus.overview.local_fallback_enabled ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 border border-amber-200">Recovery Path</span>
                ) : (
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-800 border border-green-200">Disabled</span>
                )}
              </div>
            </div>

            {/* Metric 3 */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Server Sessions</div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="text-lg font-bold text-[#3f1d58]">{initialStatus.overview.active_django_sessions} Active</div>
                <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">Django DB</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Secret Parameter Check</div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="text-lg font-bold text-[#3f1d58]">
                  {initialStatus.overview.secret_values_exposed ? "Exposed" : "Protected"}
                </div>
                {initialStatus.overview.secret_values_exposed ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-red-700 border border-red-200">WARNING</span>
                ) : (
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-800 border border-green-200">Fully Protected</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Posture Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--hh-border)] pb-2.5">
                <ShieldCheck size={18} className="text-[#225c2c]" />
                Security Posture Audit
              </h3>
              <ul className="text-xs space-y-3">
                <li className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                  <span className="text-[#66736d]">Deployment Environment Status:</span>
                  <span className={`font-semibold ${initialStatus.overview.deployment_env_contract_ok ? "text-[#225c2c]" : "text-red-700"}`}>
                    {initialStatus.overview.deployment_env_contract_ok ? "Verified MATCH" : "Env Incomplete"}
                  </span>
                </li>
                <li className="flex justify-between items-center py-0.5 border-b border-gray-100 last:border-0">
                  <span className="text-[#66736d]">Successful Logins Tracker:</span>
                  <span className="font-semibold text-slate-800">{initialStatus.overview.recent_successful_login_count} active users</span>
                </li>
                <li className="flex justify-between items-center py-0.5 last:border-0">
                  <span className="text-[#66736d]">Security Audit Events:</span>
                  <span className="font-semibold text-slate-800">{initialStatus.overview.recent_security_event_count} recorded logs</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2">
                  <Server size={18} className="text-[var(--hh-purple)]" />
                  Stateless Authentication Notice
                </h3>
                <p className="text-xs leading-relaxed text-[#66736d] mt-2">
                  {initialStatus.sessions.instrumentation_note}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-700 px-3 py-2 rounded-md mt-4">
                Access Token Lifetime: {initialStatus.sessions.access_token_lifetime_minutes} mins | Refresh Token Lifetime: {initialStatus.sessions.refresh_token_lifetime_days} days
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 2: KEYCLOAK ----------------- */}
        <TabsContent value="keycloak">
          <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <KeyRound className="text-[var(--hh-purple)]" size={18} />
                <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider">Identity Provider Integration (Keycloak)</h3>
              </div>
              {initialStatus.keycloak.enabled ? (
                <Badge className="border-green-200 bg-green-50 text-green-800 rounded-full font-bold uppercase text-[10px] px-2.5">
                  Active
                </Badge>
              ) : (
                <Badge className="border-gray-200 bg-gray-50 text-gray-500 rounded-full font-bold uppercase text-[10px] px-2.5">
                  Inactive
                </Badge>
              )}
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs leading-relaxed">
                {/* Server URL */}
                <div className="col-span-1 md:col-span-2">
                  <div className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Server Endpoint URL</div>
                  <div className="font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-[#3f1d58] mt-1 break-all">
                    {initialStatus.keycloak.server_url || <span className="text-gray-400 italic">Not set</span>}
                  </div>
                </div>

                {/* Realm */}
                <div>
                  <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Realm</span>
                  <div className="font-semibold text-sm text-[#3f1d58] mt-1">
                    {initialStatus.keycloak.realm || "--"}
                  </div>
                </div>

                {/* Client ID */}
                <div>
                  <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Client ID</span>
                  <div className="font-semibold text-sm text-[#3f1d58] mt-1">
                    {initialStatus.keycloak.client_id || "--"}
                  </div>
                </div>

                {/* Client Secret Status */}
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Client Secret Status</span>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    {initialStatus.keycloak.client_secret_configured ? (
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

                {/* Admin Credentials Status */}
                <div className="pt-3 border-t border-gray-100">
                  <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Admin API Credentials</span>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    {initialStatus.keycloak.admin_username_configured && initialStatus.keycloak.admin_password_configured ? (
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

                {/* Local Fallback Auth Toggle */}
                <div className="col-span-1 md:col-span-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Local Authentication Fallback Policy</span>
                    <p className="text-[10px] text-[#66736d] mt-0.5">Allows logging in via local user credentials if Keycloak is unavailable.</p>
                  </div>
                  <div className="font-bold flex items-center gap-1.5">
                    {initialStatus.keycloak.allow_local_fallback ? (
                      <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">Enabled</span>
                    ) : (
                      <span className="text-[#225c2c] bg-green-50 border border-green-200 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">Disabled</span>
                    )}
                  </div>
                </div>

                {/* Keycloak Email Action Lifespan */}
                <div className="col-span-1 md:col-span-2 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Keycloak Action Email Lifespan</span>
                    <p className="text-[10px] text-[#66736d] mt-0.5">Validity duration of reset password links or registration action emails.</p>
                  </div>
                  <div className="text-sm font-semibold text-[#3f1d58]">
                    {initialStatus.keycloak.action_email_lifespan} seconds
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 3: SESSIONS ----------------- */}
        <TabsContent value="sessions" className="space-y-6">
          {/* JWT Token Lifetimes Card */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--hh-border)] pb-2.5">
                <Lock size={18} className="text-[var(--hh-purple)]" />
                Stateless Access & JWT Policies
              </h3>
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-slate-800">Access Token Lifetime</div>
                    <p className="text-[10px] text-[#66736d] mt-0.5">Short-lived credentials utilized for individual api requests.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#3f1d58]">{initialStatus.sessions.access_token_lifetime_minutes}</span>
                    <span className="text-[10px] text-[#66736d] font-bold uppercase ml-1">mins</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <div>
                    <div className="font-semibold text-slate-800">Refresh Token Lifetime</div>
                    <p className="text-[10px] text-[#66736d] mt-0.5">Persistent lifetime duration of cookie-stored refresh tokens.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#3f1d58]">{initialStatus.sessions.refresh_token_lifetime_days}</span>
                    <span className="text-[10px] text-[#66736d] font-bold uppercase ml-1">days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Django Session Counts Card */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--hh-border)] pb-2.5">
                <Activity size={18} className="text-[var(--hh-purple)]" />
                Server-Side Django Session Store
              </h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#66736d]">Session Store Engine:</span>
                  <span className="font-mono text-xs text-[#3f1d58] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                    {initialStatus.sessions.server_side_session_store}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-[#66736d]">Active Server Sessions:</span>
                  <span className="font-semibold text-slate-800">{initialStatus.sessions.active_django_sessions} sessions</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-[#66736d]">Active Authenticated Sessions:</span>
                  <span className="font-semibold text-slate-800">{initialStatus.sessions.active_authenticated_django_sessions} users</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-[#66736d]">Expired Database Sessions:</span>
                  <span className="font-semibold text-slate-800">{initialStatus.sessions.expired_django_sessions} sessions</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stateful vs Stateless Warning Note */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex gap-3 text-xs leading-relaxed text-blue-950">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-blue-900 block mb-1">JWT Security Context Contract</span>
              {initialStatus.sessions.instrumentation_note}
            </div>
          </div>

          {/* Django Cookie Policy Settings Table */}
          <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe]">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2">
                <Server size={18} className="text-[var(--hh-purple)]" />
                Django & Cookie Policy Configuration
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="hh-compact-table w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="px-5 py-3 font-bold uppercase text-[9px] text-[#66736d] tracking-wider w-[240px]">Setting / Environment Variable</th>
                    <th className="px-5 py-3 font-bold uppercase text-[9px] text-[#66736d] tracking-wider w-[120px]">Status</th>
                    <th className="px-5 py-3 font-bold uppercase text-[9px] text-[#66736d] tracking-wider">Policy Details & Enforcement Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Row 1 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-800">SESSION_COOKIE_SECURE</td>
                    <td className="px-5 py-3">
                      {initialStatus.sessions.cookie_policy.session_cookie_secure ? (
                        <span className="text-[#225c2c] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Secure</span>
                      ) : (
                        <span className="text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">HTTP Fallback</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      Enforces HTTPS cookies. Only transmitted over encrypted connections if secure.
                    </td>
                  </tr>
                  {/* Row 2 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-800">SESSION_COOKIE_HTTPONLY</td>
                    <td className="px-5 py-3">
                      {initialStatus.sessions.cookie_policy.session_cookie_httponly ? (
                        <span className="text-[#225c2c] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">HttpOnly</span>
                      ) : (
                        <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Accessible</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      Prevents client-side scripts from accessing session tokens, protecting against XSS attacks.
                    </td>
                  </tr>
                  {/* Row 3 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-800">SESSION_COOKIE_SAMESITE</td>
                    <td className="px-5 py-3 font-semibold text-[#3f1d58]">{initialStatus.sessions.cookie_policy.session_cookie_samesite}</td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      Restricts cross-site session requests, preventing cross-site request forgery (CSRF) exploits.
                    </td>
                  </tr>
                  {/* Row 4 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-800">CSRF_COOKIE_SECURE</td>
                    <td className="px-5 py-3">
                      {initialStatus.sessions.cookie_policy.csrf_cookie_secure ? (
                        <span className="text-[#225c2c] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Secure</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">HTTP OK</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      Enforces HTTPS-only transmission for Django's CSRF verification cookies.
                    </td>
                  </tr>
                  {/* Row 5 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-800">SECURE_SSL_REDIRECT</td>
                    <td className="px-5 py-3">
                      {initialStatus.sessions.cookie_policy.secure_ssl_redirect ? (
                        <span className="text-[#225c2c] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Active</span>
                      ) : (
                        <span className="text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-bold">No Redirect</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      Forces the server to redirect all HTTP requests to secure HTTPS endpoints.
                    </td>
                  </tr>
                  {/* Row 6 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-slate-800">SECURE_HSTS_SECONDS</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {initialStatus.sessions.cookie_policy.hsts_seconds > 0 ? (
                        `${initialStatus.sessions.cookie_policy.hsts_seconds}s`
                      ) : (
                        <span className="text-[#66736d] italic font-normal">Disabled</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      HTTP Strict Transport Security header configuration status (seconds).
                    </td>
                  </tr>
                  {/* Row 7 */}
                  <tr>
                    <td className="px-5 py-3 font-mono text-[11px] font-semibold text-[#3f1d58]">COOKIE_SECURE (Compose Env)</td>
                    <td className="px-5 py-3">
                      {initialStatus.sessions.cookie_policy.proxy_cookie_secure_env ? (
                        <span className="text-[#225c2c] bg-green-50 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Secure</span>
                      ) : (
                        <span className="text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">HTTP OK</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#66736d] leading-relaxed">
                      Controls Next.js standalone and Django proxy secure cookie transport settings.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 4: AUTHENTICATION ACTIVITY ----------------- */}
        <TabsContent value="authentication_activity" className="space-y-6">
          {/* Active successful logins */}
          <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe]">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={18} className="text-[var(--hh-purple)]" />
                Recent Successful User Logins (Last 10)
              </h3>
            </div>
            {initialStatus.authentication_activity.recent_successful_logins.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="hh-compact-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-[#66736d]">
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider">User</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider">Username</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider">Role Module Scope</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider">Timestamp</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {initialStatus.authentication_activity.recent_successful_logins.map((user) => (
                      <tr key={user.id}>
                        <td className="px-5 py-3 font-semibold text-[#16211c]">{user.display_name}</td>
                        <td className="px-5 py-3 font-mono text-[11px] text-slate-800">{user.username}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex rounded-full bg-[#fcf9fe] border border-[var(--hh-border)] px-2 py-0.5 font-semibold text-[10px] text-[#3f1d58] uppercase">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-[#66736d]">
                          {user.last_login ? new Date(user.last_login).toLocaleString() : "--"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {user.is_active ? (
                            <span className="text-[#225c2c] font-bold uppercase text-[10px]">Active</span>
                          ) : (
                            <span className="text-red-700 font-bold uppercase text-[10px]">Suspended</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-[#66736d]">No successful user logins recorded.</div>
            )}
          </div>

          {/* Security Audit Events */}
          <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe]">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={18} className="text-[var(--hh-purple)]" />
                Recent System Security Events (Last 20)
              </h3>
            </div>
            {initialStatus.authentication_activity.recent_security_events.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="hh-compact-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-[#66736d]">
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider w-[120px]">Action</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider w-[140px]">Entity Context</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider w-[140px]">Performed By</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider">Event Details</th>
                      <th className="px-5 py-2.5 font-bold uppercase text-[9px] tracking-wider text-right w-[160px]">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {initialStatus.authentication_activity.recent_security_events.map((event) => (
                      <tr key={event.id}>
                        <td className="px-5 py-3">
                          <span className="inline-flex rounded bg-[#f7faf8] border border-[#d9e3dd] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#24302b] uppercase">
                            {event.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[10px] text-slate-600">{event.entity_type} ({event.entity_id || "--"})</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{event.actor}</td>
                        <td className="px-5 py-3 text-[#66736d] max-w-sm truncate">
                          {typeof event.details === "object" ? JSON.stringify(event.details) : event.details || "--"}
                        </td>
                        <td className="px-5 py-3 text-right text-[#66736d]">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-[#66736d]">No security event logs recorded.</div>
            )}
          </div>

          {/* Uninstrumented failed/fallback login events banner */}
          <div className="rounded-xl border border-dashed border-[#d9e3dd] bg-gray-50/50 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity size={15} className="text-slate-500" />
                  Failed Logins & Local Fallback Audits
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500 mt-1 max-w-2xl">
                  {initialStatus.authentication_activity.instrumentation_note}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600 border border-slate-200 shrink-0 w-fit h-fit">
                Not Instrumented Yet
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="bg-white border border-gray-200 p-3 rounded-lg text-slate-400 italic">
                Failed Logins Audit Logs: Empty (Requires login hooks)
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-lg text-slate-400 italic">
                Local Fallback Auth Events: Empty (Requires middleware auth logging)
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 5: DEPLOYMENT CONTRACT ----------------- */}
        <TabsContent value="deployment_contract" className="space-y-6">
          <div className="rounded-xl border border-[var(--hh-border)] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Cpu className="text-[var(--hh-purple)]" size={18} />
                <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider">Docker Compose & Deployment Environment Variables</h3>
              </div>
              {initialStatus.deployment.backend_keycloak_env_ok ? (
                <Badge className="border-green-200 bg-green-50 text-green-800 rounded-full font-bold uppercase text-[10px] px-2.5">
                  Env Match OK
                </Badge>
              ) : (
                <Badge className="border-red-200 bg-red-50 text-red-700 rounded-full font-bold uppercase text-[10px] px-2.5">
                  Env Incomplete
                </Badge>
              )}
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <div>
                  <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Required Environment Variables Checklist</span>
                  <p className="text-[10px] text-[#66736d] mt-0.5">Keycloak parameters loaded into active backend system settings.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                  {initialStatus.deployment.required_keycloak_vars.map((variable) => {
                    const isMissing = initialStatus.keycloak.missing_required.includes(variable);
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

              {/* Environment Contract Details */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <span className="text-[#66736d] font-bold text-[10px] uppercase tracking-wider">Compose Services Environment Contract</span>
                  <p className="text-[10px] text-[#66736d] mt-0.5">Strict multi-service container synchronization requirement.</p>
                </div>
                <div className="bg-[#f0e7f3]/30 border border-[#e7d7ef] p-4 rounded-lg text-xs text-[var(--hh-purple-dark)] space-y-2">
                  <div className="flex gap-2">
                    <ShieldCheck size={16} className="text-[var(--hh-purple)] shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">
                      {initialStatus.deployment.compose_env_contract}
                    </p>
                  </div>
                  {initialStatus.deployment.worker_services_must_preserve_keycloak_env && (
                    <div className="border-t border-[#f0e7f3] pt-2 text-[10px] text-[#66736d] font-medium italic">
                      Strict Deployment Constraint: Standing worker containers (Celery Worker and Celery Beat scheduler) execute task flows asynchronously and require a mirrored copy of the entire Keycloak credentials env block to operate.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ----------------- TAB 6: POLICIES ----------------- */}
        <TabsContent value="policies" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Django Password Validators */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--hh-border)] pb-2.5">
                <ShieldAlert size={18} className="text-[var(--hh-purple)]" />
                Django Password Strength Policies
              </h3>
              {initialStatus.policies.password_validators_enabled ? (
                <div className="space-y-3">
                  <p className="text-xs text-[#66736d] leading-relaxed">
                    Local administrative or fallback user passwords must comply with these active validator checks ({initialStatus.policies.password_validator_count} active):
                  </p>
                  <div className="space-y-2 text-xs font-semibold">
                    {initialStatus.policies.password_validators.map((validator, index) => (
                      <div key={index} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-md font-mono text-[10px] text-[#3f1d58]">
                        <CheckCircle2 size={13} className="text-[#225c2c] shrink-0" />
                        {validator}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  Password strength validators are currently disabled.
                </div>
              )}
            </div>

            {/* Keycloak Policies Availability Status */}
            <div className="rounded-xl border border-[var(--hh-border)] bg-white p-5 space-y-4">
              <h3 className="font-bold text-sm text-[#3f1d58] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--hh-border)] pb-2.5">
                <Fingerprint size={18} className="text-[var(--hh-purple)]" />
                Read-Only Keycloak Policies
              </h3>
              <div className="space-y-4 text-xs leading-relaxed">
                {/* MFA status placeholder */}
                <div className="flex justify-between items-center pb-2.5 border-b border-gray-100 last:pb-0 last:border-0">
                  <div>
                    <span className="font-semibold text-slate-800">Multi-Factor Auth (MFA) Status</span>
                    <p className="text-[10px] text-[#66736d] mt-0.5">Identity verification policy source: {initialStatus.policies.mfa_status_source}</p>
                  </div>
                  {initialStatus.policies.mfa_status_available ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800 border border-green-200">Enforced</span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 border border-slate-200">Not Instrumented</span>
                  )}
                </div>

                {/* Account Lockout status placeholder */}
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-slate-800">Account Lockout Limits</span>
                    <p className="text-[10px] text-[#66736d] mt-0.5">Policy limits and audit handler source: {initialStatus.policies.account_lockout_status_source}</p>
                  </div>
                  {initialStatus.policies.account_lockout_status_available ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-800 border border-green-200">Active</span>
                  ) : (
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 border border-slate-200">Not Instrumented</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Console Policy Controls Card */}
          <div className="rounded-xl border border-[var(--hh-border)] bg-[#fbfcfb] p-4 flex gap-2.5 text-xs text-slate-600">
            <Lock size={15} className="text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[10px] uppercase tracking-wider text-slate-700 block mb-0.5">Administrative Read-Only Locks</span>
              This management console executes strictly in <strong>Read-Only Mode</strong> ({initialStatus.policies.read_only ? "Locked" : "Unlocked"}). Modifying parameters, saving settings, or overriding policies from this interface is disabled. All adjustments must be performed directly in Keycloak console or container environment properties.
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
