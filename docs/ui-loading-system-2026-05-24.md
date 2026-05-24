# Harmony Loading System - 2026-05-24

## Purpose

The frontend now has a shared Harmony loading layer built on the existing shadcn-style component pattern. New pages should reuse these components instead of adding page-specific spinners or ad hoc loading text.

## Components

- `components/ui/spinner.tsx`: small accessible spinner for inline actions.
- `components/ui/skeleton.tsx`: shadcn-style skeleton primitive for data placeholders.
- `components/ui/progress.tsx`: determinate or indeterminate progress bar for sync, upload, import, and report generation flows.
- `components/harmony-loading.tsx`: branded wrappers:
  - `LoadingButton`
  - `HarmonySpinner`
  - `HarmonyPageLoader`
  - `HarmonyInlineLoader`
  - `HarmonyCardSkeleton`
  - `HarmonyTableSkeleton`
  - `HarmonyFormSkeleton`
- `components/harmony-toaster.tsx`: app-level Sonner toast host.
- `components/route-progress.tsx`: top route-transition progress indicator.

## Usage Standards

- Use `LoadingButton` for submit actions such as sign in, save visit, update password, approve access, and upload profile image.
- Use route `loading.tsx` files with skeletons for page data fetches. Keep layout chrome stable and only skeletonize the data region where possible.
- Use `Progress` for operations that may take time, especially uploads, imports, exports, sync, and report generation.
- Use Sonner toasts for non-blocking completion or error feedback. Keep messages operationally specific, for example `Visit saved` or `Could not submit access request`.
- Avoid full-screen overlays unless the operation must block the user from interacting with the current record.

## Current Wiring

- Global route progress is mounted from `app/layout.tsx`.
- Global app fallback is in `app/loading.tsx`.
- Skeleton loading routes exist for:
  - `/patients`
  - `/patients/[id]`
  - `/visits`
  - `/reports`
- Loading buttons and toasts are wired into:
  - login
  - register
  - change password
  - access request submit
  - approve/reject access request
  - profile image upload
  - sign out
  - visit save
