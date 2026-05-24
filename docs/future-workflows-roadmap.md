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
