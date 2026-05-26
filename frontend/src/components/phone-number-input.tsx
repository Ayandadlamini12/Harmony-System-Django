"use client";

import { getCountries, getCountryCallingCode } from "libphonenumber-js";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const countryNameFormatter = new Intl.DisplayNames(["en"], { type: "region" });

export const countryCodeOptions = getCountries()
  .map((country) => {
    const dialCode = `+${getCountryCallingCode(country)}`;
    return {
      country,
      dialCode,
      label: `${countryNameFormatter.of(country) || country} (${dialCode})`
    };
  })
  .sort((a, b) => a.label.localeCompare(b.label));

const dialCodes = Array.from(new Set(countryCodeOptions.map((option) => option.dialCode))).sort((a, b) => b.length - a.length);

export function resolveCountryFromDialCode(dialCode: string) {
  const normalized = dialCode.trim();
  return countryCodeOptions.find((option) => option.dialCode === normalized)?.country || "SZ";
}

export function parsePhone(value?: string) {
  const text = value || "";
  const compact = text.replace(/\s/g, "");
  const dialCode = dialCodes.find((code) => compact.startsWith(code));
  if (!dialCode) return { countryCode: "+268", country: "SZ", number: text };
  return { countryCode: dialCode, country: resolveCountryFromDialCode(dialCode), number: compact.slice(dialCode.length).replace(/\D/g, "") };
}

export function PhoneNumberInput({
  label,
  name,
  defaultValue,
  required = false,
  onCountryCodeChange,
  onCountryChange
}: {
  label: string;
  name: "primary_phone" | "secondary_phone" | "next_of_kin_phone";
  defaultValue?: string;
  required?: boolean;
  onCountryCodeChange?: (countryCode: string) => void;
  onCountryChange?: (country: { dialCode: string; country: string }) => void;
}) {
  const parsed = parsePhone(defaultValue);
  const listId = `${name}-country-codes`;

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="grid grid-cols-[92px_minmax(10rem,1fr)] gap-2 max-[420px]:grid-cols-1">
        <input
          className="hh-input"
          defaultValue={parsed.countryCode}
          list={listId}
          name={`${name}_country_code`}
          onChange={(event) => {
            const dialCode = event.currentTarget.value.trim();
            onCountryCodeChange?.(dialCode);
            onCountryChange?.({ dialCode, country: resolveCountryFromDialCode(dialCode) });
          }}
          pattern="^\+\d{1,4}$"
          placeholder="+268"
          required={required}
        />
        <Input
          defaultValue={parsed.number}
          inputMode="tel"
          name={`${name}_number`}
          placeholder="7600 0000"
          required={required}
        />
      </div>
      <datalist id={listId}>
        {countryCodeOptions.map((option) => (
          <option key={`${option.country}-${option.dialCode}`} value={option.dialCode}>
            {option.label}
          </option>
        ))}
      </datalist>
    </div>
  );
}
