export type DashboardStats = {
  total_patients: number;
  today_visits: number;
  pending_drafts: number;
  follow_ups_due: number;
};

export type Patient = {
  id: number;
  patient_code: string;
  national_id?: string | null;
  primary_phone?: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  full_name_display: string;
  date_of_birth?: string | null;
  gender: string;
  region?: string;
  town_or_locality?: string;
  village?: string;
  status: string;
  last_visit_date?: string | null;
  profile?: PatientProfile;
  visits?: Visit[];
};

export type PatientProfile = {
  hiv_status: string;
  past_medical_history?: string;
  family_medical_history?: string;
  allopathic_medication?: string;
  other_important_information?: string;
  children_count?: number | null;
};

export type Visit = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  visit_type: string;
  visit_date: string;
  main_complaint: string;
  diagnosis?: string;
  remedy?: string;
  vitals?: {
    bp_first_reading?: string;
    bp_second_reading?: string;
    pulse?: number;
    temperature?: string;
    weight?: string;
  };
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};
