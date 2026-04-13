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
- Avatar appears in: top bar (TopBar), sidebar (nav-user via app-sidebar), and profile page.
- If no Google photo exists, fallback to initials (existing behavior).

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
- ALREADY IMPLEMENTED. Verify existing "Remember me" checkbox works correctly.
- When checked, session persistence is `LOCAL` (survives browser close).
- When unchecked, session persistence is `SESSION` (cleared on browser close).

## Tasks / Subtasks

- [ ] **Task 1: Google Avatar — Verify Backend + Fix Frontend Display** (AC: #1)
  - [ ] **Backend ALREADY DONE:** `auth.service.ts` already extracts `picture` from Firebase decoded token (line 122) and stores it as `avatarUrl` on user create (line 174) and update (line 166). Prisma schema has `avatarUrl String? @map("avatar_url")` on the User model. **No backend changes needed.**
  - [ ] **Frontend — Verify display chain:** `app-sidebar.tsx:87` maps `user?.avatarUrl` → `avatar` prop for `NavUser`. `TopBar.tsx:67` uses `user.avatarUrl` directly. `profile-page.tsx:251` uses `displayUser.avatarUrl`. All three display points are already wired.
  - [ ] **Verify:** Log in with a Google account that has a profile photo. Confirm avatar appears in sidebar, top bar, and profile page. Confirm initials fallback works when `avatarUrl` is null.
  - [ ] **If avatar does NOT appear:** Check that the Google OAuth flow actually reaches `auth.service.ts` and that the `picture` field is populated in the Firebase decoded token. Debug from there.

- [ ] **Task 2: Timezone Searchable Dropdown** (AC: #2)
  - [ ] In `apps/webapp/src/features/tenants/center-settings-page.tsx` (~line 170-185): replace the timezone `<Input placeholder="e.g. Asia/Ho_Chi_Minh">` with a searchable Combobox
  - [ ] Use `Intl.supportedValuesOf('timeZone')` to get the IANA timezone list (modern browsers support this)
  - [ ] Build Combobox by composing `Command` + `Popover` from existing Shadcn components:
    - `Command` is at `packages/ui/src/components/command.tsx` (based on `cmdk` library)
    - `Popover` is at `packages/ui/src/components/popover.tsx`
    - There is NO standalone Combobox component — you must compose them. Follow the Shadcn Combobox pattern: `<Popover><PopoverTrigger><Button>` + `<PopoverContent><Command><CommandInput><CommandList><CommandEmpty><CommandGroup><CommandItem>`
  - [ ] Pre-select the current center timezone value from the form state
  - [ ] Keep `UpdateCenterSchema` Zod validation as-is (timezone is already a string field)
  - [ ] Ensure the dropdown is accessible (keyboard navigation, aria labels) — the `Command` component handles most of this

- [ ] **Task 3: Expose Dark Mode Toggle in Nav** (AC: #3)
  - [ ] **Existing infrastructure:** `theme-provider.tsx` and `theme-toggle-button.tsx` already exist at `apps/webapp/src/core/components/common/` with full implementation (localStorage persistence, system preference detection, light/dark/system options)
  - [ ] Add `ThemeToggleButton` as a `DropdownMenuItem` in the user nav dropdown in `apps/webapp/src/core/components/common/nav-user.tsx` — insert it between the "My Profile" item and the "Log Out" item (between lines 114-115)
  - [ ] **Integration approach:** `ThemeToggleButton` currently renders its own `DropdownMenu`. To embed it inside `NavUser`'s dropdown, you may need to either: (a) extract the theme cycling logic and render a simple `DropdownMenuItem` that cycles through themes on click, or (b) use a sub-menu pattern. Option (a) is cleaner.
  - [ ] Verify dark mode renders correctly across key pages (dashboard, exercises, grading, settings)
  - [ ] Fix any Tailwind classes that don't have proper `dark:` variants if visual issues are found
  - [ ] Theme is stored in localStorage key `"vite-ui-theme"` — this is sufficient, do not change

- [ ] **Task 4: Verify Existing "Keep Me Logged In"** (AC: #4)
  - [ ] **ALREADY FULLY IMPLEMENTED** in `apps/webapp/src/features/auth/components/login-form.tsx`:
    - `rememberMe` field in Zod schema (line 30) with default `false` (line 47)
    - Checkbox UI with label from i18n `loginForm.rememberMe` (lines 157-173)
    - `setPersistence()` call before `signInWithEmailAndPassword` (lines 58-61)
    - Imports: `browserLocalPersistence`, `browserSessionPersistence`, `setPersistence` from `firebase/auth` (lines 14-18)
  - [ ] **Verify only:** Confirm checkbox is visible on login page. Test that checking "Remember me" persists the session across browser close. Test that unchecking it clears the session on browser close.
  - [ ] **Google OAuth note:** Check if `signInWithPopup` (Google login in `login-page.tsx`) also calls `setPersistence`. If not, Google logins may always use the default Firebase persistence (LOCAL). This may be acceptable — document the behavior.

- [ ] **Task 5: Build & Regression Check**
  - [ ] Run `pnpm build` — zero errors
  - [ ] Run existing tests: `pnpm test` — no regressions
  - [ ] Manual checks: avatar display, timezone search/select, dark mode toggle + persistence, remember-me behavior

## Dev Notes

### Architecture Compliance
- **Auth:** Firebase Auth with custom claims — session persistence controlled via Firebase SDK, not custom JWT
- **Backend:** Fastify + Prisma — Controller-Service-Repository pattern in `apps/backend/src/modules/auth/`
- **Frontend:** React + Vite + Shadcn/UI + Tailwind CSS
- **State:** React Context for auth (`auth-context.tsx`), React Query for server state
- **Styling:** Mobile-first Tailwind responsive (`sm:`, `md:` prefixes). Min 44px touch targets per WCAG. CSS-only responsiveness, no JS-based detection.
- **Types:** Zod schemas in `packages/types/` — if schema changes needed, update there first then regenerate

### Key Files to Touch
| File | Change |
|------|--------|
| `apps/webapp/src/features/tenants/center-settings-page.tsx` | Replace timezone `<Input>` with `Command` + `Popover` Combobox |
| `apps/webapp/src/core/components/common/nav-user.tsx` | Add theme toggle to dropdown menu |
| `apps/webapp/src/core/components/common/theme-toggle-button.tsx` | May need to extract cycling logic for embedding in dropdown |

### Already Implemented (Verify Only)
| File | What's Done |
|------|-------------|
| `apps/backend/src/modules/auth/auth.service.ts` | Google `picture` → `avatarUrl` storage (lines 122, 166, 174) |
| `packages/db/prisma/schema.prisma` | `avatarUrl String? @map("avatar_url")` on User model |
| `apps/webapp/src/core/components/common/app-sidebar.tsx` | Maps `user.avatarUrl` → `avatar` prop for `NavUser` (line 87) |
| `apps/webapp/src/core/components/layout/TopBar.tsx` | Displays `user.avatarUrl` in avatar (line 67) |
| `apps/webapp/src/features/users/profile-page.tsx` | Displays `displayUser.avatarUrl` in avatar (line 251) |
| `apps/webapp/src/features/auth/components/login-form.tsx` | Full "Remember me" with `setPersistence` (lines 14-18, 30, 47, 58-61, 157-173) |

### Existing Infrastructure to Reuse
- **Theme system:** `theme-provider.tsx` + `theme-toggle-button.tsx` are fully implemented. Do NOT rebuild.
- **Avatar display chain:** Fully wired from backend to all three frontend display points. Do NOT recreate.
- **Command component:** `packages/ui/src/components/command.tsx` — use with `Popover` for Combobox pattern.
- **Firebase persistence:** Already implemented in login form. Do NOT duplicate.

### Anti-Patterns to Avoid
- Do NOT re-implement Google avatar storage — it's already in `auth.service.ts`
- Do NOT re-implement "Keep me logged in" — it's already in `login-form.tsx`
- Do NOT create a custom session management system — Firebase handles token refresh
- Do NOT store avatars as base64 in the DB — store the URL string from Google
- Do NOT use a third-party timezone library — `Intl.supportedValuesOf('timeZone')` is sufficient
- Do NOT rebuild the theme system — it already exists and works
- Do NOT modify `schema.d.ts` directly — it's auto-generated from the backend OpenAPI spec
- Do NOT create a standalone Combobox component file — compose `Command` + `Popover` inline

### Previous Story Patterns (from 17-02)
- Responsive: `flex flex-col sm:flex-row` for stacking on mobile
- Touch targets: `min-h-[44px]` for WCAG compliance
- Components: Shadcn only — no custom implementations
- Sidebar tooltips: `delayDuration={250}` standardized

### Generated Files Warning
- `apps/webapp/src/schema/schema.d.ts` is auto-generated. If backend API changes are needed:
  1. Start backend: `pnpm --filter=backend dev`
  2. Regenerate: `pnpm --filter=webapp sync-schema-dev`

### References
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 17, Stories 17.8, 17.10-17.12]
- [Source: _bmad-output/planning-artifacts/architecture.md — Auth, Frontend Patterns, Component Library]
- [Source: apps/backend/src/modules/auth/auth.service.ts — Google avatar already implemented]
- [Source: apps/webapp/src/features/auth/components/login-form.tsx — Remember me already implemented]
- [Source: 17-02-responsive-and-polish.md — Responsive patterns and WCAG standards]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
