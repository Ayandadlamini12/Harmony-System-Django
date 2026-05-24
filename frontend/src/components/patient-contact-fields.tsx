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
};

export function PatientContactFields({
  defaultEmail = "",
  defaultPrimaryPhone = "",
  defaultSecondaryPhone = "",
  defaultRegion = "",
  defaultTownOrLocality = "",
  defaultVillage = ""
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

  return (
    <div className="grid gap-4 md:grid-cols-3">
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
        <Input name="email" type="email" defaultValue={defaultEmail} />
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
    </div>
  );
}
