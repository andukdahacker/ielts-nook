# Story 11.6: Exercise Edit Breadcrumbs

Status: review

## Story

As a Teacher editing an exercise,
I want breadcrumb links to navigate to the correct pages and show meaningful names,
so that I can navigate back without going through the dashboard.

## Acceptance Criteria

1. **AC1:** Each breadcrumb segment links to its corresponding page (not the dashboard).
2. **AC2:** Breadcrumb hierarchy shows: Exercises > [Exercise Name] > Edit. (Note: the original feedback suggested `Class/Course > Exercises > Edit`, but exercises are center-scoped entities with no single parent class/course — the `Exercise → Assignment → Class` relationship is many-to-many. The flat hierarchy accurately reflects the data model and URL structure.)
3. **AC3:** All breadcrumb links are functional and load the correct content. The exercise name segment must NOT be a clickable link (route `exercises/:id` does not exist — it hits the catch-all redirect to `/` on App.tsx:365).
4. **AC4:** Exercise name displays in the breadcrumb instead of the raw UUID/ID.
5. **AC5:** The "new exercise" page shows appropriate breadcrumbs (Exercises > New).

## Tasks / Subtasks

- [x] Task 1: Create minimal breadcrumb label context and wire it up (AC: #1, #3, #4)
  - [x] 1.1: Create `apps/webapp/src/core/context/breadcrumb-context.tsx` — a minimal context (~30-40 lines) following the `HighlightContext` pattern at `features/grading/hooks/use-highlight-context.tsx`. Stores a `Record<string, string>` of segment → label overrides, plus a `nonClickableSegments: Set<string>` to mark segments that should render as text, not links.
  - [x] 1.2: Export `BreadcrumbProvider` (wraps children with context) and `useBreadcrumbOverrides()` hook (returns `{ setLabel(segment, label), setNonClickable(segment), clearAll() }`). Use `useEffect` cleanup to clear labels on unmount so stale labels don't persist across navigations.
  - [x] 1.3: Wrap DashboardShell children with `BreadcrumbProvider` in `DashboardShell.tsx`
  - [x] 1.4: Update `Breadcrumbs.tsx` to merge context labels with existing `customLabels` prop (context takes precedence). Also check `nonClickableSegments` — if a segment is marked non-clickable, render it as `<BreadcrumbPage>` (text) instead of `<BreadcrumbLink>`.
- [x] Task 2: Set breadcrumb labels in ExerciseEditor (AC: #2, #4, #5)
  - [x] 2.1: In `ExerciseEditor.tsx`, call `useBreadcrumbOverrides()` to set the exercise ID segment label to `exercise?.title ?? "Loading..."` and mark it as non-clickable. Use `useEffect` dependent on `[id, exercise?.title]`.
  - [x] 2.2: No special handling needed for "new" route — `formatSegment("new")` already produces "New" which is acceptable.
- [x] Task 3: Add static config entries (AC: #1)
  - [x] 3.1: Add `new: "New"` and `edit: "Edit"` to `breadcrumbConfig` in `breadcrumb-config.ts` for explicitness.
- [x] Task 4: Update unit tests (AC: all)
  - [x] 4.1: Add test cases in `Breadcrumbs.test.tsx` for exercise edit path with context-provided labels
  - [x] 4.2: Add test that non-clickable segments render as `<BreadcrumbPage>` (span), not links
  - [x] 4.3: Add test for "new exercise" breadcrumb path
  - [x] 4.4: Update `breadcrumb-config.test.ts` to assert `new` and `edit` entries exist
- [x] Task 5: Add E2E coverage (AC: all)
  - [x] 5.1: Add E2E test in `apps/e2e/tests/exercises/` verifying breadcrumb renders on exercise edit page with exercise title (not UUID)
  - [x] 5.2: Verify clicking "Exercises" breadcrumb link navigates to exercise list page
  - [x] 5.3: Verify exercise name segment is NOT a link (no `<a>` tag)
  - [x] 5.4: Verify breadcrumb on new exercise page shows "Exercises > New"

## Dev Notes

### Root Cause Analysis

The breadcrumb system auto-generates from `location.pathname`. For exercise edit route `/:centerId/dashboard/exercises/:id/edit`, visible segments are:

| Segment | Current Display | Current Link Target | Problem |
|---------|----------------|-------------------|---------|
| `exercises` | "Exercises" | `/:centerId/dashboard/exercises` | Works correctly |
| `:id` (UUID) | UUID formatted as Title Case | `/:centerId/dashboard/exercises/:id` | **BUG: No route exists at this path (hits catch-all → redirect to `/` on App.tsx:365); shows UUID instead of name** |
| `edit` | "Edit" | N/A (last segment, not a link) | Works correctly |

### Implementation Strategy

**Approach: Minimal Breadcrumb Label Context** (~30-40 lines)

The `Breadcrumbs` component renders inside `DashboardShell` which has no knowledge of child page data. Use a minimal React Context (following the `HighlightContext` pattern at `features/grading/hooks/use-highlight-context.tsx`) to let child pages push label overrides up:

```tsx
// breadcrumb-context.tsx — minimal implementation
const BreadcrumbContext = createContext<BreadcrumbContextType>({ labels: {}, nonClickable: new Set() });

// In ExerciseEditor.tsx:
const { setLabel, setNonClickable } = useBreadcrumbOverrides();
useEffect(() => {
  if (id) {
    setLabel(id, exercise?.title ?? "Loading...");
    setNonClickable(id);
  }
  return () => clearAll();
}, [id, exercise?.title]);
```

**This is reusable** — other pages with dynamic IDs can use the same context:
- `mock-tests/:id/edit` — MockTestEditor
- `grading/:submissionId` — GradingQueuePage
- `feedback/:submissionId` — StudentFeedbackPage
- `profile/:userId` — ProfilePage

Build the context generically so these pages can adopt it later without changes.

### Key Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/webapp/src/core/context/breadcrumb-context.tsx` | **Create** | Minimal context: labels Record + nonClickable Set + hooks |
| `apps/webapp/src/core/components/layout/Breadcrumbs.tsx` | Modify | Read labels from context, check nonClickable for link rendering |
| `apps/webapp/src/core/config/breadcrumb-config.ts` | Modify | Add `new: "New"` and `edit: "Edit"` entries |
| `apps/webapp/src/core/components/layout/DashboardShell.tsx` | Modify | Wrap children with `<BreadcrumbProvider>` |
| `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` | Modify | Call `useBreadcrumbOverrides()` to set exercise title + non-clickable |
| `apps/webapp/src/core/components/layout/Breadcrumbs.test.tsx` | Modify | Add context-based label tests + non-clickable segment tests |
| `apps/webapp/src/core/config/breadcrumb-config.test.ts` | Modify | Assert `new` and `edit` entries |

### Architecture Compliance

- **Context pattern:** Follow `HighlightContext` at `features/grading/hooks/use-highlight-context.tsx` — split value/setter pattern, ~40 lines. [Source: codebase analysis]
- **Feature-first organization:** Breadcrumb context goes in `core/context/` since it's shared infrastructure. [Source: architecture.md — Structure Patterns]
- **shadcn/ui primitives:** Continue using `@workspace/ui/components/breadcrumb` — do NOT introduce new UI libraries. [Source: architecture.md — Technical Stack]
- **React Router:** Use `useLocation()` from `react-router` (already in use at Breadcrumbs.tsx:9). Do NOT switch to TanStack Router.
- **No backend changes:** Purely frontend. No new API endpoints.
- **Naming:** Context file: `breadcrumb-context.tsx`, hook: `useBreadcrumbOverrides` (camelCase). [Source: architecture.md — Code Naming Conventions]
- **Co-located tests:** Unit tests live next to source files. [Source: project-context.md — Testing Rules]

### Anti-Patterns to Avoid

- Do NOT fetch exercise data in the breadcrumb — ExerciseEditor already loads it via `useExercise(centerId, id)`. Pass the title through context.
- Do NOT create a new API endpoint for breadcrumb data.
- Do NOT make the exercise ID segment a clickable link — `exercises/:id` has no route and silently redirects to `/` via catch-all (App.tsx:365). Render as non-clickable text.
- Do NOT add a redirect route from `exercises/:id` → `exercises/:id/edit` — unnecessary complexity.
- Do NOT add class/course segments to breadcrumbs — exercises are center-scoped (Prisma: `Exercise.centerId`), related to classes only through the `Assignment` model (many-to-many). There is no single parent to show.
- Do NOT break existing breadcrumb behavior on other pages — context labels default to empty, so pages that don't use the hook get current behavior unchanged.

### Existing Code to Reuse

- **Breadcrumb UI primitives:** `@workspace/ui/components/breadcrumb` — `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`
- **Label resolution chain** (Breadcrumbs.tsx:35-38): `customLabels` → `breadcrumbConfig` → `formatSegment()`. Context labels should be checked first in this chain.
- **Exercise data hook:** `useExercise(centerId, id)` returns `{ exercise, isLoading }` — `exercise.title` is available once loaded
- **Exercise params:** `useParams<{ id: string }>()` at ExerciseEditor.tsx:336

### Testing Standards

- **Unit tests:** Vitest, co-located. Test context provider + hook, verify Breadcrumbs reads context labels and respects nonClickable segments.
- **E2E tests:** Playwright in `apps/e2e/tests/exercises/`. Use existing fixtures:
  - `createExerciseViaAPI(page, { skill: "READING", title: "..." })` from `apps/e2e/fixtures/exercise-fixtures.ts`
  - `gotoExercises(page)` for navigation
  - `getAppUrl("/exercises/${id}/edit")` for direct editor navigation
  - `closeAIAssistantDialog(page)` from `apps/e2e/utils/close-ai-assistant.ts`
  - `loginAs(page, TEST_USERS.OWNER)` from `apps/e2e/fixtures/auth.fixture.ts`
- **E2E selectors:** Use `getByRole("navigation", { name: /breadcrumb/i })` or `locator("nav[aria-label='breadcrumb']")` to target the breadcrumb nav element. Use `getByRole("link")` for clickable segments and check absence of link for non-clickable segments.
- **Cleanup:** Register `test.afterEach` to call `cleanupExercise(exerciseId)` via API.
- **Existing breadcrumb E2E tests:** `apps/e2e/tests/navigation/navigation.spec.ts` (lines 181-209) — minimal coverage, can add exercise-specific tests alongside or in the exercises folder.

### References

- [Source: apps/webapp/src/core/components/layout/Breadcrumbs.tsx] — Current breadcrumb auto-generation
- [Source: apps/webapp/src/core/config/breadcrumb-config.ts] — Static label mappings
- [Source: apps/webapp/src/core/components/layout/DashboardShell.tsx#L78] — Breadcrumb rendering (no props)
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#L336-337] — useParams + isEditing
- [Source: apps/webapp/src/features/grading/hooks/use-highlight-context.tsx] — Context pattern to follow
- [Source: apps/webapp/src/App.tsx#L179-213] — Exercise route definitions
- [Source: apps/webapp/src/App.tsx#L365] — Catch-all redirect (exercises/:id falls here)
- [Source: packages/db/prisma/schema.prisma#Exercise] — Exercise is center-scoped, no direct class FK
- [Source: apps/e2e/fixtures/exercise-fixtures.ts] — E2E helpers for exercise CRUD
- [Source: apps/e2e/tests/navigation/navigation.spec.ts#L181-209] — Existing breadcrumb E2E tests
- [Source: _bmad-output/implementation-artifacts/11-1-course-detail-next-button-fix.md] — Previous epic 11 patterns

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Unit test fix: `BreadcrumbPage` renders as `<span role="link" aria-disabled="true">` so `queryByRole("link")` matches it. Updated test to check `closest("a")` is null instead.

### Completion Notes List

- Created `breadcrumb-context.tsx` with split value/setter context pattern (following HighlightContext). Exports `BreadcrumbProvider`, `useBreadcrumbOverrides()`, `useBreadcrumbValues()`.
- Wrapped `SidebarInset` content in `BreadcrumbProvider` in `DashboardShell.tsx` so both `<Breadcrumbs>` (header) and `{children}` (main) share context.
- Updated `Breadcrumbs.tsx` label resolution chain: context labels → customLabels → breadcrumbConfig → formatSegment. Added `isNonClickable` check to render as `<BreadcrumbPage>` instead of `<BreadcrumbLink>`.
- `ExerciseEditor.tsx` calls `useBreadcrumbOverrides()` to set exercise title and mark ID segment non-clickable via `useEffect`.
- Added `new: "New"` and `edit: "Edit"` to `breadcrumbConfig` for explicitness.
- Added 4 new unit tests in `Breadcrumbs.test.tsx` (context labels, non-clickable segments, new exercise path, context precedence over customLabels).
- Added 1 new assertion in `breadcrumb-config.test.ts` for `new` and `edit` entries.
- Created `exercise-breadcrumbs.spec.ts` with 4 E2E tests covering all ACs.
- Full test suite: 95 files, 904 tests — all passing, zero regressions.

### Change Log

- 2026-04-04: Story 11.6 implementation complete — breadcrumb context, ExerciseEditor integration, unit + E2E tests

### File List

- `apps/webapp/src/core/context/breadcrumb-context.tsx` (new)
- `apps/webapp/src/core/components/layout/Breadcrumbs.tsx` (modified)
- `apps/webapp/src/core/components/layout/Breadcrumbs.test.tsx` (modified)
- `apps/webapp/src/core/components/layout/DashboardShell.tsx` (modified)
- `apps/webapp/src/core/config/breadcrumb-config.ts` (modified)
- `apps/webapp/src/core/config/breadcrumb-config.test.ts` (modified)
- `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` (modified)
- `apps/e2e/tests/exercises/exercise-breadcrumbs.spec.ts` (new)
