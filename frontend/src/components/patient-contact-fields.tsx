"use client";

import { useEffect, useState } from "react";

import { PhoneNumberInput, parsePhone } from "@/components/phone-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type RegionOption = {
  name: string;
  isoCode: string;
};

type PatientContactFieldsProps = {
  defaultEmail?: string;
  defaultPrimaryPhone?: string;
  defaultSecondaryPhone?: string;
  defaultRegion?: string;
  defaultTownOrLocality?: string;
  defaultVillage?: string;
  defaultWhatsappNumber?: string;
  defaultTelegramUsername?: string;
  defaultPreferredNotificationChannel?: "email" | "whatsapp" | "telegram" | null;
  defaultNotificationConsent?: boolean;
  defaultNotificationConsentAt?: string | null;
};

export function PatientContactFields({
  defaultEmail = "",
  defaultPrimaryPhone = "",
  defaultSecondaryPhone = "",
  defaultRegion = "",
  defaultTownOrLocality = "",
  defaultVillage = "",
  defaultWhatsappNumber = "",
  defaultTelegramUsername = "",
  defaultPreferredNotificationChannel = null,
  defaultNotificationConsent = false,
  defaultNotificationConsentAt = null
}: PatientContactFieldsProps) {
  const parsedPrimaryPhone = parsePhone(defaultPrimaryPhone);
  const [country, setCountry] = useState(parsedPrimaryPhone.country);
  const [region, setRegion] = useState(defaultRegion);
  const [townOrLocality, setTownOrLocality] = useState(defaultTownOrLocality);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [towns, setTowns] = useState<string[]>([]);
  const selectedRegion = regions.find((item) => item.name === region);
  const selectedRegionIsoCode = selectedRegion?.isoCode || "";
  const hasDropdownLocations = regions.length > 0;

  // New form states for notifications
  const [email, setEmail] = useState(defaultEmail);
  const [whatsappNumber, setWhatsappNumber] = useState(defaultWhatsappNumber);
  const [telegramUsername, setTelegramUsername] = useState(defaultTelegramUsername);
  const [preferredChannel, setPreferredChannel] = useState<"email" | "whatsapp" | "telegram" | "">(defaultPreferredNotificationChannel || "");
  const [consent, setConsent] = useState(defaultNotificationConsent);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLocations() {
      const params = new URLSearchParams({ country });
      if (selectedRegionIsoCode) {
        params.set("state", selectedRegionIsoCode);
      }
      const response = await fetch(`/api/locations?${params.toString()}`, {
        signal: controller.signal
      });
      if (!response.ok) return;
      const data = (await response.json()) as { regions?: RegionOption[]; towns?: string[] };
      setRegions(data.regions || []);
      setTowns(data.towns || []);
    }

    loadLocations().catch(() => {
      if (!controller.signal.aborted) {
        setRegions([]);
        setTowns([]);
      }
    });

    return () => controller.abort();
  }, [country, selectedRegionIsoCode]);

  const isEmailSelectable = !!email.trim();
  const isWhatsappSelectable = !!whatsappNumber.trim();
  const isTelegramSelectable = !!telegramUsername.trim();

  // Handle value-dependent preferred channel selection constraints
  useEffect(() => {
    if (preferredChannel === "email" && !isEmailSelectable) {
      setPreferredChannel(isWhatsappSelectable ? "whatsapp" : isTelegramSelectable ? "telegram" : "");
    } else if (preferredChannel === "whatsapp" && !isWhatsappSelectable) {
      setPreferredChannel(isEmailSelectable ? "email" : isTelegramSelectable ? "telegram" : "");
    } else if (preferredChannel === "telegram" && !isTelegramSelectable) {
      setPreferredChannel(isEmailSelectable ? "email" : isWhatsappSelectable ? "whatsapp" : "");
    }
  }, [email, whatsappNumber, telegramUsername, preferredChannel, isEmailSelectable, isWhatsappSelectable, isTelegramSelectable]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <PhoneNumberInput
        label="Primary phone"
        name="primary_phone"
        defaultValue={defaultPrimaryPhone}
        onCountryChange={({ country: nextCountry }) => {
          setCountry(nextCountry);
          setRegion("");
          setTownOrLocality("");
        }}
        required
      />
      <PhoneNumberInput label="Secondary phone" name="secondary_phone" defaultValue={defaultSecondaryPhone} />
      
      <label className="grid gap-1.5">
        <Label>Email</Label>
        <Input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label className="grid gap-1.5">
        <Label>WhatsApp number</Label>
        <Input name="whatsapp_number" type="tel" placeholder="+26876000000" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} />
      </label>

      <label className="grid gap-1.5">
        <Label>Telegram username</Label>
        <Input name="telegram_username" type="text" placeholder="@username" value={telegramUsername} onChange={(e) => setTelegramUsername(e.target.value)} />
      </label>

      <label className="grid gap-1.5">
        <Label>Preferred notification channel</Label>
        <Select
          name="preferred_notification_channel"
          value={preferredChannel}
          onChange={(event) => setPreferredChannel(event.currentTarget.value as any)}
        >
          <option value="">Select preferred channel</option>
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
      </label>

      {hasDropdownLocations ? (
        <>
          <label className="grid gap-1.5">
            <Label>Region / State</Label>
            <Select
              name="region"
              value={region}
              onChange={(event) => {
                setRegion(event.currentTarget.value);
                setTownOrLocality("");
              }}
            >
              <option value="">Select region / state</option>
              {regions.map((item) => (
                <option key={item.isoCode} value={item.name}>
                  {item.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1.5">
            <Label>Town or locality</Label>
            <Select
              name="town_or_locality"
              value={townOrLocality}
              onChange={(event) => setTownOrLocality(event.currentTarget.value)}
              disabled={towns.length === 0}
            >
              <option value="">{selectedRegion ? "Select town or locality" : "Select town or locality from country"}</option>
              {towns.map((locality) => (
                <option key={locality} value={locality}>
                  {locality}
                </option>
              ))}
            </Select>
          </label>
        </>
      ) : (
        <>
          <label className="grid gap-1.5">
            <Label>Region / Province</Label>
            <Input name="region" defaultValue={defaultRegion} />
          </label>
          <label className="grid gap-1.5">
            <Label>Town or locality</Label>
            <Input name="town_or_locality" defaultValue={defaultTownOrLocality} />
          </label>
        </>
      )}

      <label className="grid gap-1.5">
        <Label>Village / address area</Label>
        <Input name="village" defaultValue={defaultVillage} />
      </label>

      <div className="col-span-full border-t border-[var(--hh-border)] pt-4 mt-2 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="notification_consent"
            className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--hh-purple)] focus:ring-[var(--hh-purple)]"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <div className="grid gap-0.5">
            <span className="text-sm font-bold text-slate-800">
              Notification Consent
            </span>
            <span className="text-xs text-[#66736d] leading-normal">
              I consent to receiving appointment-related reminders and administrative communication through the contact channels I provide.
            </span>
          </div>
        </label>

        {defaultNotificationConsentAt && (
          <div className="flex items-center gap-2 text-xs text-[#66736d] bg-[#fbf9fe] border border-[#ecdff9] rounded-lg p-2.5 w-fit">
            <span className="font-semibold text-slate-700">Consent captured at:</span>
            <span>{new Date(defaultNotificationConsentAt).toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
