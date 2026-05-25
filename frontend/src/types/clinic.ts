export type DashboardStats = {
  total_patients: number;
  today_visits: number;
  pending_drafts: number;
  my_drafts: number;
  follow_ups_due: number;
};

export type Patient = {
  id: number;
  patient_code: string;
  national_id?: string | null;
  email?: string;
  primary_phone?: string;
  secondary_phone?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name_display: string;
  date_of_birth?: string | null;
  gender: string;
  region?: string;
  town_or_locality?: string;
  village?: string;
  next_of_kin_full_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_email?: string;
  next_of_kin_relationship?: string;
  next_of_kin_relationship_other?: string;
  status: string;
  last_visit_date?: string | null;
  profile?: PatientProfile;
  conditions?: PatientCondition[];
  visits?: Visit[];
  clinical_access?: "active" | "approval_required";
  current_journey?: PatientJourneySummary | null;
};

export type PatientProfile = {
  hiv_status: string;
  past_medical_history?: string;
  family_medical_history?: string;
  allopathic_medication?: string;
  other_important_information?: string;
  children_count?: number | null;
};

export type PatientCondition = {
  id: number;
  condition_code: string;
  condition_label: string;
  present: boolean;
  is_confidential: boolean;
  status: "active" | "historical" | "suspected";
  notes?: string;
  recorded_at?: string;
};

export type Visit = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  visit_type: string;
  visit_date: string;
  visit_time?: string | null;
  main_complaint: string;
  initial_complaints?: string;
  physical_examination?: string;
  diagnosis?: string;
  remedy?: string;
  reason_for_remedy?: string;
  dietary_recommendation?: string;
  lifestyle_recommendation?: string;
  vitals?: Vital[];
};

export type Vital = {
  id: number;
  visit: number;
  patient?: number;
  patient_name?: string;
  patient_code?: string;
  visit_label?: string;
  bp_first_reading?: string;
  bp_second_reading?: string;
  pulse?: number | null;
  resp_rate?: number | null;
  temperature?: string | null;
  weight?: string | null;
  glucose_mmol_l?: string | null;
  glucose_context?: string;
  glucose_food_type?: string;
  medication_taken_status?: string;
  recorded_at?: string;
  created_at?: string;
};

export type PatientCheckIn = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
  visit_type: string;
  status: "waiting" | "in_visit" | "completed" | "cancelled";
  method: "reception" | "tablet" | "api";
  identifier_type?: string;
  source_label?: string;
  note?: string;
  created_at: string;
  updated_at?: string;
};

export type PatientJourneySummary = {
  id: number;
  service_date: string;
  current_stage: string;
  current_stage_label: string;
  flow_type: string;
  flow_type_label: string;
  queue_number?: number | null;
  appointment_matched: boolean;
};

export type PatientJourneyEvent = {
  id: number;
  stage: string;
  stage_label: string;
  note?: string;
  recorded_by?: number | null;
  recorded_by_name?: string | null;
  created_at: string;
};

export type PatientJourney = PatientJourneySummary & {
  patient: number;
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
  check_in?: number | null;
  visit?: number | null;
  is_active: boolean;
  notes?: string;
  events: PatientJourneyEvent[];
  created_at: string;
  updated_at: string;
};

export type FormDraft = {
  id: number;
  draft_key: string;
  owner_user: number;
  owner_name?: string;
  form_type: "patient_registration" | "visit_new_consultation" | "visit_follow_up" | "vitals_entry" | "medical_history_update";
  form_type_label?: string;
  related_patient?: number | null;
  related_patient_name?: string | null;
  related_visit?: number | null;
  current_stage?: string;
  payload: Record<string, unknown>;
  status: "draft" | "submitted" | "abandoned";
  status_label?: string;
  created_at: string;
  updated_at: string;
  last_saved_at: string;
  submitted_at?: string | null;
};

export type ElevatedAccessRequest = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  requested_by: number;
  requested_by_name?: string;
  reviewed_by?: number | null;
  reviewed_by_name?: string | null;
  scope: string;
  status: "pending" | "approved" | "rejected" | "expired";
  reason?: string;
  review_note?: string;
  reviewed_at?: string | null;
  expires_at?: string | null;
  created_at: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  role: "admin" | "clinician" | "receptionist";
  is_active: boolean;
  avatar_url?: string | null;
};

export type ClinicianProfileEntry = Record<string, string>;

export type ClinicianProfile = {
  id: number;
  user: number;
  user_name?: string;
  username?: string;
  full_names: string;
  professional_title: string;
  display_name: string;
  professional_email: string;
  professional_phone: string;
  whatsapp_number: string;
  telegram_number: string;
  linkedin_url: string;
  facebook_url: string;
  portfolio_url: string;
  bio: string;
  clinical_interests: string;
  education: ClinicianProfileEntry[];
  career_details: ClinicianProfileEntry[];
  awards_certifications: ClinicianProfileEntry[];
  affiliations: ClinicianProfileEntry[];
  profile_completion: number;
  completed_sections: string[];
  missing_sections: { key: string; label: string }[];
  last_profile_reminder_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
