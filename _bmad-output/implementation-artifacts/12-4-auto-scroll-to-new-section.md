# Story 12.4: Auto-Scroll to New Section

Status: review

## Story

As a Teacher adding a new section to an exercise (manually or via AI),
I want the screen to auto-scroll to the newly created section,
So that I can immediately start editing it.

## Acceptance Criteria

1. When a new section is created manually (via "Add Section" button), the viewport scrolls to bring it into view.
2. When AI generates new sections (Reading skill), the viewport scrolls to the first new section.
3. Scroll animation is smooth (not jarring).

## Tasks / Subtasks

- [x] Task 1: Capture newly created section ID after manual "Add Section" (AC: #1)
  - [x] 1.1 In `ExerciseEditor.tsx` `handleAddSection` (line 630), capture the returned `QuestionSection` from the `createSection` mutation (it already returns `data?.data as QuestionSection`)
  - [x] 1.2 Store the new section ID in a `useRef<string | null>` (e.g., `newSectionIdRef`)
- [x] Task 2: Capture newly created section IDs after AI generation (AC: #2)
  - [x] 2.1 Before `refetchExercise()` in the `onGenerationComplete` callback (line 1017), snapshot `exercise?.sections?.length` or section IDs
  - [x] 2.2 After refetch resolves, compare new sections with snapshot to identify the first new section
  - [x] 2.3 Store that first new section ID in `newSectionIdRef`
- [x] Task 3: Scroll to new section after render (AC: #1, #2, #3)
  - [x] 3.1 Add a `data-section-id={section.id}` attribute to the Draggable wrapper `<div>` (line 1137) for DOM lookup
  - [x] 3.2 Add a `useEffect` that watches `exercise?.sections` — when sections change and `newSectionIdRef.current` is set, query for the element `[data-section-id="${id}"]` and call `scrollIntoView({ behavior: "smooth", block: "start" })`
  - [x] 3.3 Clear `newSectionIdRef.current` after scrolling
- [x] Task 4: Verify no regressions (AC: #1, #2, #3)
  - [ ] 4.1 Manual test: add section on short exercise — new section scrolls to top of viewport (`block: "start"`) to focus editing attention
  - [ ] 4.2 Manual test: add section on long exercise with many sections — should scroll smoothly
  - [ ] 4.3 Manual test: AI generation on Reading exercise — should scroll to first new section
  - [x] 4.4 Run existing test suite: `pnpm --filter=webapp test`
  - [ ] 4.5 Verify drag-and-drop reorder does NOT trigger auto-scroll (reorder changes sections array but should not set `newSectionIdRef`)

## Dev Notes

### Implementation Strategy: Ref + data-attribute + useEffect

The cleanest approach uses three pieces:

1. **`newSectionIdRef = useRef<string | null>(null)`** — tracks which section to scroll to. Using a ref (not state) avoids an extra re-render; the scroll fires from the `useEffect` that already runs when sections change.

2. **`data-section-id` attribute** on each Draggable wrapper — enables DOM lookup without a ref map. The Draggable `<div>` already has `ref={provided.innerRef}` from hello-pangea/dnd, so we can't attach a second ref without `mergeRefs`. A data-attribute sidesteps this entirely.

3. **`useEffect` on `exercise?.sections`** — after TanStack Query refetch populates new sections, the component re-renders, and the effect fires. It looks up the DOM element and scrolls.

### Manual Section: Capturing the Return Value

`createSection` (from `useSections`) is `createSectionMutation.mutateAsync`, which returns `QuestionSection`. The current `handleAddSection` does not capture the return. Change:

```tsx
// Before (line 630-640)
const handleAddSection = async () => {
  if (!id || !selectedSkill) return;
  try {
    await createSection({
      sectionType: DEFAULT_SECTION_TYPE[selectedSkill],
      orderIndex: exercise?.sections?.length ?? 0,
    });
  } catch {
    toast.error("Failed to add section");
  }
};

// After
const handleAddSection = async () => {
  if (!id || !selectedSkill) return;
  try {
    const newSection = await createSection({
      sectionType: DEFAULT_SECTION_TYPE[selectedSkill],
      orderIndex: exercise?.sections?.length ?? 0,
    });
    newSectionIdRef.current = newSection.id;
  } catch {
    toast.error("Failed to add section");
  }
};
```

### AI Generation: Detecting New Sections

The `onGenerationComplete` callback (line 1017) triggers `refetchExercise()`. The refetch returns the updated exercise. Change:

```tsx
// Before (line 1017-1019)
onGenerationComplete={() => {
  refetchExercise();
}}

// After
onGenerationComplete={async () => {
  const prevSectionIds = new Set(exercise?.sections?.map(s => s.id) ?? []);
  const { data: updated } = await refetchExercise();
  const firstNew = updated?.sections?.find(s => !prevSectionIds.has(s.id));
  if (firstNew) {
    newSectionIdRef.current = firstNew.id;
  }
}}
```

**Confirmed:** `refetchExercise` is `exerciseQuery.refetch` aliased at line 386: `const { ..., refetch: refetchExercise } = useExercise(centerId, id)`. Calling `await refetchExercise()` returns `QueryObserverResult<Exercise>` with `{ data: Exercise | undefined }`. The `onGenerationComplete` callback fires exactly once per generation cycle (guarded by `prevCompletedRef` in `AIGenerationPanel.tsx` lines 142-151). There is no race condition — `use-ai-generation.ts` does NOT auto-invalidate the exercise detail query on generation complete (only the status query), so the manual `refetchExercise()` is the sole source of truth for new sections.

### Scroll useEffect

```tsx
useEffect(() => {
  if (!newSectionIdRef.current) return;
  const id = newSectionIdRef.current;
  // Small timeout to let the DOM update after React render
  const timer = setTimeout(() => {
    const el = document.querySelector(`[data-section-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    newSectionIdRef.current = null;
  }, 100);
  return () => clearTimeout(timer);
}, [exercise?.sections]);
```

**Why `setTimeout(100)`:** The TanStack Query cache update triggers a re-render, but the Draggable wrapper DOM nodes may not be painted yet in the same microtask. A 100ms delay is safe and imperceptible. This matches the pattern used in `QuestionNumberPills.tsx` and `HighlightedText.tsx` which rely on `useEffect` timing.

**Why this is safe despite `exercise?.sections` changing on reorder/delete/regenerate:** The `newSectionIdRef.current` null-check is the true gate. The ref is ONLY set in two places: `handleAddSection` and `onGenerationComplete`. All other section mutations (drag reorder with its double-fire from `onMutate` + `onSettled`, delete, regenerate, WRITING/SPEAKING auto-create) never set the ref, so the early return `if (!newSectionIdRef.current) return` prevents scroll. Do NOT replace the ref with `useState` — state would cause an extra render cycle and the `useEffect` timing would become unpredictable.

**Why `block: "start"`** (not `"nearest"`): When adding a new section, the user's intent is to work on it. Scrolling it to the top of the viewport puts it in the optimal editing position, even if it's partially visible.

### Scroll Container Context

The scrollable ancestor is `<main className="flex-1 overflow-y-auto relative">` in `DashboardShell.tsx` (line 88). `scrollIntoView` works correctly here because it traverses up to the nearest scrollable ancestor automatically — no ref to DashboardShell's `<main>` is needed.

### Existing Scroll Patterns in Codebase

Two proven patterns to follow:

1. **`QuestionNumberPills.tsx` (lines 19-28):** `useRef` + `useEffect` + `scrollIntoView({ behavior: "smooth", block: "nearest" })`
2. **`HighlightedText.tsx` (lines 135-142):** `useRef` + `useEffect` on `highlightedItemId` + `scrollIntoView({ behavior: "smooth", block: "nearest" })`

Both use native `Element.scrollIntoView()` — no scroll libraries needed.

### Auto-Create for WRITING/SPEAKING (Lines 549-565)

The auto-creation of a single section for WRITING/SPEAKING exercises happens on first load. Do NOT add scroll behavior for this case — the user is already at the top of the page when the section auto-creates. Guard by only setting `newSectionIdRef` in `handleAddSection` and `onGenerationComplete`.

### What NOT to Do

- Do NOT add a ref to DashboardShell's `<main>` — `scrollIntoView` handles this natively
- Do NOT use `window.scrollTo` — the page body doesn't scroll; `<main>` inside DashboardShell does
- Do NOT use a scroll library — native `scrollIntoView` with `behavior: "smooth"` is sufficient
- Do NOT change the debounce timing or save behavior (lesson from stories 12-1, 12-2)
- Do NOT modify `use-sections.ts` — the mutation already returns the created section
- Do NOT modify `QuestionSectionEditor.tsx` — all changes are in `ExerciseEditor.tsx`
- Do NOT trigger scroll on drag-drop reorder — `handleDragEnd` changes section order but should not set `newSectionIdRef`
- Do NOT use `useRef<HTMLElement>` with a ref map — data-attributes are simpler and avoid ref merging with hello-pangea/dnd

### Project Structure Notes

- **Only file to modify:** `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx`
- No new files needed
- No backend changes required
- No new dependencies needed
- No changes to hooks, types, or other components

### References

- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 630-640] — `handleAddSection`
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 1017-1019] — AI `onGenerationComplete`
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 1130-1165] — Section rendering with Draggable
- [Source: apps/webapp/src/features/exercises/hooks/use-sections.ts#lines 25-38] — `createSectionMutation` returns `QuestionSection`
- [Source: apps/webapp/src/features/submissions/components/QuestionNumberPills.tsx#lines 19-28] — Proven scrollIntoView pattern
- [Source: apps/webapp/src/features/grading/components/HighlightedText.tsx#lines 135-142] — Proven scrollIntoView pattern
- [Source: apps/webapp/src/core/components/layout/DashboardShell.tsx#line 88] — Scroll container
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12, Story 12.4] — Requirements

### Previous Story Intelligence (Story 12-3)

- ExerciseEditor.tsx was restructured: outer `<div>` wraps sticky `<header>` + content `<div className="container py-6 space-y-6">`
- Sticky header uses `z-40`, responsive icon-only buttons below `sm:` breakpoint
- Button text hidden on mobile with `<span className="hidden sm:inline">`
- Test baseline: 933/933 webapp tests passing
- ExerciseEditor.tsx is a large file (~1200 lines) — make minimal, targeted changes

### Git Intelligence

Recent commits in Epic 12:
- `7dc7ad9` feat: sticky toolbar with responsive icons and a11y fixes (story 12-3)
- `a0a3cfa` feat: fix input lag in TFNGEditor with optimistic state and memoized question rows (story 12-2)
- `2eb5a2e` feat: fix input lag in MatchingEditor with memoization and stable keys (story 12-1)

Pattern: All changes scoped to single files, minimal footprint, no new dependencies.

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
None — clean implementation, no issues encountered.

### Completion Notes List
- Added `newSectionIdRef` to track which section to scroll to
- Modified `handleAddSection` to capture returned section ID
- Modified `onGenerationComplete` to detect new sections by diffing IDs before/after refetch
- Added `data-section-id` attribute on Draggable wrapper for DOM lookup
- Added `useEffect` on `exercise?.sections` with 100ms setTimeout for smooth scroll
- All 933/933 webapp tests pass, TypeScript compiles clean
- Manual tests (4.1, 4.2, 4.3, 4.5) left unchecked — require browser verification

### File List
- apps/webapp/src/features/exercises/components/ExerciseEditor.tsx (modified)
