"use client";

import { useState } from "react";

import { PhoneNumberInput } from "@/components/phone-number-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RELATIONSHIP_OPTIONS } from "@/lib/relationships";

export function NextOfKinFields({
  defaultFullName = "",
  defaultPhone = "",
  defaultEmail = "",
  defaultRelationship = "",
  defaultRelationshipOther = ""
}: {
  defaultFullName?: string;
  defaultPhone?: string;
  defaultEmail?: string;
  defaultRelationship?: string;
  defaultRelationshipOther?: string;
}) {
  const [relationship, setRelationship] = useState(defaultRelationship);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <label className="grid gap-1.5">
        <Label>Next of kin full name(s)</Label>
        <Input name="next_of_kin_full_name" defaultValue={defaultFullName} />
      </label>
      <PhoneNumberInput label="Next of kin phone" name="next_of_kin_phone" defaultValue={defaultPhone} />
      <label className="grid gap-1.5">
        <Label>Next of kin email</Label>
        <Input name="next_of_kin_email" type="email" defaultValue={defaultEmail} />
      </label>
      <label className="grid gap-1.5">
        <Label>Relationship</Label>
        <Select
          name="next_of_kin_relationship"
          value={relationship}
          onChange={(event) => setRelationship(event.target.value)}
        >
          {RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>
      {relationship === "other" && (
        <label className="grid gap-1.5">
          <Label>Specify relationship</Label>
          <Input name="next_of_kin_relationship_other" defaultValue={defaultRelationshipOther} />
        </label>
      )}
    </div>
  );
}
