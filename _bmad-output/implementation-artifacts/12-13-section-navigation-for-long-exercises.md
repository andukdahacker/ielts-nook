# Story 12.13: Section Navigation for Long Exercises

Status: review

## Story

As a **Teacher** editing a Reading or Listening exercise with many sections,
I want an outline sidebar for quick navigation between sections,
So that I don't have to scroll through the entire exercise to find and edit a specific section.

## Acceptance Criteria

1. **AC1:** An outline sidebar appears for exercises with 3+ sections.
2. **AC2:** Clicking an item in the outline scrolls to that section smoothly.
3. **AC3:** The current section is highlighted in the outline as the user scrolls.

## Tasks / Subtasks

- [x] **Task 1: Export QUESTION_TYPES_BY_SKILL** (AC: 1)
  - [x] 1.1 In `QuestionSectionEditor.tsx` line 26, change `const QUESTION_TYPES_BY_SKILL` to `export const QUESTION_TYPES_BY_SKILL` — this map is currently unexported and SectionOutline needs it for human-readable section type labels

- [x] **Task 2: Create SectionOutline component** (AC: 1, 2, 3)
  - [x] 2.1 Create `SectionOutline.tsx` in `apps/webapp/src/features/exercises/components/`
  - [x] 2.2 Accept sections array + exercise skill as props
  - [x] 2.3 Render a vertical list of section labels: "Section {idx+1} — {humanLabel} ({N}q)" using `QUESTION_TYPES_BY_SKILL` for the label and `section.questions.length` for the count
  - [x] 2.4 Only render when `sections.length >= 3`
  - [x] 2.5 On item click, use `document.querySelector('[data-section-id="${sectionId}"]')?.scrollIntoView({ behavior: "smooth", block: "start" })` — this reuses the existing `data-section-id` attribute already on every section wrapper in ExerciseEditor
  - [x] 2.6 Implement `IntersectionObserver` to track which section is currently visible and highlight it in the outline
  - [x] 2.7 Style with Tailwind: fixed/sticky positioning, subtle background, active item highlight (e.g., left border accent + font-medium)

- [x] **Task 3: Integrate into ExerciseEditor layout** (AC: 1)
  - [x] 3.1 Add a flex wrapper `<div className="flex">` **between** the `</header>` (line 941) and `<fieldset>` (line 943), wrapping both the new SectionOutline and the existing fieldset. The sidebar MUST be outside the fieldset so it remains interactive in read-only mode.
  - [x] 3.2 Add `flex-1 min-w-0` to the fieldset so it fills remaining width and prevents overflow
  - [x] 3.3 The outline sidebar should be sticky (`sticky top-14 h-[calc(100vh-3.5rem)]` to sit below the sticky toolbar which is `h-14`)
  - [x] 3.4 Set sidebar width to ~200-220px with `shrink-0`; main content area keeps `flex-1`
  - [x] 3.5 Hide sidebar on small viewports (`hidden lg:block`) — exercises are rarely edited on mobile
  - [x] 3.6 When sections < 3, SectionOutline returns null — the flex wrapper can remain (single child just fills width)

- [x] **Task 4: Handle dynamic section changes** (AC: 1, 3)
  - [x] 4.1 Outline must reactively update when sections are added or removed (sections come from `exercise?.sections` which re-renders on query invalidation)
  - [x] 4.2 When a new section is added and count crosses the 3+ threshold, the outline should appear
  - [x] 4.3 When sections drop below 3, outline disappears gracefully
  - [x] 4.4 Active section tracking via IntersectionObserver should re-observe when section list changes (cleanup old observers, create new ones)

- [x] **Task 5: Tests** (AC: 1, 2, 3)
  - [x] 5.1 Unit tests for `SectionOutline.tsx`: renders nothing when < 3 sections, renders outline items with question counts when >= 3, click handler calls scrollIntoView, active section highlighting
  - [x] 5.2 Integration test in ExerciseEditor.test.tsx: outline appears for exercises with 3+ sections, outline hidden for exercises with < 3 sections

## Dev Notes

### Architecture & Layout

The ExerciseEditor currently has a **single-column vertical layout** with no sidebar. The exact DOM structure (verified from source) is:

```
<div>                                          ← root (line 877)
  <header className="sticky top-0 z-40 ...">  ← sticky toolbar, h-14 (line 879-941)
  <fieldset disabled={!canEdit} className="disabled:opacity-60">  ← line 943
    <div className="py-6 space-y-6">           ← content wrapper (line 944)
      ...title, instructions, passage, settings (all max-w-3xl)...
      <DragDropContext>                        ← sections rendered here (line 1211)
        <Droppable>
          {sections.map(section => (
            <Draggable>
              <div data-section-id={section.id}> ← SCROLL TARGET (already exists!)
                <QuestionSectionEditor ... />
              </div>
            </Draggable>
          ))}
        </Droppable>
      </DragDropContext>
      <AlertDialog ... />                      ← publish + delete dialogs (lines 1269-1312)
      <CreateAssignmentDialog ... />           ← assign dialog (lines 1314-1318)
    </div>                                     ← line 1319
  </fieldset>                                  ← line 1320
</div>                                         ← line 1321
```

**CRITICAL layout change:** The flex wrapper for the sidebar must be inserted **between** `</header>` and `<fieldset>`, NOT inside the fieldset. The sidebar must remain interactive in read-only mode (when `canEdit` is false and fieldset is disabled). See Task 3.1 for the target structure.

**Key implementation detail:** Every section `<div>` already has `data-section-id={section.id}` — this was added in Story 12-4 (auto-scroll). The outline sidebar reuses exactly this selector for scroll-to-section.

### Existing Auto-Scroll Pattern (Story 12-4)

The ExerciseEditor already has scroll-to-section logic (lines ~442-455):
```typescript
document.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`)
  ?.scrollIntoView({ behavior: "smooth", block: "start" });
```

Reuse this exact approach in the outline's click handler.

### Section Data Model

Sections have **no title field**. Display label must be derived:
- `"Section {index + 1}"` for the ordinal
- Human-readable type label from `QUESTION_TYPES_BY_SKILL` map — currently defined in `QuestionSectionEditor.tsx` (lines 26-64) as an **unexported** `const`. Task 1 exports it so SectionOutline can import it.
- Question count from `section.questions.length` for density indication
- Example sidebar items: "Section 1 — MCQ (Single) (5q)", "Section 2 — True/False/Not Given (8q)", "Section 3 — Matching Headings (6q)"

### When to Show/Hide

- **Show:** Reading and Listening exercises with 3+ sections (these are the only skills that support multiple sections)
- **Hide:** Writing exercises (always 1 section, auto-created), Speaking exercises (always 1 section)
- **Hide:** Any exercise with < 3 sections
- **Hide:** Small viewports (`hidden lg:block`) — exercise editing is desktop-focused

### IntersectionObserver for Active Tracking

Use `IntersectionObserver` with `threshold: 0.1` (or similar) on each `[data-section-id]` element. When a section enters the viewport, mark it active in the outline. Use `rootMargin: "-56px 0px 0px 0px"` to account for the sticky toolbar height (h-14 = 56px).

Pattern:
```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setActiveSectionId(entry.target.getAttribute('data-section-id'));
      }
    });
  },
  { rootMargin: '-56px 0px 0px 0px', threshold: 0.1 }
);
```

Re-create observer when `exercise?.sections` changes (cleanup in useEffect return).

### Styling Guidance

- Sidebar: `sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto` (sticks below toolbar, scrolls independently if many sections)
- Width: `w-52` (208px) with `shrink-0`
- Items: `text-sm text-muted-foreground` with active state `text-foreground font-medium border-l-2 border-primary`
- Background: `bg-background` or `bg-muted/30` for subtle contrast
- Responsive: `hidden lg:block` — desktop only
- z-index: No special z-index needed since it's within the content flow, not overlapping the toolbar

### Files to Modify

| File | Change |
|------|--------|
| `apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx` | **MODIFY** — Add `export` to `QUESTION_TYPES_BY_SKILL` const (line 26) |
| `apps/webapp/src/features/exercises/components/SectionOutline.tsx` | **NEW** — Outline component |
| `apps/webapp/src/features/exercises/components/SectionOutline.test.tsx` | **NEW** — Tests |
| `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` | Add flex wrapper between header and fieldset, add `flex-1 min-w-0` to fieldset, render SectionOutline |
| `apps/webapp/src/features/exercises/components/ExerciseEditor.test.tsx` | Add tests for outline visibility |

### What NOT to Do

- **Do NOT add a sidebar to the app-level layout** — this is an in-editor outline only, scoped to ExerciseEditor
- **Do NOT create a new hook for sections** — sections already come from `exercise?.sections` via `useExercise()`
- **Do NOT use a scroll spy library** — `IntersectionObserver` is native and sufficient
- **Do NOT change the data-section-id attribute** — it already exists and works
- **Do NOT touch backend code** — this is a purely frontend feature
- **Do NOT duplicate `QUESTION_TYPES_BY_SKILL`** — export the existing one from `QuestionSectionEditor.tsx` (Task 1) and import it in SectionOutline
- **Do NOT restructure QuestionSectionEditor internals** — only the `export` keyword is added to the existing const

### Project Structure Notes

- Component goes in `apps/webapp/src/features/exercises/components/` following feature-first architecture
- Test file co-located next to component
- No new packages or dependencies needed — uses only native IntersectionObserver + existing Tailwind + existing data attributes

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 12, Story 12.13]
- [Source: _bmad-output/planning-artifacts/architecture.md — Frontend Feature-Based Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Progressive Disclosure, Sticky Headers patterns]
- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx — lines 442-455 (auto-scroll), lines 878-941 (sticky toolbar), lines 1199-1267 (section rendering)]
- [Source: apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx — lines 26-64 (QUESTION_TYPES_BY_SKILL), line 317 (section header)]
- [Source: _bmad-output/implementation-artifacts/12-12-edit-after-publish-before-submissions-only.md — Previous story learnings]

### Previous Story Intelligence & Test Patterns

- **fieldset disabled pattern:** The `<fieldset disabled={!canEdit}>` wraps all form content. The outline sidebar MUST be outside it — navigation works in read-only mode too.
- **Test mock setup required in ExerciseEditor tests:**
  - `vi.mock` for `@hello-pangea/dnd`, `../hooks/use-exercises`, `../hooks/use-sections`
  - `global.ResizeObserver = vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }))`
  - **NEW for this story:** `global.IntersectionObserver = vi.fn().mockImplementation(() => ({ observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() }))`
- **No backend changes, no schema sync needed** — purely frontend feature

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- IntersectionObserver mock needed class-based constructor (vi.fn().mockImplementation not valid as constructor in test environment)
- act() wrapper required for IntersectionObserver callback to trigger React re-render in tests

### Completion Notes List
- ✅ Task 1: Added `export` keyword to `QUESTION_TYPES_BY_SKILL` in QuestionSectionEditor.tsx
- ✅ Task 2: Created `SectionOutline.tsx` — sticky sidebar with section labels, click-to-scroll via existing `data-section-id`, IntersectionObserver for active section tracking
- ✅ Task 3: Integrated into ExerciseEditor — flex wrapper between header and fieldset, sidebar outside fieldset for read-only interactivity, responsive hidden on small viewports
- ✅ Task 4: Dynamic reactivity handled via React props (`sections` from `exercise?.sections`) and `useEffect` with sections dependency for IntersectionObserver lifecycle
- ✅ Task 5: 6 unit tests for SectionOutline (render/hide, labels, click, observer, active highlight, listening skill), 3 integration tests in ExerciseEditor (outline visibility for 3+, <3, 0 sections)
- All 1017 tests pass, 0 regressions

### Change Log
- 2026-04-11: Implemented section navigation outline sidebar (Story 12.13)

### File List
- `apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx` — MODIFIED (added `export` to QUESTION_TYPES_BY_SKILL)
- `apps/webapp/src/features/exercises/components/SectionOutline.tsx` — NEW (outline sidebar component)
- `apps/webapp/src/features/exercises/components/SectionOutline.test.tsx` — NEW (6 unit tests)
- `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` — MODIFIED (flex wrapper, SectionOutline integration)
- `apps/webapp/src/features/exercises/components/ExerciseEditor.test.tsx` — MODIFIED (IntersectionObserver mock, SectionOutline mock, 3 integration tests)
