# Story 11.1: Course Detail Next Button Fix

Status: ready-for-dev

## Story

As a Teacher editing a course,
I want pressing "Next" to save changes, close the sidebar, AND show the next screen,
So that I can progress through course setup without getting stuck.

## Acceptance Criteria

1. **AC1:** Pressing "Next" in the course detail sidebar saves any pending changes.
2. **AC2:** The sidebar closes after save completes.
3. **AC3:** The next screen/step in the course setup flow is displayed.
4. **AC4:** If save fails, an error message is shown and the user remains on the current screen.

## Bug Analysis

**Source:** User feedback item A1 (P0 — Critical). [Source: _bmad-output/planning-artifacts/user-feedback-backlog-2026-04-03.md, Epic A]

**Current behavior:** The CourseDrawer has a 2-step wizard. The "Next" button on Step 1 only validates `name` and `color` fields then calls `setStep(2)`. The reported bug is that pressing "Next" saves changes and closes the sidebar but does NOT show the next screen. This suggests the `form.trigger()` validation or `setStep()` call is failing silently, or the form submission is being triggered unintentionally — causing `onSubmit` to fire, which saves + closes the drawer via `onOpenChange(false)`.

**Root cause investigation needed:** Check if `form.trigger(["name", "color"])` is inadvertently triggering a form submit event, or if there's a race condition where the Sheet component's `onOpenChange` fires during the step transition. The "Next" button already has `type="button"` which should prevent submit, but the behavior reported contradicts this.

## Tasks / Subtasks

- [ ] **Task 1: Reproduce and diagnose the bug** (AC: 1-4)
  - [ ] 1.1 Run the app locally, open CourseDrawer, fill Step 1 fields, click "Next"
  - [ ] 1.2 Verify whether the sidebar closes unexpectedly (check if `onSubmit` fires)
  - [ ] 1.3 Add console logging to `onSubmit`, `handleOpenChange`, and the Next button handler to trace execution flow
  - [ ] 1.4 Check if `form.trigger()` resolves correctly and `setStep(2)` executes

- [ ] **Task 2: Fix the Next button handler** (AC: 1, 3, 4)
  - [ ] 2.1 Ensure `type="button"` is correctly preventing form submission
  - [ ] 2.2 If the issue is `form.trigger()` side-effects, isolate the validation from any submit pathway
  - [ ] 2.3 Verify `setStep(2)` renders Step 2 content (the scheduling/roster placeholder section)
  - [ ] 2.4 If the desired flow is save-then-advance (per AC1), add an intermediate save before advancing to Step 2:
    - Call `updateCourse`/`createCourse` with current form values
    - On success: advance to step 2 (do NOT close drawer)
    - On failure: show toast error, remain on step 1
  - [ ] 2.5 Prevent the drawer from closing on step transition

- [ ] **Task 3: Handle save-on-next for editing mode** (AC: 1, 2, 4)
  - [ ] 3.1 When editing (course prop exists), "Next" should save changes first via `updateCourse`
  - [ ] 3.2 When creating new, "Next" may create a draft or just advance locally (no API call needed until final step)
  - [ ] 3.3 Show loading state on "Next" button during save (use `Loader2` spinner pattern from submit button)

- [ ] **Task 4: Final submission on Step 2** (AC: 2, 3)
  - [ ] 4.1 Ensure "Create Course" / "Save Changes" on Step 2 completes the flow and closes the drawer
  - [ ] 4.2 Verify the form `onSubmit` handler works correctly after the step transition fix

- [ ] **Task 5: Update E2E tests** (AC: 1-4)
  - [ ] 5.1 Add test: clicking "Next" with valid Step 1 data shows Step 2 content
  - [ ] 5.2 Add test: clicking "Next" with empty required fields shows validation errors
  - [ ] 5.3 Add test: full create flow (Step 1 → Next → Step 2 → Create Course)
  - [ ] 5.4 Add test: edit flow (Step 1 → Next → Step 2 → Save Changes)

## Dev Notes

### Primary File to Modify

**`apps/webapp/src/features/logistics/components/CourseDrawer.tsx`** — This is the ONLY component that needs fixing. The bug is entirely within this file's Next button handler (lines 254-263).

### Current Code (Bug Location)

```tsx
// Line 254-263 — The Next button onClick
<Button
  type="button"
  onClick={async () => {
    const isValid = await form.trigger(["name", "color"]);
    if (isValid) setStep(2);
  }}
>
  Next
  <ChevronRight className="ml-2 size-4" />
</Button>
```

### Key Code Sections in CourseDrawer.tsx

| Section | Lines | Purpose |
|---------|-------|---------|
| Step state | 46 | `const [step, setStep] = useState(1)` |
| Form setup | 50-57 | `useForm<CreateCourseInput>` with Zod resolver |
| Reset on open | 59-76 | Resets form + step when drawer opens |
| `onSubmit` | 78-91 | Saves via API, closes drawer, shows toast |
| `handleOpenChange` | 93-105 | Confirms unsaved changes before close |
| Step 1 fields | 126-191 | name, description, color |
| Step 2 fields | 193-236 | Scheduling/roster placeholder (disabled inputs) |
| Next button | 254-263 | **BUG HERE** — validates then setStep(2) |
| Submit button | 265-271 | Step 2 submit button |

### Architecture Compliance

- **Mutations:** Use existing `useCourses(centerId)` hook — `createCourse` and `updateCourse` are already wired. Do NOT create new hooks or API calls. [Source: apps/webapp/src/features/logistics/hooks/use-logistics.ts]
- **Toast notifications:** Use `toast.success()` and `toast.error()` from `sonner` (already imported).
- **Loading state:** Use `Loader2` spinner from `lucide-react` (already imported).
- **Form validation:** Use `form.trigger()` for partial validation — this is the correct react-hook-form pattern.
- **Type safety:** `CreateCourseInput` from `@workspace/types` is the form schema.

### Anti-Patterns to Avoid

- Do NOT add new API endpoints — this is purely a frontend UI fix.
- Do NOT restructure the 2-step wizard into separate routes/pages — keep the Sheet-based drawer pattern.
- Do NOT remove Step 2 — even though its fields are placeholders, the wizard flow must work.
- Do NOT change the form schema or Zod validation — the issue is in the button handler, not the validation rules.
- Do NOT use `window.location` or router navigation for step changes — use React state (`setStep`).

### Testing Standards

- **E2E tests:** `apps/e2e/tests/logistics/courses.spec.ts` — existing tests only verify drawer opens and Step 1 fields render. Add step transition and full flow tests.
- **E2E patterns:** Use `loginAs(page, TEST_USERS.OWNER)`, `gotoCourses()` helper, `getByRole`/`getByLabel` selectors. Avoid hard waits — use `waitFor`/`toBeVisible` assertions.
- **No unit tests required** — this is a UI interaction fix best covered by E2E tests.

### Related Files (Read-Only Context)

| File | Purpose |
|------|---------|
| `apps/webapp/src/features/logistics/courses-page.tsx` | Parent page, manages `drawerOpen` state |
| `apps/webapp/src/features/logistics/hooks/use-logistics.ts` | `useCourses` hook with `createCourse`/`updateCourse` mutations |
| `apps/e2e/tests/logistics/courses.spec.ts` | Existing E2E tests to extend |
| `apps/e2e/fixtures/auth.fixture.ts` | Test fixtures (`loginAs`, `TEST_USERS`, `getAppUrl`) |

### Project Structure Notes

- Feature-first organization: logistics module at `apps/webapp/src/features/logistics/`
- Hooks co-located in `hooks/` subdirectory
- Components co-located in `components/` subdirectory
- E2E tests mirror feature structure under `apps/e2e/tests/`

### Git Intelligence

Recent commits show testing focus (E2E quality improvements, removing hard waits, splitting oversized test files). Follow the same patterns: no `waitForTimeout()`, prefer `waitFor` assertions, keep test files focused.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
