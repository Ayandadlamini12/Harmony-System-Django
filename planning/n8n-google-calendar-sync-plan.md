# n8n Google Calendar Sync Plan

## Purpose

Prepare Harmony MIS appointment scheduling for a future n8n workflow that mirrors appointment state into Google Calendar. Django remains the scheduling source of truth. Google Calendar is a projection for visibility and reminders, not a place where clinical scheduling rules are decided.

## Configuration Contract

The following variables are reserved and should be kept on backend, Celery worker, and Celery beat services:

```env
N8N_CALENDAR_SYNC_ENABLED=false
N8N_CALENDAR_SYNC_WEBHOOK_URL=http://n8n-host:5600/webhook/harmony-calendar-sync
N8N_CALENDAR_SYNC_OUTBOUND_SECRET=change-me-calendar-sync-secret
```

Meaning:

- `N8N_CALENDAR_SYNC_ENABLED`: feature gate. Keep `false` until the n8n workflow and Google credential are ready.
- `N8N_CALENDAR_SYNC_WEBHOOK_URL`: n8n Webhook trigger URL that receives Harmony appointment events.
- `N8N_CALENDAR_SYNC_OUTBOUND_SECRET`: shared secret Harmony will send to n8n, expected as a header such as `X-Harmony-N8N-Outbound-Secret`.

Existing related variables:

```env
N8N_CALLBACK_SECRET=change-me-n8n-callback-secret
HARMONY_PUBLIC_URL=https://mis.harmonyhealthsz.com
```

## Event Source

Harmony already writes scheduling outbox events through `SchedulingOutboxEvent` for:

- `appointment.created`
- `appointment.updated`
- `appointment.moved`
- `appointment.cancelled`

The future Celery dispatcher should read pending calendar-capable `SchedulingOutboxEvent` records and POST them to `N8N_CALENDAR_SYNC_WEBHOOK_URL` when `N8N_CALENDAR_SYNC_ENABLED=true`.

No direct Google Calendar call should be made from Django.

## Proposed Harmony to n8n Payload

```json
{
  "event_type": "appointment.created",
  "aggregate_type": "appointment",
  "aggregate_id": "123",
  "occurred_at": "2026-06-21T10:00:00Z",
  "appointment": {
    "id": 123,
    "patient_public_id": "uuid",
    "patient_code": "HHPAT-000000001",
    "patient_name": "Redacted or operational display name",
    "practitioner": 45,
    "practitioner_name": "Clinician Name",
    "room": 2,
    "room_name": "Consultation Room 2",
    "appointment_type_label": "Consultation",
    "start_at": "2026-06-22T08:30:00Z",
    "end_at": "2026-06-22T09:00:00Z",
    "status": "booked",
    "status_label": "Booked",
    "cancel_reason": null,
    "mis_url": "https://mis.harmonyhealthsz.com/appointments"
  }
}
```

Privacy rule: do not send diagnosis, notes, medical aid details, vitals, clinical narratives, phone numbers, or national ID values to Google Calendar. Calendar event titles and descriptions must be operational only.

## n8n Workflow Blueprint

Workflow name:

```text
Harmony MIS - Google Calendar Appointment Sync
```

Nodes:

1. Webhook Trigger
   - Method: `POST`
   - Path: `harmony-calendar-sync`
   - Validate `X-Harmony-N8N-Outbound-Secret`.

2. Validate and Normalize Payload
   - Reject missing `event_type`, `aggregate_id`, `appointment.start_at`, or `appointment.end_at`.
   - Map Harmony status to calendar behavior.

3. Resolve External Event Mapping
   - Use a persistent mapping store. Preferred:
     - n8n Data Store if available, or
     - Google Calendar extended properties, or
     - Harmony callback endpoint added later.
   - Key: `appointment:<appointment_id>`.

4. Google Calendar Action
   - `appointment.created`: create event.
   - `appointment.updated` or `appointment.moved`: update existing event if mapped, otherwise create event.
   - `appointment.cancelled`: delete event or mark title as `[CANCELLED]`, depending on operational preference.

5. Harmony Callback
   - Future endpoint should record external calendar event ID and sync status.
   - Header: `X-Harmony-N8N-Callback-Secret`.

## Google Calendar Event Shape

Title:

```text
Consultation - HHPAT-000000001
```

Description:

```text
Harmony MIS appointment
Patient: HHPAT-000000001
Clinician: Clinician Name
Room: Consultation Room 2
Status: Booked
Open in MIS: https://mis.harmonyhealthsz.com/appointments
```

Extended properties:

```json
{
  "private": {
    "harmony_appointment_id": "123",
    "harmony_patient_public_id": "uuid",
    "harmony_event_source": "Harmony MIS"
  }
}
```

## Deferred Backend Work

Do not implement until the n8n workflow is ready:

- Celery task to dispatch `SchedulingOutboxEvent` records to n8n.
- `ExternalSyncRecord` updates for Google event IDs.
- Harmony callback endpoint for calendar sync status.
- Retry dashboard for failed calendar sync events.

## Activation Checklist

1. Create or confirm Google Calendar credential in n8n.
2. Create the n8n workflow from this blueprint.
3. Add live `N8N_CALENDAR_SYNC_WEBHOOK_URL` and `N8N_CALENDAR_SYNC_OUTBOUND_SECRET` to the production `.env`.
4. Implement the Harmony Celery dispatcher.
5. Enable `N8N_CALENDAR_SYNC_ENABLED=true`.
6. Test create, move, update, and cancel flows with one test clinician and one test patient.

