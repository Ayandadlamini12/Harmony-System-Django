# n8n Employee Onboarding Workflow

Harmony MIS supports a Telegram-led employee onboarding workflow through n8n.

## Workflow

Workflow name in n8n:

`Harmony MIS - Telegram Employee Onboarding`

Current status:

`inactive`

The workflow starts when an employee sends a message such as `hi`, `hello`, `start`, `/start`, or `restart` to the Telegram bot. The bot then asks for the onboarding fields one by one:

- Full names
- Email address
- Phone number
- WhatsApp number
- Department / team
- Requested role

After the employee confirms with `YES`, n8n submits a pending enrollment request to Harmony MIS.

## Harmony MIS Endpoint

```http
POST /api/employee-enrollment-requests/
```

Required header:

```http
X-Harmony-Webhook-Secret: <HARMONY_WEBHOOK_SECRET>
```

Example payload:

```json
{
  "full_names": "Jane Dlamini",
  "email": "jane@harmonyhealthsz.com",
  "phone_number": "+26876000000",
  "whatsapp_number": "+26876000000",
  "telegram_chat_id": "123456",
  "telegram_username": "jane_d",
  "requested_role": "Receptionist",
  "requested_team": "Reception",
  "source": "telegram"
}
```

The endpoint creates a pending request only. It does not create an active login account.

## Admin Review

Pending requests are visible in Harmony MIS at:

`/employees/enrollment`

Admins should review the details, then create the actual user account through the normal user enrollment flow.

## Activation Checklist

Before activating the workflow in n8n:

1. Create the Telegram bot with BotFather.
2. Add the Telegram credential to both Telegram nodes in n8n.
3. Set `HARMONY_WEBHOOK_SECRET` in n8n to match the MIS backend secret.
4. Confirm the live MIS backend has the employee enrollment migration applied.
5. Activate the n8n workflow.

Because the n8n API token was shared during setup, rotate that API token after the workflow is confirmed.
