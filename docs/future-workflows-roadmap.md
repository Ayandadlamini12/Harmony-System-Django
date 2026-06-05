# Future Workflows Roadmap

## Scanned Paper Form To Draft

Future feature, not currently implemented.

Goal:

- Allow staff to scan or upload a hand-filled patient registration form.
- Use an n8n workflow as the automation helper.
- Use AI/OCR to extract patient registration fields from the scanned form.
- Save extracted values into Harmony as a `patient_registration` draft assigned to the reviewing user.
- Require a human review before any extracted data becomes a real patient record.

Expected flow:

1. Staff uploads or scans a paper registration form.
2. n8n receives the file through a webhook or form workflow.
3. n8n extracts text/data from the document and maps it to Harmony draft fields.
4. Harmony stores the extracted data as a user-linked draft.
5. The user sees the draft on their dashboard under unfinished drafts.
6. The user opens, reviews, corrects, and submits the draft.
7. Harmony audit logs record the source, reviewer, changes, and final submission.

Important rule:

- AI extraction must never directly create or modify clinical records without human review.

## n8n Operating Model

Use n8n as the workflow automation layer, not the clinical system of record.

Recommended uses:

- Scanned form intake and extraction.
- Human-in-the-loop approval steps before AI-assisted actions.
- WhatsApp, Telegram, email, and reminder workflows.
- Appointment and follow-up notifications.
- Failed workflow or failed sync alerts.
- External integration workflows that should not bloat the Django backend.

Rules:

- Harmony remains the source of truth for patients, visits, drafts, and audit logs.
- n8n should call Harmony APIs instead of writing directly to the Harmony database.
- AI-generated or OCR-generated patient data should be saved as drafts for review.
- Sensitive or clinical record changes must require human review and Harmony audit logging.
- Use narrow API credentials for n8n and avoid giving broad workflow-editing access to many users.

## API Access Manager

Future feature, not currently implemented.

Goal:

- Create a controlled API token and app-access management module for n8n, Telegram, WhatsApp, future mobile apps, and other integrations.
- Make every external app use its own API identity instead of sharing user credentials or broad system tokens.
- Control exactly which data each app can read, create, update, or upload.
- Monitor all integration activity through backend audit logs.

Recommended implementation:

- Use Django REST Framework permissions as the backend enforcement layer.
- Start with API-key based app access for server-to-server tools like n8n and Telegram workflows.
- Add scope-based permissions such as `patients:read`, `appointments:create`, `documents:upload`, `employee_onboarding:create`, and `clinical_records:read`.
- Consider Django OAuth Toolkit later when user-delegated OAuth2 access is needed.
- Consider an API gateway such as Kong later if traffic volume, rate limiting, analytics, or external developer access grows.
- Consider Open Policy Agent later for advanced policy rules, for example allowing a workflow to upload consent documents but never read diagnosis records.

API client records should track:

- App name.
- Owner.
- Environment: test or production.
- Allowed scopes.
- Optional allowed IP addresses.
- Status: active, suspended, expired, or revoked.
- Expiry date.
- Last used date and time.
- Created by and revoked by.

Audit requirements:

- Every API action must record the API client, user if available, endpoint, action, affected record, IP address, user agent, timestamp, and before/after data where relevant.
- Clinical or confidential record access must be especially visible in the audit log.
- Revoked tokens must stop working immediately.

Initial n8n access should be narrow:

- Allow `employee_onboarding:create`.
- Allow `documents:upload`.
- Allow `appointments:create`.
- Allow `messages:send`.
- Do not allow broad patient browsing.
- Do not allow `clinical_records:read`, `diagnosis:read`, or `confidential_records:read` unless a specific approved workflow requires it.

## Messaging And Communication Hub

Implemented foundation:

- Internal staff message threads are now stored in Harmony.
- Threads can reference patients, appointments, visits, cases, and generated documents.
- Participants are explicit users, so visibility can be controlled per conversation.
- Message delivery records already separate the internal message from the delivery channel.

Recommended next steps:

- Add context actions from patient and appointment screens, for example "Message assigned clinician" or "Discuss appointment".
- Add attachments after document storage rules are finalized.
- Add n8n delivery workers for Telegram, WhatsApp, and email using the `MessageDelivery` queue/status records.
- Add read receipts and notification counts in the top navigation.
- Add templates for common operational messages such as appointment reminders, follow-up reminders, consent form pending, and patient waiting.

Important rule:

- Harmony should remain the source of truth for the conversation and clinical context. n8n or provider APIs should only deliver or receive channel-specific messages and then call back into Harmony.

## Keycloak Identity Completion

Partially implemented / in progress.

Goal:

- Make Keycloak the central identity service for Harmony MIS and future Harmony-connected systems.
- Use Harmony-generated User IDs as usernames.
- Keep employee, supplier, and partner ID ranges separated.
- Allow realm managers to administer only the Harmony Health realm, not the master realm.

Required next steps:

- Connect MIS user creation to Keycloak user provisioning.
- Generate User IDs automatically based on account type.
- Map MIS roles to Keycloak groups or roles.
- Send setup instructions by email with the generated User ID.
- Remove old local fallback users only after production users are fully migrated.
- Keep local fallback only for emergency recovery until the rollout is complete.

## Brevo Transactional Email

Partially implemented / in progress.

Goal:

- Use Brevo for transactional email instead of relying on Zoho Free SMTP.
- Manage email configuration through Harmony system settings.
- Record email delivery results in `EmailDeliveryLog`.

Initial transactional emails:

- employee enrollment received / under review
- employee approval or rejection notices
- Keycloak setup instructions
- password setup/reset support messages
- appointment confirmations and reminders
- consent pending reminders
- support ticket notifications
- scheduled maintenance notices

## Role And Module Governance

Partially implemented / in progress.

Goal:

- Let admin enable or disable modules per role.
- Stop hardcoding all navigation behavior in the frontend.
- Support employee, supplier, and partner role families without mixing unrelated role options.

Recommended next steps:

- Complete the role module matrix UI.
- Enforce module permissions in backend endpoints, not only navigation.
- Add audit entries when role permissions change.
- Add default templates for common roles such as receptionist, clinician, admin, supplier contact, and partner contact.

## Consent Renewal And Document Governance

Planned / foundation implemented.

Goal:

- Prevent duplicate active consent forms.
- Define when consent expires or must be renewed.
- Apply generated letterhead, QR verification, stamps, and signature blocks to all generated documents.
- Use one reusable document-generation service for consent forms, reports, patient summaries, and future certificates.

Recommended next steps:

- Add consent validity rules.
- Add document template registry.
- Add document versioning and replacement rules.
- Add document status transitions for generated, pending signature, signed, verified, rejected, and expired.

## System Administration Modules

Planned / partially implemented.

System settings should continue expanding into:

- email settings
- location/access rules
- device and accessibility logs
- maintenance mode
- API/tokens
- audit and retention settings
- notification templates

Maintenance mode should allow admins to schedule notices before turning restricted access on.
