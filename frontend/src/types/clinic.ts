export type DashboardStats = {
  total_patients: number;
  today_visits: number;
  pending_drafts: number;
  my_drafts: number;
  follow_ups_due: number;
};

export type Patient = {
  id: number;
  public_id: string;
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
  marital_status?: string;
  occupation?: string;
  allergies?: string;
  smoking_status?: string;
  smoking_details?: string;
  smoking_years?: number | null;
  alcohol_status?: string;
  alcohol_details?: string;
  region?: string;
  town_or_locality?: string;
  village?: string;
  next_of_kin_full_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_email?: string;
  next_of_kin_relationship?: string;
  next_of_kin_relationship_other?: string;
  status: string;
  consent_status?: "pending" | "generated" | "signed" | "verified";
  last_visit_date?: string | null;
  profile?: PatientProfile;
  conditions?: PatientCondition[];
  documents?: PatientDocument[];
  visits?: Visit[];
  clinical_access?: "active" | "approval_required";
  current_journey?: PatientJourneySummary | null;
  patient_actions?: PatientWorkflowAction[];
};

export type PatientWorkflowAction = {
  key: "consent_forms" | "check_in" | "medical_history" | "confidential_records" | "vitals" | "visits";
  label: string;
  module_key: string;
  enabled: boolean;
  completed: boolean;
  reason: string;
  href: string;
  presentation: "dialog" | "page" | "tab";
  next?: boolean;
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

export type PatientDocument = {
  id: number;
  document_id: string;
  patient: number;
  document_type: "consent_form" | "patient_upload" | "report";
  document_type_label?: string;
  title: string;
  status: "generated" | "pending_signature" | "signed" | "verified" | "rejected";
  status_label?: string;
  file_url?: string;
  verification_payload?: Record<string, unknown>;
  signed_at?: string | null;
  generated_by?: number | null;
  generated_by_name?: string | null;
  created_at: string;
  updated_at: string;
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
  digestive_review?: Record<string, unknown>;
  general_review?: Record<string, unknown>;
  reproductive_review?: Record<string, unknown>;
  sleep_mental_review?: Record<string, unknown>;
  follow_up_review?: Record<string, unknown>;
  vitals?: Vital[];
  follow_up_evaluation?: FollowUpEvaluation;
  symptom_problems?: VisitSymptomProblem[];
};

export type VisitSymptomProblem = {
  id: number;
  patient: number;
  opened_visit: number;
  opened_visit_date?: string;
  resolved_visit?: number | null;
  resolved_visit_date?: string | null;
  description: string;
  note?: string;
  status: "open" | "resolved";
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type FollowUpEvaluation = {
  id?: number;
  previous_consult_symptoms?: string;
  dietary_changes?: string;
  lifestyle_changes?: string;
  exercise_notes?: string;
  energy_notes?: string;
  evaluation_notes?: string;
};

export type Case = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  patient_public_id?: string;
  visit: number;
  visit_date?: string;
  parent_case?: number | null;
  parent_case_title?: string | null;
  title: string;
  main_complaint?: string;
  physical_examination?: string;
  diagnosis?: string;
  remedy?: string;
  reason_for_remedy?: string;
  dietary_recommendation?: string;
  lifestyle_recommendation?: string;
  previous_consult_symptoms?: string;
  dietary_changes?: string;
  lifestyle_changes?: string;
  exercise_notes?: string;
  energy_notes?: string;
  evaluation_notes?: string;
  notes?: string;
  status: "open" | "resolved";
  resolved_at?: string | null;
  practitioner?: number | null;
  created_at: string;
  updated_at: string;
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

export type Appointment = {
  id: number;
  patient: number;
  patient_name?: string;
  patient_code?: string;
  patient_phone?: string;
  appointment_type: "new_consultation" | "follow_up" | "review";
  appointment_type_label?: string;
  appointment_date: string;
  appointment_time?: string | null;
  source: "internal" | "telegram" | "whatsapp" | "api";
  source_label?: string;
  assigned_clinician?: number | null;
  assigned_clinician_name?: string | null;
  notes?: string;
  status: "scheduled" | "checked_in" | "completed" | "cancelled" | "no_show";
  status_label?: string;
  checked_in_at?: string | null;
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
  appointment?: number | null;
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
  role: "admin" | "clinician" | "receptionist" | "supplier_contact" | "supplier_manager" | "partner_contact" | "partner_manager";
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

export type EmployeeEnrollmentRequest = {
  id: number;
  full_names: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  requested_role?: string;
  requested_team?: string;
  source: "telegram" | "whatsapp" | "internal" | "api";
  status: "pending" | "approved" | "rejected" | "cancelled";
  notes?: string;
  review_email_sent_at?: string | null;
  review_email_error?: string;
  reviewed_by?: number | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageRecipient = Pick<User, "id" | "username" | "email" | "first_name" | "last_name" | "name" | "role" | "is_active">;

export type RoleModuleDefinition = {
  key: string;
  label: string;
  category: string;
  description: string;
  default_roles: User["role"][];
  locked_admin?: boolean;
};

export type RoleModuleMatrix = {
  roles: User["role"][];
  modules: RoleModuleDefinition[];
  permissions: Record<User["role"], Record<string, boolean>>;
};

export type SystemEmailSettings = {
  id: number;
  is_enabled: boolean;
  provider: "brevo_api" | "smtp";
  brevo_api_key_is_set: boolean;
  smtp_host: string;
  smtp_port: number;
  encryption: "starttls" | "ssl" | "none";
  username: string;
  password_is_set: boolean;
  from_email: string;
  from_name: string;
  reply_to_email: string;
  reply_to_name: string;
  updated_at: string;
};

export type EmailDeliveryLog = {
  id: number;
  template_key: string;
  provider: "brevo_api" | "smtp";
  status: "pending" | "sent" | "failed";
  subject: string;
  to: string[];
  from_email: string;
  message_id: string;
  metadata: Record<string, unknown>;
  error: string;
  created_at: string;
  sent_at?: string | null;
};

export type MessageParticipant = {
  id: number;
  user: number;
  user_name: string;
  user_role: User["role"];
  role: "owner" | "member" | "observer";
  last_read_at?: string | null;
  is_muted: boolean;
  created_at: string;
};

export type MessageDelivery = {
  id: number;
  message: number;
  channel: "internal" | "email" | "telegram" | "whatsapp" | "api";
  status: "queued" | "sent" | "delivered" | "read" | "failed" | "skipped";
  recipient_user?: number | null;
  recipient_name?: string;
  destination?: string;
  provider?: string;
  error?: string;
  created_at: string;
};

export type Message = {
  id: number;
  thread: number;
  sender?: number | null;
  sender_name: string;
  sender_role?: User["role"];
  body: string;
  message_type: "user" | "system" | "handoff" | "external";
  external_channel: "internal" | "email" | "telegram" | "whatsapp" | "api";
  sent_at: string;
  created_at: string;
  deliveries?: MessageDelivery[];
};

export type MessageThread = {
  id: number;
  subject: string;
  thread_type: "direct" | "group" | "patient" | "appointment" | "system";
  patient?: number | null;
  patient_name?: string;
  patient_code?: string;
  appointment?: number | null;
  appointment_label?: string;
  visit?: number | null;
  clinical_case?: number | null;
  document?: number | null;
  created_by?: number | null;
  created_by_name?: string;
  last_message_at?: string | null;
  is_closed: boolean;
  participants: MessageParticipant[];
  messages: Message[];
  latest_message?: Message | null;
  is_active?: boolean;
  avatar_url?: string | null;
  unread_count?: number;
  created_at: string;
  updated_at: string;
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type SupportTicket = {
  id: number;
  title: string;
  description: string;
  status: "open" | "resolved";
  created_by?: number | null;
  created_by_name?: string | null;
  created_by_username?: string | null;
  created_by_email?: string | null;
  created_at: string;
  updated_at: string;
};
