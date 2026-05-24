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
- For Eswatini primary phone codes (`+268`), registration and edit forms show controlled `Region` and `Town or locality` dropdowns.
- For other country codes, region/province and town/locality remain typed fields until those country datasets are added.
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
