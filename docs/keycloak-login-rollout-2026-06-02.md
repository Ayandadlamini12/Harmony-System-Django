# Keycloak Login Rollout - 2026-06-02

## Live Identity Setup

- Keycloak URL: `https://auth.harmonyhealthsz.com`
- Realm: `harmony-health`
- MIS client: `harmony-mis`
- MIS login URL: `https://mis.harmonyhealthsz.com/login`
- MIS backend Keycloak mode: enabled
- Local fallback: enabled during transition

Secrets are stored in Portainer stack environment variables and the server-side `/data/compose/69/.env` file. Do not commit the client secret.

## User ID Format

Employee login IDs use the `HH200` range.

The first issued sequence starts at `5110` and increments by `77`:

- `HH2005110`
- `HH2005187`
- `HH2005264`
- `HH2005341`

## Issued Staff IDs

| User ID | Email | Role | Previous Local Username |
| --- | --- | --- | --- |
| `HH2005110` | `admin@harmonyhealthsz.com` | Admin | `mrayanda` |
| `HH2005187` | `clinician.test@harmonyhealthsz.com` | Clinician | `clinician_test` |
| `HH2005264` | `reception.test@harmonyhealthsz.com` | Receptionist | `reception_test` |
| `HH2005341` | `behlulilesukati@gmail.com` | Clinician | `behlulilesukati` |

The duplicate legacy `admin` account and `testuser123` were left untouched to avoid disrupting existing local fallback access until the team confirms they can be retired.

## Staff Login Instructions

1. Open the Keycloak setup email sent to your registered email address.
2. Set your new password when prompted.
3. Go to `https://mis.harmonyhealthsz.com/login`.
4. Sign in using your Harmony User ID, not your old username.
5. Keep your email address active because it is used for password recovery and account verification.

## Verification Completed

- Backend Django system check passed.
- Frontend TypeScript check passed.
- Frontend production build passed.
- Keycloak client `harmony-mis` verified with direct access grants enabled.
- Live MIS login route verified through the public Cloudflare tunnel using a disposable test identity.
- Disposable test identity was deleted after verification.
