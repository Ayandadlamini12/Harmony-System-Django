"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Mail, Phone, Send, ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

import { LoadingButton } from "@/components/harmony-loading";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { showActionError } from "@/lib/action-error";
import type { UserNotificationSettings, UserNotificationChannel, NotificationChannelType, VerificationStatusType } from "@/types/clinic";

interface UserNotificationSettingsFormProps {
  initialSettings?: UserNotificationSettings | null;
}

export function UserNotificationSettingsForm({ initialSettings }: UserNotificationSettingsFormProps) {
  const [settings, setSettings] = useState<UserNotificationSettings | null>(initialSettings || null);
  const [loading, setLoading] = useState(!initialSettings);
  const [saving, setSaving] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [telegram, setTelegram] = useState("");
  const [preferredChannel, setPreferredChannel] = useState<NotificationChannelType>("email");

  // Verification status states (display-only, reflect backend state only)
  const [whatsappStatus, setWhatsappStatus] = useState<VerificationStatusType | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<VerificationStatusType | null>(null);
  const [emailStatus, setEmailStatus] = useState<VerificationStatusType | null>(null);

  // Load settings
  useEffect(() => {
    if (initialSettings) {
      parseSettings(initialSettings);
    } else {
      fetchSettings();
    }
  }, [initialSettings]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/users/me/notification-settings/");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        parseSettings(data);
      } else {
        toast.error("Failed to load notification settings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading notification settings");
    } finally {
      setLoading(false);
    }
  }

  function parseSettings(data: UserNotificationSettings) {
    setEmail(data.email || "");
    
    // Find WhatsApp channel
    const waChan = data.channels?.find(c => c.channel === "whatsapp");
    setWhatsapp(waChan?.value || "");
    setWhatsappStatus(waChan ? waChan.verification_status : null);

    // Find Telegram channel
    const tgChan = data.channels?.find(c => c.channel === "telegram");
    setTelegram(tgChan?.value || "");
    setTelegramStatus(tgChan ? tgChan.verification_status : null);

    // Find Email channel (if present in list for verification/preference tracking)
    const emChan = data.channels?.find(c => c.channel === "email");
    setEmailStatus(emChan ? emChan.verification_status : null);

    // Preferred channel calculation
    const preferred = data.channels?.find(c => c.is_preferred)?.channel;
    if (preferred) {
      setPreferredChannel(preferred);
    } else {
      setPreferredChannel("email");
    }
  }

  // Handle value changes and automatically reset preferred if the channel becomes empty
  const handleWhatsappChange = (val: string) => {
    setWhatsapp(val);
    if (!val && preferredChannel === "whatsapp") {
      setPreferredChannel("email");
    }
  };

  const handleTelegramChange = (val: string) => {
    setTelegram(val);
    if (!val && preferredChannel === "telegram") {
      setPreferredChannel("email");
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val && preferredChannel === "email") {
      if (whatsapp) setPreferredChannel("whatsapp");
      else if (telegram) setPreferredChannel("telegram");
    }
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    // Validate that preferred channel has a value
    if (preferredChannel === "email" && !email) {
      toast.error("Preferred channel (Email) must have a value.");
      setSaving(false);
      return;
    }
    if (preferredChannel === "whatsapp" && !whatsapp) {
      toast.error("Preferred channel (WhatsApp) must have a value.");
      setSaving(false);
      return;
    }
    if (preferredChannel === "telegram" && !telegram) {
      toast.error("Preferred channel (Telegram) must have a value.");
      setSaving(false);
      return;
    }

    // Construct channels array. Send only non-empty values.
    const channelsToSend: Partial<UserNotificationChannel>[] = [];

    if (email.trim()) {
      channelsToSend.push({
        channel: "email",
        value: email.trim(),
        is_preferred: preferredChannel === "email",
      });
    }

    if (whatsapp.trim()) {
      channelsToSend.push({
        channel: "whatsapp",
        value: whatsapp.trim(),
        is_preferred: preferredChannel === "whatsapp",
      });
    }

    if (telegram.trim()) {
      channelsToSend.push({
        channel: "telegram",
        value: telegram.trim(),
        is_preferred: preferredChannel === "telegram",
      });
    }

    const payload = {
      email: email.trim(),
      channels: channelsToSend
    };

    try {
      const res = await fetch("/api/users/me/notification-settings/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        parseSettings(updated);
        toast.success("Notification preferences updated");
      } else {
        const errorData = await res.json().catch(() => ({}));
        showActionError({
          title: "Save failed",
          message: errorData.detail || "Could not save notification settings. Please check your inputs."
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error saving notification settings");
    } finally {
      setSaving(false);
    }
  }

  const getStatusBadge = (status: VerificationStatusType) => {
    switch (status) {
      case "verified":
        return <Badge variant="success" className="text-xs">Verified</Badge>;
      case "pending":
        return <Badge variant="warning" className="text-xs">Pending</Badge>;
      case "unverified":
      default:
        return <Badge variant="default" className="text-xs text-[#66736d]">Unverified</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="hh-panel flex flex-col items-center justify-center p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[var(--hh-purple)]" />
        <p className="mt-4 text-sm font-bold text-[#66736d]">Retrieving notification settings...</p>
      </div>
    );
  }

  // Determine which options should be enabled for preferred channel selection
  const isEmailSelectable = !!email.trim();
  const isWhatsappSelectable = !!whatsapp.trim();
  const isTelegramSelectable = !!telegram.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/account"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--hh-purple)] hover:underline"
        >
          <ArrowLeft size={16} /> Back to account
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Settings Form Panel */}
        <div className="hh-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
              <Bell size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Contact channels</h2>
              <p className="text-xs text-[#66736d]">Configure your official communication methods for Harmony MIS alerts.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Email Address */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="email" className="hh-label flex items-center gap-2">
                  <Mail size={16} className="text-[#66736d]" /> Email address
                </label>
                {emailStatus && getStatusBadge(emailStatus)}
              </div>
              <input
                id="email"
                type="email"
                className="hh-input"
                placeholder="clinician@harmonyhealthsz.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
              />
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="whatsapp" className="hh-label flex items-center gap-2">
                  <Phone size={16} className="text-[#66736d]" /> WhatsApp number
                </label>
                {whatsappStatus && getStatusBadge(whatsappStatus)}
              </div>
              <input
                id="whatsapp"
                type="tel"
                className="hh-input"
                placeholder="+26876000000"
                value={whatsapp}
                onChange={(e) => handleWhatsappChange(e.target.value)}
              />
              <p className="text-xs text-[#66736d]">Include country code (e.g., +268 for Eswatini).</p>
            </div>

            {/* Telegram Username */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="telegram" className="hh-label flex items-center gap-2">
                  <Send size={16} className="text-[#66736d]" /> Telegram username or linked account
                </label>
                {telegramStatus && getStatusBadge(telegramStatus)}
              </div>
              <input
                id="telegram"
                type="text"
                className="hh-input"
                placeholder="@username"
                value={telegram}
                onChange={(e) => handleTelegramChange(e.target.value)}
              />
              <p className="text-xs text-[#66736d]">Your public Telegram username (starting with @).</p>
            </div>

            <div className="border-t border-[var(--hh-border)] pt-6">
              <div className="space-y-2">
                <label htmlFor="preferredChannel" className="hh-label">
                  Preferred notification channel
                </label>
                <Select
                  id="preferredChannel"
                  value={preferredChannel}
                  onChange={(e) => setPreferredChannel(e.target.value as NotificationChannelType)}
                >
                  <option value="email" disabled={!isEmailSelectable}>
                    Email {!isEmailSelectable ? "(Requires value)" : ""}
                  </option>
                  <option value="whatsapp" disabled={!isWhatsappSelectable}>
                    WhatsApp {!isWhatsappSelectable ? "(Requires value)" : ""}
                  </option>
                  <option value="telegram" disabled={!isTelegramSelectable}>
                    Telegram {!isTelegramSelectable ? "(Requires value)" : ""}
                  </option>
                </Select>
                <p className="text-xs text-[#66736d]">
                  Choose where primary clinic reminders and emergency shift-swaps will be dispatched first.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--hh-border)] pt-6">
              <Link href="/account">
                <button type="button" className="rounded-lg border border-[var(--hh-border)] bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Cancel
                </button>
              </Link>
              <LoadingButton type="submit" loading={saving} loadingText="Saving settings...">
                Save changes
              </LoadingButton>
            </div>
          </form>
        </div>

        {/* Informational Panel */}
        <div className="space-y-4">
          <div className="hh-panel p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[var(--hh-purple)]" size={22} />
              <h3 className="font-bold">Verification statuses</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#66736d]">
              Communication channels are assigned statuses to track delivery reliability and active user configuration.
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-[#66736d]">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[var(--hh-purple)] shrink-0" />
                <span><strong>Verification Tracking:</strong> Statuses (Unverified, Pending, Verified) are managed administratively or via connected system integrations.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-[#66736d]">
                <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[var(--hh-purple)] shrink-0" />
                <span><strong>Display-Only Badges:</strong> The status indicators shown on this form are display-only metrics retrieved directly from the backend.</span>
              </div>
            </div>
          </div>

          <div className="hh-panel p-5 bg-[#fbf9fe] border border-[#ecdff9]">
            <div className="flex items-start gap-3 text-[var(--hh-purple-dark)]">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Need status assistance?</h4>
                <p className="mt-1 text-xs leading-5 text-[#66736d]">
                  Speak with your system administrator or clinic coordinator if you need to update a channel's verification status, or if you have changed your active contact numbers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
