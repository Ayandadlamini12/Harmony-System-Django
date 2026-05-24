export const RELATIONSHIP_OPTIONS = [
  { value: "", label: "Select relationship" },
  { value: "mother", label: "Mother" },
  { value: "father", label: "Father" },
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "cousin", label: "Cousin" },
  { value: "guardian", label: "Guardian" },
  { value: "caregiver", label: "Caregiver" },
  { value: "friend", label: "Friend" },
  { value: "employer", label: "Employer" },
  { value: "neighbor", label: "Neighbor" },
  { value: "other", label: "Other" }
] as const;

export function relationshipLabel(value?: string, other?: string) {
  if (value === "other") return other || "Other";
  return RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.label || value || "";
}
