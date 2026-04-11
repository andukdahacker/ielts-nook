# Story 12.12: Edit After Publish — Before Submissions Only

Status: review

## Story

As a Teacher who published an exercise,
I want to edit it only if no student has submitted yet,
so that grading fairness is maintained for students who already submitted.

## Acceptance Criteria

1. **AC1:** Published exercises with zero submissions can be edited normally (full edit, same as DRAFT).
2. **AC2:** Once the first student submission exists, the edit button is disabled with a tooltip explaining why.
3. **AC3:** Teacher can still view the exercise in read-only mode after submissions exist.

## Tasks / Subtasks

- [x] Task 1: Backend — Add `hasSubmissions` check to exercise service (AC: #1, #2)
  - [x] 1.1 In `exercises.service.ts`, add a method `hasExerciseSubmissions(centerId: string, exerciseId: string): Promise<boolean>` that counts submissions across all assignments for this exercise. **Must be public** — the new route endpoint (Task 2) calls it via the controller:
    ```ts
    async hasExerciseSubmissions(centerId: string, exerciseId: string): Promise<boolean> {
      const db = getTenantedClient(this.prisma, centerId);
      const count = await db.submission.count({
        where: { assignment: { exerciseId } },
      });
      return count > 0;
    }
    ```
    Data path: Exercise → Assignment (1:many via `exerciseId`) → Submission (1:many via `assignmentId`). Prisma supports nested `where` on relations.

  - [x] 1.2 Modify `updateExercise()` (lines 309-347) to allow full edits on PUBLISHED exercises with no submissions:
    ```ts
    if (exercise.status === "PUBLISHED") {
      const hasSubs = await this.hasExerciseSubmissions(centerId, id);
      if (hasSubs) {
        // Existing restriction: only title + bandLevel
        const allowedKeys = ["title", "bandLevel"];
        const inputKeys = Object.keys(input).filter(
          (k) => input[k as keyof typeof input] !== undefined,
        );
        const disallowed = inputKeys.filter((k) => !allowedKeys.includes(k));
        if (disallowed.length > 0) {
          throw AppError.badRequest(
            `Published exercises with submissions only allow updating: ${allowedKeys.join(", ")}. ` +
            `Disallowed fields: ${disallowed.join(", ")}`,
          );
        }
        return await db.exercise.update({
          where: { id },
          data: { title: input.title, bandLevel: input.bandLevel },
          include: EXERCISE_INCLUDE,
        });
      }
      // No submissions yet — allow full edit like DRAFT
      return this.updateDraftExercise(centerId, id, input, "Exercise update failed");
    }
    ```
    **CRITICAL:** `updateDraftExercise` (line 162) calls `verifyDraftExercise` which checks `status !== "DRAFT"` and throws. You MUST refactor this: extract the actual update logic from `updateDraftExercise` into a new private method `applyExerciseUpdate(centerId, id, input)` that does NOT check status. Then call `applyExerciseUpdate` from both `updateDraftExercise` (after verify) and the no-submissions PUBLISHED path.

  - [x] 1.3 Modify `autosaveExercise()` (lines 349-360) similarly — allow autosave for PUBLISHED exercises with no submissions. Currently it calls `updateDraftExercise` which rejects non-DRAFT. Apply the same pattern: check `hasExerciseSubmissions`, if no submissions → call `applyExerciseUpdate`, if has submissions → throw `"Cannot autosave: exercise has student submissions"`.

- [x] Task 2: Backend — Add `hasSubmissions` field to exercise response (AC: #1, #2, #3)
  - [x] 2.1 Add a new endpoint `GET /api/v1/exercises/{id}/has-submissions` in `exercises.routes.ts` that returns `{ data: boolean }`. This keeps the existing exercise response schema unchanged and avoids modifying the shared `ExerciseSchema` type.
    - Route: `GET /:id/has-submissions`
    - Auth: `authMiddleware` + roles `["OWNER", "ADMIN", "TEACHER"]`
    - Controller: add a `hasSubmissions(centerId, exerciseId)` method that delegates to `exercisesService.hasExerciseSubmissions(centerId, exerciseId)`. Follow the existing pattern in `exercises.controller.ts` (service injected via constructor at line 26).
    - Route handler: calls `exercisesController.hasSubmissions(centerId, exerciseId)`
    - Response: `{ data: boolean }`
  - [x] 2.2 Add Zod schema for the response in the route file (inline, no need to modify `@workspace/types`):
    ```ts
    const HasSubmissionsResponseSchema = z.object({ data: z.boolean() });
    ```

- [x] Task 3: Frontend — Add `useExerciseHasSubmissions` hook (AC: #1, #2, #3)
  - [x] 3.1 In `use-exercises.ts`, add a new hook:
    ```ts
    export const useExerciseHasSubmissions = (centerId?: string | null, exerciseId?: string, status?: string) => {
      return useQuery({
        queryKey: [...exercisesKeys.detail(exerciseId!), "has-submissions"],
        queryFn: async () => {
          const { data, error } = await client.GET(
            "/api/v1/exercises/{id}/has-submissions",
            { params: { path: { id: exerciseId! } } },
          );
          if (error) throw error;
          return data?.data as boolean;
        },
        // Only query for PUBLISHED exercises — DRAFT never has submissions
        enabled: !!centerId && !!exerciseId && status === "PUBLISHED",
      });
    };
    ```
  - [x] 3.2 After adding the backend endpoint, run `pnpm --filter=webapp sync-schema-dev` (backend must be running) to regenerate `schema.d.ts` with the new endpoint types. **Do NOT skip this step** — `client.GET("/api/v1/exercises/{id}/has-submissions")` will have no type if schema isn't synced.

- [x] Task 4: Frontend — Update ExerciseEditor for edit-after-publish (AC: #1, #2, #3)
  - [x] 4.1 In `ExerciseEditor.tsx`, import and call the new hook:
    ```tsx
    const { data: hasSubmissions, isLoading: isCheckingSubmissions } = useExerciseHasSubmissions(
      currentUser?.centerId, id, exercise?.status,
    );
    ```
  - [x] 4.2 Compute `canEdit`:
    ```tsx
    const canEdit = exercise?.status === "DRAFT" || (exercise?.status === "PUBLISHED" && hasSubmissions === false);
    ```
    Note: `hasSubmissions === false` (not `!hasSubmissions`) to distinguish false from undefined (loading state).

  - [x] 4.3 Update toolbar buttons (lines 885-902):
    - Show "Save Draft" button when `canEdit` (not just `status === "DRAFT"`):
      ```tsx
      {canEdit && (
        <Button variant="outline" size="sm" aria-label="Save Draft" onClick={handleSaveDraft}>
          <Save className="sm:mr-2 size-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      )}
      ```
    - Show "Publish" button only for DRAFT (unchanged)
    - For PUBLISHED with submissions, show disabled edit indicator with tooltip:
      ```tsx
      {exercise?.status === "PUBLISHED" && hasSubmissions && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Lock className="size-4" />
                <span className="hidden sm:inline">Read-only</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editing is disabled because students have already submitted this exercise</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      ```
    - Import `Lock` from `lucide-react`, `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from `@workspace/ui/components/tooltip`.

  - [x] 4.4 Disable all form inputs when `!canEdit && exercise?.status !== "DRAFT"`:
    - Title `<Input>` (line 912): add `disabled={!canEdit}`
    - Instructions `<Textarea>`: add `disabled={!canEdit}`
    - Pass `disabled={!canEdit}` to `PassageEditor`, `QuestionSectionEditor`, and `SkillSelector` components as a new prop. Each component should propagate `disabled` to its inner form fields.
    - **Alternative simpler approach:** Wrap the entire form in a `<fieldset disabled={!canEdit}>` which natively disables all descendant form elements. This avoids prop-drilling. Add `className="disabled:opacity-60"` for visual feedback. This is the preferred approach — check if it works well with the existing component structure first.

  - [x] 4.5 Disable section management when `!canEdit`:
    - "Add Section" button (`handleAddSection`): add `disabled={!canEdit}`
    - Section delete buttons: add `disabled={!canEdit}`
    - DnD reordering: only wrap with DragDropContext when `canEdit`

  - [x] 4.6 Handle autosave behavior:
    - The autosave logic lives in `scheduleAutosave` callback (lines 500-544, 30-second debounce) and its triggering `useEffect` (lines 546-553). It checks `userHasEdited.current` before firing. Since inputs are disabled when `!canEdit`, autosave won't trigger. But add a safety guard: in the `scheduleAutosave` callback, check `canEdit` before calling `autosave()` to prevent edge cases.

- [x] Task 5: Tests (AC: #1, #2, #3)
  - [x] 5.1 Backend: Add unit test in exercises service test file:
    - Test `updateExercise()` with PUBLISHED status + no submissions → should allow full update
    - Test `updateExercise()` with PUBLISHED status + has submissions → should reject non-title/bandLevel fields
    - Test `autosaveExercise()` with PUBLISHED status + no submissions → should succeed
    - Test `autosaveExercise()` with PUBLISHED status + has submissions → should throw
    - Test `hasExerciseSubmissions` endpoint returns correct boolean
  - [x] 5.2 Frontend: **Create** `ExerciseEditor.test.tsx` (file does NOT exist yet — must be created from scratch):
    - Set up test infrastructure: mock `use-exercises` hooks (`useExercise`, `useExercises`, `useExerciseHasSubmissions`), mock `use-sections`, mock `use-tags`, mock `react-router` (`useParams`, `useNavigate`), mock auth context
    - Follow the existing mock pattern from `MockTestEditor.test.tsx` (which mocks similar hooks)
    - Test: PUBLISHED exercise + `hasSubmissions: false` → Save button visible, inputs enabled
    - Test: PUBLISHED exercise + `hasSubmissions: true` → Save button hidden, "Read-only" lock indicator visible with tooltip, inputs disabled
    - Test: DRAFT exercise → Save + Publish buttons visible (unchanged behavior)
    - Test: PUBLISHED exercise + `hasSubmissions` loading → defaults to read-only (safe default)
  - [x] 5.3 Run full test suite: `pnpm --filter=webapp test` and `pnpm --filter=backend test` — 0 regressions expected.

## Dev Notes

### Current Backend Behavior (What Changes)

`exercises.service.ts` lines 309-347 currently enforces:
- **ARCHIVED:** No updates allowed (unchanged)
- **PUBLISHED:** Only `title` and `bandLevel` can be updated (CHANGES: now conditional on submissions)
- **DRAFT:** Full edit allowed (unchanged)

The change: PUBLISHED exercises with **zero submissions** should be treated like DRAFT for editing purposes. PUBLISHED exercises **with submissions** keep the existing title/bandLevel-only restriction.

### Refactoring `updateDraftExercise`

`updateDraftExercise` (line 162, **private**) internally calls `verifyDraftExercise` (line 31) at line 170 which throws if `status !== "DRAFT"`. You cannot call `updateDraftExercise` for a PUBLISHED exercise. **Extract the update logic** (everything after the verify check — cross-field validation + `db.exercise.update()` call) into a new private `applyExerciseUpdate(centerId, id, input)` method. Then:
- `updateDraftExercise` = `verifyDraftExercise` + `applyExerciseUpdate` (both stay private)
- PUBLISHED + no submissions path in `updateExercise` = `applyExerciseUpdate` directly
- PUBLISHED + no submissions path in `autosaveExercise` = `applyExerciseUpdate` directly

### Route → Controller → Service Pattern

The existing pattern (see `exercises.routes.ts` lines 40-47):
```
const exercisesService = new ExercisesService(fastify.prisma, ...);
const exercisesController = new ExercisesController(exercisesService);
```
Routes call controller methods, controller delegates to service. For the new `has-submissions` endpoint:
- **Service:** `hasExerciseSubmissions()` (public) — contains the Prisma query
- **Controller:** `hasSubmissions()` — delegates to service, formats response as `{ data: boolean }`
- **Route:** `GET /:id/has-submissions` — calls controller

### Data Path for Submission Check

```
Exercise (id)
  → Assignment (where: { exerciseId: id }) — 1:many
    → Submission (where: { assignmentId: ... }) — 1:many
```

Prisma nested where:
```ts
db.submission.count({ where: { assignment: { exerciseId } } })
```

### Why a Separate Endpoint (Not Inline in ExerciseSchema)

Adding `hasSubmissions` to `ExerciseSchema` in `@workspace/types` would require modifying the shared types package, updating all exercise queries to include the count, and regenerating the OpenAPI schema. A separate lightweight endpoint is simpler, only queried when needed (PUBLISHED exercises), and avoids touching the core type system.

### Frontend `fieldset` Approach

Using `<fieldset disabled={!canEdit}>` is the cleanest approach:
- Natively disables all `<input>`, `<textarea>`, `<select>`, `<button>` descendants
- No prop drilling needed through `PassageEditor`, `QuestionSectionEditor`, etc.
- Add `className="disabled:opacity-60"` for visual dimming
- **Caveat:** Custom components using `<div>` with click handlers (like `TagSelector`) won't be disabled by `<fieldset>`. For these, pass `disabled` explicitly or check `canEdit` in their click handlers.

### Components That Need Explicit `disabled` (If Not Handled by `fieldset`)

- `TagSelector` (`TagSelector.tsx`) — Band level uses Shadcn `Select` (native-like, should be disabled by fieldset). **Topic tags use `Popover` + `Command` (custom div-based combobox)** — `<fieldset>` will NOT disable these. Pass `disabled` prop explicitly and skip rendering the Popover trigger when disabled.
- `SkillSelector` (`SkillSelector.tsx`) — Uses a grid of plain `<button>` elements (lines 51-66). **Will be disabled by `<fieldset>`** since they're actual `<button>` elements.
- DnD drag handles — `<fieldset>` won't disable drag; conditionally render DragDropContext only when `canEdit`
- Section delete buttons — actual `<button>` elements, will be disabled by fieldset

### Existing Patterns to Follow

- **Tooltip pattern:** Used in story 12-10 for answer status badges. Import from `@workspace/ui/components/tooltip`.
- **Disabled button styling:** Shadcn buttons already have `disabled:opacity-50 disabled:pointer-events-none` via `buttonVariants`.
- **Lock icon:** `Lock` from `lucide-react` (already in project dependencies).
- **Save button text:** Change label from "Save Draft" to "Save" for published exercises (since it's not a draft anymore).

### Mock Test Implications

Mock tests that reference this exercise are NOT affected. Mock test publishing already validates all exercises are PUBLISHED (mock-tests.service.ts lines 206-219). Editing a published exercise's content (when no submissions exist) doesn't change its PUBLISHED status, so mock test integrity is maintained.

### Edge Cases

1. **Race condition:** Teacher has editor open, student submits while teacher is editing → Next autosave/save will fail with backend error. Frontend should handle the 400 error gracefully with a toast: "Exercise can no longer be edited — a student has submitted."
2. **Multiple assignments:** An exercise can be assigned to multiple classes. `hasSubmissions` must check across ALL assignments, not just one. The Prisma query `db.submission.count({ where: { assignment: { exerciseId } } })` handles this correctly.
3. **Loading state:** While `isCheckingSubmissions` is true, default to read-only (safe default) to prevent edits before we know submission status.

### Project Structure Notes

- Feature-first: `apps/webapp/src/features/exercises/`
- Backend module: `apps/backend/src/modules/exercises/`
- Tests co-located with source files
- Naming: PascalCase components, camelCase hooks/services
- Commit format: `feat: description (story 12-12)`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 12, Story 12.12, lines 1245-1253]
- [Source: apps/backend/src/modules/exercises/exercises.service.ts — lines 309-347 (updateExercise PUBLISHED restriction)]
- [Source: apps/backend/src/modules/exercises/exercises.service.ts — lines 31-44 (verifyDraftExercise)]
- [Source: apps/backend/src/modules/exercises/exercises.service.ts — lines 162-307 (updateDraftExercise)]
- [Source: apps/backend/src/modules/exercises/exercises.service.ts — lines 349-360 (autosaveExercise)]
- [Source: apps/backend/src/modules/exercises/exercises.service.ts — lines 486-500 (publishExercise)]
- [Source: apps/backend/src/modules/submissions/submissions.service.ts — lines 356-362 (hasSubmissions at assignment level)]
- [Source: apps/webapp/src/features/exercises/hooks/use-exercises.ts — lines 246-290 (useExercise hook)]
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx — lines 885-902 (toolbar buttons)]
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx — lines 639-650 (handlePublish)]
- [Source: packages/db/prisma/schema.prisma — lines 413-417 (ExerciseStatus enum)]
- [Source: packages/db/prisma/schema.prisma — lines 666-690 (Assignment model with exerciseId)]
- [Source: packages/db/prisma/schema.prisma — lines 719-745 (Submission model)]
- [Source: 12-11-mock-test-drag-fix.md — Previous story patterns and test suite status]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Backend CRUD tests: 29/29 passed
- Frontend tests: 1008/1008 passed (6 new ExerciseEditor tests)

### Completion Notes List
- Task 1: Added `hasExerciseSubmissions()` public method, extracted `applyExerciseUpdate()` private method from `updateDraftExercise()`, updated `updateExercise()` to check submissions before restricting PUBLISHED edits, updated `autosaveExercise()` similarly
- Task 2: Added `GET /:id/has-submissions` endpoint with Zod schema, controller method, route handler
- Task 3: Added `useExerciseHasSubmissions` hook with PUBLISHED-only query enablement. Used type cast for `client.GET` since schema.d.ts requires backend running to sync
- Task 4: Added `canEdit` computation, Save/Read-only lock indicator in toolbar, `<fieldset disabled>` for form inputs, `isDragDisabled` for DnD, autosave safety guard, race condition error toast
- Task 5: Backend unit tests for `hasExerciseSubmissions`, `updateExercise` (PUBLISHED +/- submissions), `autosaveExercise` (PUBLISHED +/- submissions). Frontend tests for DRAFT, PUBLISHED no-subs, PUBLISHED with-subs, loading state

### Change Log
- 2026-04-11: Story 12-12 implemented — edit-after-publish before submissions only

### File List
- apps/backend/src/modules/exercises/exercises.service.ts (modified — hasExerciseSubmissions, applyExerciseUpdate, updateExercise, autosaveExercise)
- apps/backend/src/modules/exercises/exercises.controller.ts (modified — hasSubmissions method)
- apps/backend/src/modules/exercises/exercises.routes.ts (modified — GET /:id/has-submissions endpoint)
- apps/backend/src/modules/exercises/exercises.service.crud.test.ts (modified — new tests for hasExerciseSubmissions, PUBLISHED with/without submissions, autosave)
- apps/webapp/src/features/exercises/hooks/use-exercises.ts (modified — useExerciseHasSubmissions hook)
- apps/webapp/src/features/exercises/components/ExerciseEditor.tsx (modified — canEdit logic, fieldset disabled, toolbar, DnD, autosave guard)
- apps/webapp/src/features/exercises/components/ExerciseEditor.test.tsx (new — 6 tests for edit-after-publish behavior)
