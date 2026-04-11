# Story 17.3: User Account & Personalization Features

Status: ready-for-dev

## Story

As a User,
I want my Google avatar displayed, a timezone dropdown in settings, a light/dark mode toggle, and an option to keep me logged in,
So that the platform feels personalized and convenient.

**Consolidates:** Original stories 17.8, 17.10, 17.11, 17.12

## Acceptance Criteria

### AC1: Google Account Avatar (was 17.8)
- On Google OAuth login, the user's Google profile photo URL is stored in the database.
- Avatar appears in: top bar (nav-user), sidebar, and profile page.
- If no Google photo exists, fallback to initials (existing behavior in `nav-user.tsx`).

### AC2: Selectable Timezone in Settings (was 17.10)
- Timezone field in center settings is a searchable dropdown (not a text input).
- Dropdown lists all IANA timezone identifiers.
- Current timezone is pre-selected.

### AC3: Light/Dark Mode Toggle (was 17.11)
- A theme toggle is accessible from the user nav dropdown menu.
- Dark mode applies a consistent dark palette across all pages.
- Theme preference is persisted in localStorage (existing `theme-provider.tsx` implementation).
- System preference is respected as default.

### AC4: Extend Login Session (was 17.12)
- A "Keep me logged in" checkbox is available on the login page.
- When checked, session/refresh token persistence is set to `LOCAL` (survives browser close, ~90 days via Firebase).
- When unchecked, session persistence is set to `SESSION` (cleared on browser close).

## Tasks / Subtasks

- [ ] **Task 1: Google Avatar Storage & Display** (AC: #1)
  - [ ] **Backend:** In the Google signup/login endpoint (`POST /api/v1/auth/signup/center/google` and login flow): extract `user.photoURL` from the Firebase user object and store it in the `avatarUrl` field on the User model
  - [ ] **Backend:** Add a Prisma migration if `avatarUrl` column doesn't exist on the User table (check schema first)
  - [ ] **Frontend:** Verify `nav-user.tsx` (~lines 67-72, 88-92) already uses `user.avatarUrl` for `AvatarImage` — if so, this should work automatically once backend stores it
  - [ ] **Frontend:** Verify avatar also displays on the profile page (`ProfileEditForm.tsx`)
  - [ ] Ensure fallback to initials still works when `avatarUrl` is null

- [ ] **Task 2: Timezone Searchable Dropdown** (AC: #2)
  - [ ] In `apps/webapp/src/features/tenants/center-settings-page.tsx` (~line 29): replace the timezone text input with a searchable Combobox/Select
  - [ ] Use `Intl.supportedValuesOf('timeZone')` to get IANA timezone list (modern browsers support this)
  - [ ] Use Shadcn `Command` + `Popover` pattern (Combobox) for searchable dropdown — this is the standard Shadcn pattern for searchable selects
  - [ ] Pre-select the current center timezone value
  - [ ] Keep `UpdateCenterSchema` Zod validation as-is (timezone is already a string field)

- [ ] **Task 3: Expose Dark Mode Toggle** (AC: #3)
  - [ ] **Existing infrastructure:** `theme-provider.tsx` and `theme-toggle-button.tsx` already exist with full implementation (localStorage persistence, system preference detection, light/dark/system options)
  - [ ] Add the `ThemeToggleButton` to the user nav dropdown in `apps/webapp/src/core/components/common/nav-user.tsx`
  - [ ] Verify dark mode renders correctly across key pages (dashboard, exercises, grading, settings)
  - [ ] Fix any Tailwind classes that don't have proper `dark:` variants if visual issues are found
  - [ ] The existing implementation stores theme in localStorage key `"vite-ui-theme"` — this is sufficient

- [ ] **Task 4: Extend Login Session ("Keep Me Logged In")** (AC: #4)
  - [ ] In the login page component: add a "Keep me logged in" checkbox using Shadcn `Checkbox` + `Label`
  - [ ] **Firebase persistence:** Before calling `signInWithEmailAndPassword` or `signInWithPopup`, set persistence:
    - Checked: `setPersistence(auth, browserLocalPersistence)` — token survives browser close (~default Firebase behavior)
    - Unchecked: `setPersistence(auth, browserSessionPersistence)` — token cleared on browser close
  - [ ] Import `browserLocalPersistence`, `browserSessionPersistence`, `setPersistence` from `firebase/auth`
  - [ ] Default checkbox state: checked (most users want persistent sessions)
  - [ ] This is purely frontend — no backend changes needed. Firebase manages token refresh automatically.

- [ ] **Task 5: Verify & Test**
  - [ ] Run `pnpm build` — zero errors
  - [ ] Test Google login flow — avatar should appear after login
  - [ ] Test timezone dropdown — search and select a timezone
  - [ ] Test dark mode — toggle and verify persistence across page reloads
  - [ ] Test "Keep me logged in" — verify session behavior difference

## Dev Notes

### Architecture Compliance
- **Auth:** Firebase Auth with custom claims — session persistence is controlled via Firebase SDK, not custom JWT
- **Backend:** Fastify + Prisma — follow Controller-Service-Repository pattern in `apps/backend/src/modules/auth/`
- **Frontend:** React + Vite + Shadcn/UI + Tailwind CSS
- **State:** React Context for auth (`auth-context.tsx`), React Query for server state
- **Types:** Zod schemas in `packages/types/` — if schema changes needed, update there first then regenerate

### Key Files to Touch
| File | Change |
|------|--------|
| Backend auth module (Google signup/login handler) | Store `photoURL` → `avatarUrl` |
| `packages/db/prisma/schema.prisma` | Verify `avatarUrl` field exists on User model |
| `apps/webapp/src/core/components/common/nav-user.tsx` | Verify avatar display, add ThemeToggleButton |
| `apps/webapp/src/features/tenants/center-settings-page.tsx` | Replace timezone input with Combobox |
| `apps/webapp/src/features/auth/` (login page) | Add "Keep me logged in" checkbox + Firebase persistence |
| `apps/webapp/src/core/components/common/theme-toggle-button.tsx` | Already exists — just needs to be wired into nav |

### Existing Infrastructure to Reuse
- **Theme system:** `theme-provider.tsx` + `theme-toggle-button.tsx` are fully implemented. Do NOT rebuild.
- **Avatar component:** `nav-user.tsx` already renders `<Avatar>` with `user.avatarUrl` and fallback. Just needs backend to populate the field.
- **Combobox pattern:** Shadcn has a standard Combobox pattern using `Command` + `Popover`. Use it for timezone.
- **Firebase persistence API:** `setPersistence()` is a standard Firebase method — no custom session logic needed.

### Anti-Patterns to Avoid
- Do NOT create a custom session management system — Firebase handles token refresh
- Do NOT store avatars as base64 in the DB — store the URL string from Google
- Do NOT use a third-party timezone library — `Intl.supportedValuesOf('timeZone')` is sufficient
- Do NOT rebuild the theme system — it already exists and works
- Do NOT modify `schema.d.ts` directly — it's auto-generated from the backend OpenAPI spec

### Generated Files Warning
- `apps/webapp/src/schema/schema.d.ts` is auto-generated. If backend API changes are needed:
  1. Start backend: `pnpm --filter=backend dev`
  2. Regenerate: `pnpm --filter=webapp sync-schema-dev`

### References
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 17, Stories 17.8, 17.10-17.12]
- [Source: _bmad-output/planning-artifacts/architecture.md — Auth, Frontend Patterns, Component Library]
- [Source: CLAUDE.md — Generated Files Warning]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
