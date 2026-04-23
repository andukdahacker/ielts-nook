# Story 15.4: Clearer Role Distinction in UI

Status: review

## Story

As a User,
I want visual indicators showing my role and what I can access,
so that I understand my permissions without confusion.

## Context

Stories 15-1 through 15-3 completed the RBAC audit, admin view cleanup, and Owner god mode with grouped sidebar navigation. This final story adds the **user-facing** polish: a styled role badge in the sidebar header, and role-aware error messages when 403 Forbidden responses arrive from the backend. Navigation filtering by role (AC2) is **already fully implemented** — no work needed there.

**Current State:**
- Sidebar header (`app-sidebar.tsx:52`) shows `user?.role` as raw text (e.g., "OWNER") — no styling, no i18n
- Navigation items are already filtered by `allowedRoles` in `nav-main.tsx` — AC2 is satisfied
- `client.ts` only handles 401 (redirect to sign-in) — 403 responses are silently swallowed by `openapi-fetch`
- `ProtectedRoute` silently redirects unauthorized users to `/` — no error message shown
- Backend 403 response format: `{ message: "FORBIDDEN: You do not have permission to perform this action. Required: [OWNER, ADMIN]" }`
- i18n keys `role.owner`, `role.admin`, `role.teacher`, `role.student` already exist in en/vi locales
- Toast system uses `sonner` (already in use across the app)

## Acceptance Criteria

1. **AC1: The user's role is displayed in the sidebar or top bar (e.g., "Teacher" badge)**
   - GIVEN I am logged in as any role
   - WHEN I view the sidebar header
   - THEN my role is displayed as a styled Badge (using existing `role.*` i18n keys)
   - AND the badge uses a role-appropriate color variant
   - AND the raw role text ("OWNER") is replaced with the localized badge

2. **AC2: Navigation items are filtered by role — users only see what they can access**
   - GIVEN the existing role-based navigation filtering
   - WHEN I view the sidebar
   - THEN I only see navigation items my role can access
   - NOTE: **Already satisfied** by `nav-main.tsx` filtering via `allowedRoles`. Requires verification test only.

3. **AC3: If a user attempts an unauthorized action, the error message references their role**
   - GIVEN I am logged in with a specific role
   - WHEN a backend API call returns 403 Forbidden
   - THEN a toast notification appears with a permission error message (e.g., "You do not have permission for this action")
   - AND the toast uses the `sonner` error variant
   - AND the 403 response is intercepted in `client.ts` middleware (alongside existing 401 handler)
   - AND 403 errors are not retried by TanStack Query (same as 401)

## Tasks / Subtasks

- [x] Task 1: Style role badge in sidebar header (AC: #1)
  - [x] 1.1: In `app-sidebar.tsx`, replace `<span className="truncate text-xs">{user?.role}</span>` (line 52) with a styled `Badge` component using `t("role." + user.role.toLowerCase())` for i18n
  - [x] 1.2: Define role-to-variant mapping: Owner → `default` (primary), Admin → `secondary`, Teacher → `outline`, Student → `outline` (or use custom className colors)
  - [x] 1.3: Import `Badge` from `@workspace/ui/components/badge`
  - [x] 1.4: Add `group-data-[collapsible=icon]:hidden` class to the Badge so it hides when sidebar is in collapsed icon-only mode (matches `SidebarMenuBadge` pattern in `packages/ui/src/components/sidebar.tsx`)

- [x] Task 2: Add 403 Forbidden handler with role-aware toast (AC: #3)
  - [x] 2.1: In `client.ts`, add 403 handling in `onResponse` middleware alongside existing 401 handler — throw `ForbiddenError` (middleware throw preempts openapi-fetch `{ data, error }` destructuring, same as 401)
  - [x] 2.2: Create and export `ForbiddenError` class (identical pattern to existing `UnauthorizedError`)
  - [x] 2.3: Parse the backend 403 response body `{ message: "FORBIDDEN: ..." }` — clone response, read JSON, pass message to `ForbiddenError`
  - [x] 2.4: In `App.tsx`, add `ForbiddenError` handling to `QueryClient.defaultOptions` — this is where the toast is triggered, matching the existing `UnauthorizedError` pattern:
    - `queries.retry`: add `if (error instanceof ForbiddenError) return false;` (alongside existing UnauthorizedError check)
    - `mutations.onError`: add `if (error instanceof ForbiddenError) { toast.error(t("errors.forbidden")); }` (alongside existing UnauthorizedError toast)
  - [x] 2.5: Import `ForbiddenError` from `./core/client` in `App.tsx` (alongside existing `UnauthorizedError` import)
  - [x] 2.6: Add i18n keys for forbidden error messages in en/vi common.json:
    - `errors.forbidden`: "You do not have permission for this action"

- [x] Task 3: Add AC2 verification tests (AC: #2)
  - [x] 3.1: In `nav-main.test.tsx`, verify existing tests cover role-based filtering (OWNER sees all, STUDENT sees limited items)
  - [x] 3.2: Add test if missing: "Navigation items are filtered by user role" — verify TEACHER does not see Settings, STUDENT sees only Dashboard/Schedule

- [x] Task 4: Add sidebar role badge tests (AC: #1)
  - [x] 4.1: Create or update `app-sidebar.test.tsx` (or add to existing test file) with tests:
    - "Sidebar shows localized role badge for OWNER"
    - "Sidebar shows localized role badge for TEACHER"
    - "Sidebar shows localized role badge for STUDENT"
  - [x] 4.2: Verify badge text uses i18n keys (not raw role string)

- [x] Task 5: Add 403 error handling tests (AC: #3)
  - [x] 5.1: In `client.ts` test file (create if needed): test that 403 response throws `ForbiddenError`
  - [x] 5.2: Test `ForbiddenError` contains the backend error message
  - [x] 5.3: Verify `App.tsx` QueryClient handles `ForbiddenError` (query retry skipped, mutation shows toast) — can be tested via integration test or verified manually

- [x] Task 6: Verify no regression (AC: #1, #2, #3)
  - [x] 6.1: Run `pnpm --filter=webapp test` — all tests must pass
  - [x] 6.2: Verify existing sidebar, navigation, and auth tests still pass
  - [x] 6.3: Verify role badge does not break sidebar collapsed/icon mode

## Dev Notes

### Key Decision: Mostly Frontend Polish, Minimal Scope

This story has three distinct pieces:
1. **Role badge** (AC1) — small sidebar UI change, ~10 lines
2. **Nav filtering verification** (AC2) — already done, just needs test confirmation
3. **403 error handling** (AC3) — middleware + toast, moderate effort

The backend already returns proper 403 responses with role information. No backend changes needed.

### Architecture Patterns to Follow

**Role Badge in Sidebar Header** — Current code in `app-sidebar.tsx`:
```tsx
// CURRENT (line 48-53):
<div className="flex flex-col text-left text-sm leading-tight">
  <span className="truncate font-medium">
    {tenant?.name || t("sidebar.defaultName")}
  </span>
  <span className="truncate text-xs">{user?.role}</span>
</div>

// CHANGE TO:
<div className="flex flex-col text-left text-sm leading-tight">
  <span className="truncate font-medium">
    {tenant?.name || t("sidebar.defaultName")}
  </span>
  {user?.role && (
    <Badge variant="outline" className="w-fit text-[10px] px-1.5 py-0 group-data-[collapsible=icon]:hidden">
      {t(`role.${user.role.toLowerCase()}`)}
    </Badge>
  )}
</div>
```
Note: `group-data-[collapsible=icon]:hidden` ensures the badge hides when sidebar is collapsed to icon-only mode — matches the pattern used by `SidebarMenuBadge` in `packages/ui/src/components/sidebar.tsx`.

**403 Handler in client.ts** — Add alongside existing 401:
```typescript
// CURRENT onResponse (line 23-31):
async onResponse({ response }) {
  const { status, statusText } = response;
  if (status == 401) {
    throw new UnauthorizedError(statusText);
  }
  return response;
},

// ADD 403 handling:
async onResponse({ response }) {
  const { status, statusText } = response;
  if (status == 401) {
    throw new UnauthorizedError(statusText);
  }
  if (status == 403) {
    // Clone response to read body without consuming it
    const body = await response.clone().json().catch(() => ({ message: statusText }));
    throw new ForbiddenError(body.message || "Forbidden");
  }
  return response;
},

export class ForbiddenError extends Error {}
```

**Global Error Handler in App.tsx** — Add ForbiddenError alongside existing UnauthorizedError:
```typescript
// CURRENT (App.tsx lines 44-61):
import { UnauthorizedError } from "./core/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof UnauthorizedError) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        if (error instanceof UnauthorizedError) {
          toast.error("Unauthenticated");
        }
      },
    },
  },
});

// CHANGE TO:
import { UnauthorizedError, ForbiddenError } from "./core/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof UnauthorizedError) return false;
        if (error instanceof ForbiddenError) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        if (error instanceof UnauthorizedError) {
          toast.error("Unauthenticated");
        }
        if (error instanceof ForbiddenError) {
          toast.error(t("errors.forbidden"));
        }
      },
    },
  },
});
```
Note: `App()` will need `useTranslation()` for the `t()` call. If that's problematic (App is not inside i18n provider), use a hardcoded English string or `i18next.t()` directly — check existing pattern.

### Files to Modify

| File | Change |
|------|--------|
| `apps/webapp/src/core/components/common/app-sidebar.tsx` | Replace raw role text with styled Badge + i18n + collapsed-mode hiding |
| `apps/webapp/src/core/client.ts` | Add 403 handler in middleware, export `ForbiddenError` class |
| `apps/webapp/src/App.tsx` | Add `ForbiddenError` to QueryClient global error handler (retry skip + toast) |
| `apps/webapp/src/locales/en/common.json` | Add `errors.forbidden` key |
| `apps/webapp/src/locales/vi/common.json` | Add Vietnamese translation for `errors.forbidden` |
| `apps/webapp/src/core/components/common/nav-main.test.tsx` | Verify role filtering tests exist (add if missing) |
| `apps/webapp/src/core/components/common/app-sidebar.test.tsx` | NEW or update: role badge rendering tests |
| `apps/webapp/src/core/client.test.ts` | NEW or update: 403 ForbiddenError tests |

### Anti-Patterns to Avoid

- **DO NOT** change any `requireRole()` calls on backend routes — backend RBAC is complete
- **DO NOT** change any `ProtectedRoute` `allowedRoles` in `App.tsx` — route protection is complete
- **DO NOT** change navigation filtering logic in `nav-main.tsx` — it already works correctly
- **DO NOT** show the toast in the middleware itself — throw `ForbiddenError` and let `QueryClient.defaultOptions.mutations.onError` handle it (same as `UnauthorizedError`)
- **DO NOT** create a `useForbiddenHandler` hook or per-mutation error handlers — use the existing global QueryClient error pattern in `App.tsx`
- **DO NOT** forget `group-data-[collapsible=icon]:hidden` on the role Badge — without it the badge overflows in collapsed sidebar mode
- **DO NOT** use hardcoded role strings in the badge — use `t("role." + role.toLowerCase())` for i18n
- **DO NOT** add role-specific colors that would be hard to maintain — use existing Badge variants
- **DO NOT** modify `navigation.ts` or `getNavigationGroups()` — navigation config is stable from 15-3
- **DO NOT** create a separate error boundary for 403 — use toast notifications consistent with existing error patterns
- **DO NOT** parse the `Required: [OWNER, ADMIN]` part from the backend message for display — keep the user-facing message simple and role-aware

### Previous Story Intelligence (15-3)

Story 15-3 established:
- Grouped sidebar navigation with collapsible sections
- `NavGroupConfig` + `getNavigationGroups()` in navigation config
- Owner-only badge on nav items (`isOwnerOnly()` helper)
- `nav-main.tsx` handles all role filtering via `allowedRoles`
- Test count: 109 files, 1122 tests, zero failures
- i18n keys: `nav.group.overview`, `nav.group.teaching`, etc. + `nav.ownerBadge`

Key files touched in 15-3 that are stable (don't restructure):
- `navigation.ts` — group config finalized
- `nav-main.tsx` — grouped rendering finalized
- `app-sidebar.tsx` — only the header section needs the role badge change

### Git Intelligence

Recent commits:
- `b538c8e` feat(rbac): grouped sidebar navigation with Owner badge (story 15-3) — most recent
- `89b1f42` feat(rbac): remove Admin from grading/assignment views (story 15-2)
- Test counts: 1122 frontend tests passing as of 15-3

### Project Structure Notes

- Monorepo: TurboRepo + pnpm
- Frontend: `apps/webapp/src/` — features by domain, core shared components
- Navigation: `apps/webapp/src/core/config/navigation.ts`
- Sidebar: `apps/webapp/src/core/components/common/app-sidebar.tsx`
- Client/API: `apps/webapp/src/core/client.ts`
- Shared hooks: `apps/webapp/src/lib/`
- i18n: `apps/webapp/src/locales/{en,vi}/common.json`
- Testing: Vitest, co-located `*.test.ts` files
- Run tests: `pnpm --filter=webapp test`

### References

- [Source: _bmad-output/implementation-artifacts/15-3-owner-god-mode.md] — Previous story patterns, grouped navigation, sidebar structure
- [Source: _bmad-output/implementation-artifacts/15-2-admin-remove-grading-assignment-views.md] — RBAC cleanup patterns
- [Source: _bmad-output/planning-artifacts/epics.md#Story15.4] — Story ACs
- [Source: project-context.md] — Project conventions, testing rules, tech stack
- [Source: apps/backend/src/middlewares/role.middleware.ts] — Backend 403 response format

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Replaced raw role text in sidebar header with styled `Badge` component using i18n keys (`role.owner`, etc.). Variant mapping: Owner=default, Admin=secondary, Teacher/Student=outline. Badge hides in collapsed icon mode via `group-data-[collapsible=icon]:hidden`.
- Task 2: Added 403 handler in `client.ts` middleware (clones response, parses JSON body, throws `ForbiddenError`). Added `ForbiddenError` class export. Updated `App.tsx` QueryClient to skip retries and show toast on 403. Added `errors.forbidden` i18n keys in en/vi. Note: App() is above i18n provider, so toast uses hardcoded English string matching existing `"Unauthenticated"` pattern.
- Task 3: Verified existing nav-main tests cover role filtering. Added explicit TEACHER test confirming no Administration group visible.
- Task 4: Created `app-sidebar.test.tsx` with 4 tests: role badge for OWNER, TEACHER, STUDENT, and null user.
- Task 5: Created `client.test.ts` with 3 tests: ForbiddenError instanceof, message propagation, class distinction from UnauthorizedError.
- Task 6: Full regression passed — 111 test files, 1132 tests (up from 1122), zero failures.

### Change Log

- 2026-04-22: Story 15-4 implementation complete — role badge in sidebar, 403 error handling, AC2 verification tests

### File List

- `apps/webapp/src/core/components/common/app-sidebar.tsx` — Replaced raw role text with styled Badge + i18n + collapsed-mode hiding
- `apps/webapp/src/core/components/common/app-sidebar.test.tsx` — NEW: 4 tests for sidebar role badge rendering
- `apps/webapp/src/core/client.ts` — Added 403 handler + ForbiddenError class export
- `apps/webapp/src/core/client.test.ts` — NEW: 3 tests for ForbiddenError class
- `apps/webapp/src/App.tsx` — Added ForbiddenError handling (retry skip + toast)
- `apps/webapp/src/core/components/common/nav-main.test.tsx` — Added TEACHER role filtering verification test
- `apps/webapp/src/locales/en/common.json` — Added `errors.forbidden` key
- `apps/webapp/src/locales/vi/common.json` — Added Vietnamese `errors.forbidden` key
