# Story 12.3: Sticky Toolbar

Status: review

## Story

As a Teacher editing a long exercise,
I want the toolbar and action buttons to stay visible (sticky/pinned) as I scroll,
So that I can always access tools without scrolling back to the top.

## Acceptance Criteria

1. The exercise editor toolbar remains fixed/sticky at the top of the viewport when scrolling.
2. Action buttons (Save Draft, Publish, etc.) remain accessible without scrolling.
3. Sticky behavior works correctly on all supported viewport sizes (mobile, tablet, desktop).

## Tasks / Subtasks

- [x] Task 1: Make the exercise editor header sticky (AC: #1, #2)
  - [x] 1.1 Extract the header div (lines 832-859 of ExerciseEditor.tsx) into a sticky container
  - [x] 1.2 Apply `sticky top-0 z-40` positioning with backdrop blur styling (follow SubmissionHeader pattern)
  - [x] 1.3 Add bottom border to visually separate sticky header from scrolling content
  - [x] 1.4 Add appropriate background to prevent content bleed-through (use `bg-background/95 backdrop-blur`)
- [x] Task 2: Fix responsive layout for mobile (AC: #3)
  - [x] 2.1 Make button text hidden on mobile, icon-only below `sm:` breakpoint: wrap button labels in `<span className="hidden sm:inline">` (Back to Exercises, Preview, Save Draft)
  - [x] 2.2 Reduce gap on mobile: `gap-2 sm:gap-3`
  - [x] 2.3 Verify header fits at 375px width with icon-only buttons
  - [x] 2.4 Verify sticky works within DashboardShell's `overflow-y-auto` main container (confirmed: no intermediate overflow clipping exists)
- [x] Task 3: Test and verify (AC: #1, #2, #3)
  - [x] 3.1 Verify no visual regression on short exercises (header shouldn't look different when not scrolled)
  - [x] 3.2 Verify z-index doesn't conflict with modals (AlertDialog, preview dialog, publish dialog)
  - [x] 3.3 Verify drag-and-drop sections still work correctly under the sticky header
  - [x] 3.4 Run existing test suite: `pnpm --filter=webapp test`

## Dev Notes

### Critical: Sticky vs. DashboardShell Scroll Container

The main content area scrolls inside `DashboardShell.tsx` via:
```
<main className="flex-1 overflow-y-auto relative">
```

**`position: sticky` only works relative to the nearest scrollable ancestor**, NOT the viewport. Since the scroll container is `<main>`, sticky `top-0` will stick to the top of `<main>`, which IS the desired behavior here (the TopBar is above `<main>` and already sticky). This should work correctly without modification to DashboardShell.

If sticky doesn't work as expected (e.g., the header has an ancestor with `overflow: hidden`), investigate the DOM tree between the header and `<main>` for any intermediate overflow clipping.

### Proven Sticky Pattern in This Codebase

Follow `SubmissionHeader.tsx` (line 155-197) — the exact pattern already working in production:

```tsx
<header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="flex h-14 items-center gap-3 px-4">
    {/* content */}
  </div>
</header>
```

Key details:
- `z-40` — matches TopBar and SubmissionHeader (below modals at z-50)
- `bg-background/95` + `backdrop-blur` — frosted glass effect, content readable underneath
- `supports-[backdrop-filter]:bg-background/60` — progressive enhancement for browsers supporting backdrop-filter
- `border-b` — visual separator when content scrolls under

### Target Code Location

**File:** `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx`

**Current header** (lines 832-859): A `<div>` with `flex items-center justify-between` containing:
- Left: Back button (ghost variant, navigates to `../exercises`)
- Right: Save status text + Preview button + Save Draft button + Publish button (conditional on DRAFT status)

**Change required:** Wrap or restyle this div to be sticky. The outer container is `<div className="container py-10 space-y-6">` — the sticky header should be OUTSIDE this container so it sticks correctly. Note: ExerciseEditor renders inside DashboardShell's own container div (`<div className="container mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">`), so the sticky bar will be constrained to that parent's max-width — this is correct and consistent with the content area.

```tsx
return (
  <div>
    {/* Sticky header — outside ExerciseEditor's own container */}
    <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between">
        {/* Back button, save status, action buttons */}
      </div>
    </div>
    
    {/* Scrollable content */}
    <div className="container py-6 space-y-6">
      {/* Title, Instructions, Sections, etc. */}
    </div>
  </div>
);
```

Note: No inner `container` class on the sticky bar's flex row — the parent DashboardShell container already constrains the width. Adding a nested `container` would double-constrain and waste horizontal space.

### Responsive: Mobile Overflow Fix (Critical)

The current header has **zero responsive classes** and requires ~511px minimum width. A 375px mobile viewport with container padding leaves only ~343px. This WILL overflow.

**Required fix:** Hide button text on mobile, show icon-only below `sm:` (640px):

```tsx
<Button variant="ghost" onClick={() => navigate("../exercises")}>
  <ArrowLeft className="mr-0 sm:mr-2 size-4" />
  <span className="hidden sm:inline">Back to Exercises</span>
</Button>

{/* Same pattern for Preview and Save Draft buttons */}
<Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
  <Eye className="mr-0 sm:mr-2 size-4" />
  <span className="hidden sm:inline">Preview</span>
</Button>
<Button variant="outline" size="sm" onClick={handleSaveDraft}>
  <Save className="mr-0 sm:mr-2 size-4" />
  <span className="hidden sm:inline">Save Draft</span>
</Button>
```

Also reduce gap on mobile: `gap-2 sm:gap-3`.

The "Publish" button should keep its text (it's short and is the primary CTA). The save status text should use `hidden sm:inline` as well — on mobile, the save state is already communicated by the button disabled state.

### Z-Index Hierarchy (verified from codebase)

| Element | Z-Index | Position |
|---------|---------|----------|
| Mobile bottom nav | z-50 | fixed |
| TopBar | z-40 | sticky |
| SubmissionHeader | z-40 | sticky |
| **Exercise Editor toolbar (new)** | **z-40** | **sticky** |
| Floating AI button | z-40 | fixed |

Modals (AlertDialog, Dialog) use Radix's built-in portal stacking — they render above all z-40 elements automatically. No conflict expected.

### What NOT to Do

- Do NOT use `position: fixed` — it removes the element from document flow and requires manual width/offset management
- Do NOT change DashboardShell.tsx — the scroll container pattern is correct and used across the entire app
- Do NOT add JavaScript scroll listeners — CSS `position: sticky` is the correct approach
- Do NOT change the debounce timing or save behavior (lesson from stories 12-1, 12-2)
- Do NOT modify any question editor components (MatchingEditor, TFNGEditor, etc.)

### Project Structure Notes

- All changes should be confined to `ExerciseEditor.tsx`
- No new files needed — this is a CSS/layout change to an existing component
- No backend changes required
- No new dependencies needed

### References

- [Source: apps/webapp/src/features/exercises/components/ExerciseEditor.tsx#lines 830-859] — Current header implementation
- [Source: apps/webapp/src/features/submissions/components/SubmissionHeader.tsx#lines 155-197] — Proven sticky pattern
- [Source: apps/webapp/src/components/DashboardShell.tsx#line 88] — Scroll container (`overflow-y-auto`)
- [Source: apps/webapp/src/components/TopBar.tsx#line 42] — App-level sticky header pattern
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 12, Story 12.3] — Requirements

### Previous Story Intelligence (Stories 12-1 & 12-2)

Both previous stories in this epic focused on input lag optimization (memoization, stable keys, optimistic state). Key learnings applicable here:
- **Do not break existing patterns** — the blur-flush-before-save in ExerciseEditor is critical for data integrity
- **Test suite baseline:** 932 tests passing as of story 12-2
- **ExerciseEditor.tsx is a large file (1209 lines)** — make minimal, targeted changes
- Stories 12-1 and 12-2 modified QuestionSectionEditor, MatchingEditor, TFNGEditor — this story should NOT touch those files

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None — clean implementation, no issues encountered.

### Completion Notes List
- Extracted exercise editor header from content container into a `<header>` element with `sticky top-0 z-40` positioning
- Applied frosted glass effect (`bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60`) matching existing SubmissionHeader pattern
- Added `border-b` for visual separation when content scrolls underneath
- Made header height consistent at `h-14` with `px-4` padding
- Responsive: button text hidden below `sm:` breakpoint (icon-only for Back, Preview, Save Draft); save status text hidden on mobile
- Responsive: gap reduced to `gap-2` on mobile, `gap-3` on `sm:+`
- Publish button retains text at all sizes (primary CTA, short label)
- Restructured return JSX: outer `<div>` wraps sticky `<header>` + content `<div className="container py-6 space-y-6">`
- Reduced container top padding from `py-10` to `py-6` to account for the sticky header height
- TypeScript compiles cleanly, 933/933 webapp tests pass, no regressions

### File List
- `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` — Modified (sticky header, responsive buttons, JSX restructure)
