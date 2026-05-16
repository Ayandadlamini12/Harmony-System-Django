# Migration Notes

## Source

Original project: `harmony-health-system`

The source Laravel app used:

- Laravel 13
- Inertia Laravel
- Vue 3
- Sanctum
- Vite

## Redesign decisions

The new project separates concerns into two deployable applications:

- Django REST Framework owns domain logic, authentication, persistence, audit records, webhook ingestion, and background jobs.
- Next.js owns routing, views, dashboards, and staff-facing interactions.

This avoids coupling PHP runtime concerns, Node asset builds, Inertia page contracts, queues, and web server behavior into one application container.

## Domain mapping

| Laravel model | Django model |
| --- | --- |
| `User` | `accounts.User` |
| `Patient` | `clinic.Patient` |
| `PatientProfile` | `clinic.PatientProfile` |
| `PatientCondition` | `clinic.PatientCondition` |
| `Visit` | `clinic.Visit` |
| `Vital` | `clinic.Vital` |
| `FollowUpEvaluation` | `clinic.FollowUpEvaluation` |
| `AuditLog` | `clinic.AuditLog` |

## UI mapping

| Laravel/Inertia page | Next.js route |
| --- | --- |
| `Dashboard.vue` | `/` |
| `Patients/Index.vue` | `/patients` |
| `Patients/Create.vue` | `/patients/new` |
| `Visits/Index.vue` | `/visits` |
| `Users/Index.vue` | `/staff` |

## Pending next work

- Wire patient registration form to authenticated API submission.
- Add patient detail route and visit creation route.
- Add refresh-token storage strategy.
- Add role-aware menu filtering once authentication screens are added.
- Add import/export tasks through Celery.
