export const CONFIDENTIAL_CONDITIONS = [
  { code: "epilepsy", label: "Epilepsy" },
  { code: "mental_disorders", label: "Mental disorders" },
  { code: "tuberculosis", label: "Tuberculosis" },
  { code: "injuries", label: "Injuries" },
  { code: "gynecological_diseases", label: "Gynecological diseases" },
  { code: "musculoskeletal_diseases", label: "Musculoskeletal diseases" },
  { code: "digestive_diseases", label: "Digestive diseases" },
  { code: "cancer", label: "Cancer" },
  { code: "headache", label: "Headache" },
  { code: "neurological", label: "Neurological" },
  { code: "urinary", label: "Urinary" },
  { code: "cardiovascular_disease", label: "Cardiovascular disease" },
  { code: "liver", label: "Liver" },
  { code: "skin", label: "Skin" },
  { code: "vascular", label: "Vascular" },
  { code: "chronic_respiratory", label: "Chronic respiratory" },
  { code: "stroke", label: "Stroke" },
  { code: "stis", label: "STIs" },
  { code: "influenza", label: "Influenza" },
  { code: "enteric_disease", label: "Enteric disease" },
  { code: "maternal_neonatal_disorders", label: "Maternal and neonatal disorders" }
] as const;

export type ConfidentialConditionCode = (typeof CONFIDENTIAL_CONDITIONS)[number]["code"];
