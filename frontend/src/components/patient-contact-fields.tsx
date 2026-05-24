"use client";

import { useMemo, useState } from "react";

import { PhoneNumberInput, parsePhone } from "@/components/phone-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getLocationRegions } from "@/lib/location-data";

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
  const initialCountryCode = parsePhone(defaultPrimaryPhone).countryCode;
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [region, setRegion] = useState(defaultRegion);
  const [townOrLocality, setTownOrLocality] = useState(defaultTownOrLocality);
  const regions = useMemo(() => getLocationRegions(countryCode), [countryCode]);
  const selectedRegion = regions.find((item) => item.region === region);
  const hasDropdownLocations = regions.length > 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <PhoneNumberInput
        label="Primary phone"
        name="primary_phone"
        defaultValue={defaultPrimaryPhone}
          onCountryCodeChange={(value) => {
            setCountryCode(value);
            if (!getLocationRegions(value).some((item) => item.region === region)) {
              setRegion("");
              setTownOrLocality("");
            }
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
            <Label>Region</Label>
            <Select
              name="region"
              value={region}
              onChange={(event) => {
                setRegion(event.currentTarget.value);
                setTownOrLocality("");
              }}
            >
              <option value="">Select region</option>
              {regions.map((item) => (
                <option key={item.region} value={item.region}>
                  {item.region}
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
              disabled={!selectedRegion}
            >
              <option value="">Select town or locality</option>
              {selectedRegion?.localities.map((locality) => (
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
