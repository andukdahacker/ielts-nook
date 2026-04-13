# Story 13.1: Click-to-Scroll Comments

Status: review

## Story

As a Teacher in the grading queue,
I want to click a comment to scroll to it (instead of hover-to-scroll),
so that navigation is intentional and not accidentally triggered.

## Acceptance Criteria

1. Clicking a comment card (FeedbackItemCard or TeacherCommentCard) in the right-side AI feedback pane scrolls the student work panel (left pane) to the anchored text.
2. Hover over a comment card no longer triggers scroll behavior in the student work pane.
3. The anchored text is highlighted briefly (flash animation) after scrolling to it, then returns to its normal underline state.

## Tasks / Subtasks

- [x] Task 1: Separate highlight context into hover vs scroll-target (AC: 1, 2)
  - [x] 1.1 Extend `use-highlight-context.tsx` to track two separate states: `hoveredItemId` (for connection lines + visual ring) and `scrollTargetId` (for click-to-scroll). Alternatively, add an `onClickScroll` callback alongside the existing hover highlight.
  - [x] 1.2 Add a `setScrollTarget(id: string | null)` setter to the context, which triggers scroll + brief highlight, then auto-clears after animation completes.

- [x] Task 2: Update FeedbackItemCard — click triggers scroll, hover only highlights (AC: 1, 2)
  - [x] 2.1 Add an `onClick` handler that calls `setScrollTarget(item.id)` when the card has a valid/drifted anchor. Do NOT trigger on cards that are orphaned or have no anchor.
  - [x] 2.2 Keep `onMouseEnter`/`onMouseLeave` for connection line rendering and visual ring — these must NOT trigger scroll.
  - [x] 2.3 Add `cursor-pointer` class on the card root element when `hasAnchor` is true to signal clickability. Add a `title` attribute with i18n key (e.g., `t("feedbackItem.clickToScroll")`) so discoverability is clear on hover.

- [x] Task 3: Update TeacherCommentCard — same click-to-scroll pattern (AC: 1, 2)
  - [x] 3.1 Mirror the onClick handler from Task 2. Same guard: only for valid/drifted anchors.
  - [x] 3.2 Ensure click on edit/delete/visibility buttons does NOT trigger scroll (use `e.stopPropagation()` on those interactive elements, or check `e.target`).

- [x] Task 4: Update HighlightedText — scroll on scrollTargetId, flash animation (AC: 1, 3)
  - [x] 4.1 Replace the current `useEffect` that scrolls on `highlightedItemId` change with one that scrolls on `scrollTargetId` change.
  - [x] 4.2 After `scrollIntoView`, apply a brief flash animation (e.g., `animate-highlight-flash` — a Tailwind keyframe that transitions background from the active color to transparent over ~1.5s).
  - [x] 4.3 Keep the existing hover highlight behavior (background color on `highlightedItemId === seg.feedbackId`) unchanged — hover still shows the colored background while hovered, just doesn't scroll.

- [x] Task 5: Update touch behavior for mobile consistency (AC: 1, 2)
  - [x] 5.1 Touch tap on a card should behave like click (scroll to anchor), not like the current toggle-highlight pattern. Update `handleTouchStart` in both card components.

- [x] Task 6: Add flash animation keyframe (AC: 3)
  - [x] 6.1 Define `highlight-flash` keyframe via inline `<style>` tag in `HighlightedText.tsx` (matching the pattern used by `StampedAnimation.tsx`). The animation: start at severity-appropriate background color → fade to transparent over ~1.5s. **Do NOT look for `tailwind.config.ts` — it does not exist.** This project uses Tailwind CSS v4 with CSS-based config in `packages/ui/src/styles/brand.css`. Inline `<style>` is the established pattern for component-scoped keyframes.

- [x] Task 7: Update existing tests + add new tests (AC: 1, 2, 3)
  - [x] 7.1 Update `__tests__/use-highlight-context.test.tsx` — add tests for `scrollTargetId` state, `useScrollTargetValue()`, `useScrollTargetSetter()`.
  - [x] 7.2 Update `__tests__/FeedbackItemCard.test.tsx` — add test: clicking card with valid anchor calls `onScrollTo`. Add test: hovering does NOT call `onScrollTo`.
  - [x] 7.3 Update `__tests__/TeacherCommentCard.test.tsx` — same click vs hover tests. Add test: clicking interactive elements (edit, delete, visibility) does NOT trigger scroll.
  - [x] 7.4 Update `__tests__/HighlightedText.test.tsx` — mock `useScrollTargetValue` (new hook). Test: scrolls into view when `scrollTargetId` changes, does NOT scroll on `highlightedItemId` changes. Test: flash animation class applied after scroll.
  - [x] 7.5 Update `__tests__/AIFeedbackPane.test.tsx` — verify `onScrollTo` prop is threaded to card components.

## Dev Notes

### Current Behavior (What to Change)

The scroll-on-hover is caused by this chain:
1. `FeedbackItemCard.onMouseEnter` → calls `onHighlight(item.id, true)` (debounced 50ms)
2. This sets `highlightedItemId` in `HighlightProvider` context
3. `HighlightedText` has a `useEffect` watching `highlightedItemId` that calls `scrollRef.current.scrollIntoView()`

**Root cause:** scroll and visual highlight are coupled to the same state (`highlightedItemId`). The fix decouples them.

### Architecture Decision

**Recommended approach — extend existing context with a second state:**

```typescript
// In use-highlight-context.tsx, add:
const ScrollTargetContext = createContext<string | null>(null);
const ScrollTargetSetterContext = createContext<(id: string | null) => void>(() => {});

// HighlightProvider manages both:
// - highlightedItemId: set on hover (for connection lines + card ring)
// - scrollTargetId: set on click (for scroll + flash)
```

This preserves all existing hover behavior (connection lines, card ring highlights, text background on hover) while only decoupling the scroll action.

### Files to Modify

| File | Change |
|------|--------|
| `apps/webapp/src/features/grading/hooks/use-highlight-context.tsx` | Add `scrollTargetId` state + context + setter + hook |
| `apps/webapp/src/features/grading/components/FeedbackItemCard.tsx` | Add `onClick` → `onScrollTo`, keep hover as-is, add `cursor-pointer` |
| `apps/webapp/src/features/grading/components/TeacherCommentCard.tsx` | Same click-to-scroll pattern, guard interactive elements |
| `apps/webapp/src/features/grading/components/HighlightedText.tsx` | Change scroll trigger from `highlightedItemId` to `scrollTargetId`, add flash animation class |
| `apps/webapp/src/features/grading/components/AIFeedbackPane.tsx` | Accept + pass `onScrollTo` callback to card components |
| `apps/webapp/src/features/grading/GradingQueuePage.tsx` | Create `handleScrollTo` from `useScrollTargetSetter()`, pass to `AIFeedbackPane` as `onScrollTo` prop |

### Critical Guardrails

- **DO NOT remove hover highlight behavior.** Hover must still show: connection lines (via `ConnectionLineOverlay`), card ring highlight, and text background color. Only the scroll is removed from hover.
- **DO NOT break touch behavior.** Touch tap = click = scroll to anchor. The old touch toggle pattern (tap to highlight, tap again to un-highlight) should be replaced with tap-to-scroll.
- **DO NOT break keyboard navigation.** Focus/blur on cards should still highlight (connection lines + ring) but NOT scroll. Only explicit Enter/click should scroll.
- **Reuse existing `scrollIntoView` logic** — just change what triggers it.
- **The flash animation must use the correct severity color** for the item (red for error, amber for warning, blue for suggestion, emerald for teacher comments).
- **`e.stopPropagation()` on interactive children** (approve/reject buttons, edit textarea, dropdown menu) to prevent card click from firing when interacting with controls.

### Existing Patterns to Follow

- `useHighlightValue()` / `useHighlightSetter()` pattern — create matching `useScrollTargetValue()` / `useScrollTargetSetter()`
- Split context pattern (value vs setter) to avoid unnecessary re-renders
- `data-feedback-id` attribute on text spans used by `ConnectionLineOverlay` — do not change
- `data-card-id` attribute on cards — do not change
- All text through `useTranslation("grading")` — add new i18n keys to both `en/grading.json` and `vi/grading.json`:
  - `feedbackItem.clickToScroll` — tooltip for clickable cards (e.g., "Click to scroll to text" / "Nhấn để cuộn đến văn bản")
  - `teacherComment.clickToScroll` — same for teacher comment cards

### Scope Boundary — Student View Unaffected

`StudentFeedbackContent` also renders `HighlightedText`, but the student view is read-only with no sidebar cards that trigger hover or click. The scroll-trigger change (from `highlightedItemId` to `scrollTargetId`) does not affect the student view — no modifications needed in `apps/webapp/src/features/grading/student/`.

### Testing Approach

- **Framework:** Vitest + `@testing-library/react` + `@testing-library/user-event`
- **Test location:** All grading tests live in `apps/webapp/src/features/grading/__tests__/` (NOT co-located next to source files)
- **Existing tests to update:** `use-highlight-context.test.tsx`, `FeedbackItemCard.test.tsx`, `TeacherCommentCard.test.tsx`, `HighlightedText.test.tsx`, `AIFeedbackPane.test.tsx`
- **Patterns:** Components mock dependencies via `vi.mock()`. Hooks tested via `renderHook()` with wrapper. Debounce tested with `vi.useFakeTimers()` + `vi.advanceTimersByTime()`. DOM queried via `data-feedback-id` / `data-card-id` attributes.
- **Mock `scrollIntoView`:** Already mocked in existing `HighlightedText.test.tsx` via `Element.prototype.scrollIntoView = vi.fn()`.

### Project Structure Notes

- All grading components in `apps/webapp/src/features/grading/components/`
- All grading hooks in `apps/webapp/src/features/grading/hooks/`
- Grading page entry: `apps/webapp/src/features/grading/GradingQueuePage.tsx`
- Shared UI via `@workspace/ui` — no new shared components needed
- **No `tailwind.config.ts`** — project uses Tailwind CSS v4 with CSS config in `packages/ui/src/styles/brand.css`. Component-scoped keyframes use inline `<style>` tags (see `StampedAnimation.tsx` for pattern)
- i18n: `apps/webapp/src/locales/en/grading.json` and `apps/webapp/src/locales/vi/grading.json`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 13, Story 13.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR22 (Evidence Anchors on hover), FR49-FR53 (teacher comments)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Section 2.5 Evidence Anchoring, Section 5.1 Teacher Grading Flow]
- [Source: _bmad-output/planning-artifacts/user-feedback-backlog-2026-04-03.md — D1: Click-to-Scroll Comments, P1, Size S]
- [Source: apps/webapp/src/features/grading/hooks/use-highlight-context.tsx — current highlight state management]
- [Source: apps/webapp/src/features/grading/components/HighlightedText.tsx:135-142 — current scroll-on-hover useEffect]
- [Source: apps/webapp/src/features/grading/components/FeedbackItemCard.tsx:100-107 — current onMouseEnter/Leave handlers]
- [Source: apps/webapp/src/features/grading/components/TeacherCommentCard.tsx:68-76 — current onMouseEnter/Leave handlers]
- [Source: apps/webapp/src/features/grading/GradingQueuePage.tsx:77,269-274 — handleHighlight callback wiring]
- [Source: apps/webapp/src/features/grading/components/StampedAnimation.tsx — inline keyframe pattern for Tailwind v4]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Initial test run: 10 HighlightedText tests failed due to missing mock exports for `useScrollTargetValue`/`useScrollTargetSetter`
- Fixed by updating mock in HighlightedText.test.tsx to include new hook exports
- Second test run: 2 use-highlight-context tests failed — separate `renderHook` calls created independent Provider instances
- Fixed by combining hooks into single `renderHook` call with shared wrapper
- Final run: 1092/1092 tests pass, 108 test files

### Completion Notes List
- **Task 1:** Extended `use-highlight-context.tsx` with `ScrollTargetValueContext`, `ScrollTargetSetterContext`, `useScrollTargetValue()`, `useScrollTargetSetter()`. Independent from highlight state — no re-render coupling.
- **Task 2:** Added `onScrollTo` prop to `FeedbackItemCard`. Click calls `onScrollTo(item.id)` when `hasAnchor`. `cursor-pointer` class and `title` tooltip added. `stopPropagation` on approve/reject/edit buttons. Removed unused `touchActiveRef`.
- **Task 3:** Mirrored click-to-scroll in `TeacherCommentCard`. Wrapped dropdown menu and edit buttons in `stopPropagation` divs. Added `cursor-pointer` and `title` tooltip.
- **Task 4:** Changed `HighlightedText` scroll trigger from `highlightedItemId` to `scrollTargetId`. Flash animation via `animate-highlight-flash` class with CSS custom property `--flash-color` for severity-appropriate colors.
- **Task 5:** Touch tap now calls `onScrollTo` instead of toggling highlight. Old toggle pattern removed.
- **Task 6:** Inline `<style>` keyframe `highlight-flash` in `HighlightedText.tsx` matching `StampedAnimation.tsx` pattern. 1.5s ease-out from severity color to transparent.
- **Task 7:** Updated 5 test files. Added 23 new tests covering scroll target context, click-to-scroll, hover-doesn't-scroll, cursor-pointer, tooltip, stopPropagation on interactive elements, flash animation class.
- **Wiring:** `GradingQueuePage` creates `handleScrollTo` from `useScrollTargetSetter()`, passes through `AIFeedbackPane` to both card components.
- **i18n:** Added `feedbackItem.clickToScroll` and `teacherComment.clickToScroll` keys in EN and VI.

### Change Log
- 2026-04-13: Story 13.1 implemented — click-to-scroll comments, decoupled scroll from hover highlight

### File List
- `apps/webapp/src/features/grading/hooks/use-highlight-context.tsx` (modified)
- `apps/webapp/src/features/grading/components/FeedbackItemCard.tsx` (modified)
- `apps/webapp/src/features/grading/components/TeacherCommentCard.tsx` (modified)
- `apps/webapp/src/features/grading/components/HighlightedText.tsx` (modified)
- `apps/webapp/src/features/grading/components/AIFeedbackPane.tsx` (modified)
- `apps/webapp/src/features/grading/GradingQueuePage.tsx` (modified)
- `apps/webapp/src/locales/en/grading.json` (modified)
- `apps/webapp/src/locales/vi/grading.json` (modified)
- `apps/webapp/src/features/grading/__tests__/use-highlight-context.test.tsx` (modified)
- `apps/webapp/src/features/grading/__tests__/FeedbackItemCard.test.tsx` (modified)
- `apps/webapp/src/features/grading/__tests__/TeacherCommentCard.test.tsx` (modified)
- `apps/webapp/src/features/grading/__tests__/HighlightedText.test.tsx` (modified)
- `apps/webapp/src/features/grading/__tests__/AIFeedbackPane.test.tsx` (modified)
