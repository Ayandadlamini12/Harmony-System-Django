# Harmony Mattermost Setup Plan

## Purpose

Mattermost will run as a separate Harmony Health chat stack for internal staff communication. Harmony MIS remains the source of truth for patients, appointments, consent forms, visits, cases, and audit history.

## Deployment Shape

- Portainer stack name: `harmony-mattermost`
- Public URL: `https://chat.harmonyhealthsz.com`
- Mattermost container: `harmony-mattermost-app`
- Database container: `harmony-mattermost-db`
- Tunnel container: `cloudflared-harmony-mattermost`
- Compose file: `mattermost-deployment-stack.yml`

## Why Separate From MIS

- Mattermost can restart or upgrade without disturbing patient records.
- Mattermost has its own database, files, plugins, logs, and tunnel.
- Harmony MIS integration can be added gradually through APIs and webhooks.

## Initial Mattermost Structure

Team:

- `Harmony Health`

Recommended channels:

- `town-square`
- `reception`
- `clinical-team`
- `appointments`
- `consent-forms`
- `patient-handover`
- `admin-operations`
- `system-notifications`

Recommended private channels later:

- `doctors`
- `management`
- `confidential-approvals`

## Integration Phases

### Phase 1: Staff Chat

- Deploy Mattermost.
- Create the first system admin account through the web UI.
- Create the Harmony Health team and starter channels.
- Add staff users manually.

### Phase 2: MIS Notifications

Harmony MIS can post operational messages to Mattermost for:

- Patient check-in.
- Consent form pending or signed.
- Appointment booked.
- Follow-up due.
- Employee onboarding request.

### Phase 3: Patient-Linked Discussions

Harmony MIS can store Mattermost references:

- `mattermost_channel_id`
- `mattermost_post_id`
- `mattermost_thread_id`

These references can be linked to patients, appointments, visits, cases, or documents.

### Phase 4: n8n Bridge

n8n can route messages between Harmony MIS, Mattermost, Telegram, WhatsApp, and email.

## Security Notes

- Do not hardcode the Cloudflare tunnel token in the compose file.
- Do not hardcode database passwords in the compose file.
- Keep Mattermost as an internal staff communication tool first.
- Do not send confidential patient data into general channels.
- Use private channels or controlled MIS links for sensitive clinical information.
