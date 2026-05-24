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
