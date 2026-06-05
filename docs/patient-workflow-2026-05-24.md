# Patient Workflow Foundation - 2026-05-24

## Registration Scope

New patient enrollment now records non-clinical intake details separately from the medical recording flow that will be expanded next.

## Identity And Contact Changes

- `National ID` is presented as `National / Passport ID` to support Eswatini patients and patients from neighboring countries.
- `Email` is now available on patient records and is optional.
- Primary and secondary phone fields now collect:
  - searchable country dialing extension
  - local phone number
- The submitted phone value is stored as one international string, for example `+26876000000`.
- Registration and edit forms use `country-state-city` so the primary phone country code loads matching region/state and town/locality options.
- Eswatini (`+268`) now loads Eswatini regions and towns from the shared country dataset; changing the primary phone code immediately refreshes the location dropdowns for the selected country where data exists.
- Next of kin details are part of non-confidential intake:
  - full name(s)
  - phone number with country dialing extension
  - optional email
  - relationship dropdown
  - `Other` relationship option with a typed relationship field

## Patient Number Rule

New records use the Harmony patient number format:

`HHPAT-<sequence><yy><last6phone>`

Example:

`HHPAT-10026301048`

Where:

- `HHPAT-` is the fixed prefix.
- `100` is the starting patient sequence and increments for each new Harmony patient number.
- `26` is the last two digits of the current year.
- `301048` is the last 6 digits of the primary phone number.

Older `PAT-YYYY-000001` patient numbers are not rewritten. The new format is used for newly created patients.

## Existing Patient Check-In

Already registered patients are checked in from `/check-ins` by reception or from `/tablet-check-in` on a mounted front-desk tablet.

- Reception can search by cell number, Harmony patient ID, or National / Passport ID.
- The search uses the backend patient search endpoint through `/api/patients/search`, so it is not limited to the first visible page of patients.
- Matched patients expose two visit choices:
  - `New visit`
  - `Follow up`
- The check-in creates a `PatientCheckIn` record with:
  - patient
  - visit type
  - status (`waiting`, `in_visit`, `completed`, `cancelled`)
  - method (`reception`, `tablet`, `api`)
  - source label and identifier type
- The waiting list reads `waiting` check-ins from `/api/check-ins/`.
- Clinicians can start the visit from the waiting list; the selected visit type is passed into `/visits/new`.
- The public tablet lookup uses `/api/check-ins/lookup/` and accepts exact patient code, National / Passport ID, or phone digits. This keeps the check-in workflow ready for future sources such as appointment links, QR codes, WhatsApp, or external kiosk integrations.
- The tablet self check-in screen first asks the patient to choose the identifier type:
  - Cell Number
  - Patient ID
  - National / Passport ID
- National / Passport ID values are treated as alphanumeric exact IDs, not as phone-number digits.

## Current Patient Process Rules

The patient journey now needs to represent what is next for each patient on a service day.

For a new patient:

1. Registration
2. Consent form signing
3. Check-in / queue
4. Medical and family history
5. Confidential clinical records
6. Vitals
7. New visit / consultation

For an existing patient:

1. Check-in / appointment check-in
2. Review whether confidential records changed
3. Vitals
4. New visit or follow-up

Consent signing is a blocker before vitals and clinical records. Consent and check-in do not need one fixed order; the system should block only the steps that require consent.

## Patient Journey Tracking

`PatientJourney` records the patient's active process for a specific service date. It links to check-in, appointment, and visit records where available.

Stages include:

- registered
- queued
- checked in
- vitals recorded
- waiting clinician
- in consultation
- visit recorded
- completed
- cancelled

The patient view and `/patient-flow` should show the current stage and the next expected action.

## Consent Form Requirement

New patients must have a consent form signed before clinical data capture proceeds. The system supports generated consent documents and a handwritten digital signature workflow. Manual paper signing with later n8n-assisted upload/verification is planned but should still require human review.

## Visit And Follow-Up Direction

The visit model is moving toward being the main case/event record. Ongoing symptoms/problems are tracked as items that can stay open across visits and be marked resolved during follow-up.

Follow-up forms should:

- pull previous/open complaint or symptom/problem context
- hide previous diagnosis, remedy, and recommendations by default behind a view/eye action
- record new evaluation, remedy response, diet/lifestyle/exercise/energy changes, and notes
- allow new symptom/problem items to be added
- allow existing symptom/problem items to be marked resolved with notes
