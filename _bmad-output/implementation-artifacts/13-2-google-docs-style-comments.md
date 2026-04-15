# Story 13.2: Google Docs-Style Comments

Status: done

## Story

As a Teacher grading student work,
I want Google Docs-style inline highlight + sidebar comments instead of line-based anchoring,
so that feedback is precisely attached to the relevant text.

## Resolution: All ACs Pre-Satisfied

All 6 acceptance criteria are fully implemented. The Google Docs-style comment system was built across Epic 5 (Story 5-7: free-form teacher commenting) and Story 13-1 (click-to-scroll). The original user feedback D2 was written against an earlier codebase state that no longer exists.

### AC Verification (code-verified 2026-04-13)

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC1 | Select arbitrary text → create comment | `useTextSelection` captures character-level offsets via `data-char-start` attributes; `CommentPopover` appears at cursor |
| AC2 | Selected text highlighted | `HighlightedText` renders emerald dotted underline (inactive) / emerald background (active) for teacher comments |
| AC3 | Sidebar panel linked to highlights | `AIFeedbackPane` → `TeacherCommentCard`; `ConnectionLineOverlay` draws SVG Bezier paths between them |
| AC4 | Click sidebar → scroll to text | `scrollTargetId` context + `scrollIntoView()` + 1.5s flash animation (Story 13-1) |
| AC5 | Overlapping highlights distinguishable | Boundary-sweep segment builder with severity priority (error > warning > suggestion > teacher) |
| AC6 | Edit and delete from sidebar | Inline edit (Cmd+Enter), delete with confirmation, visibility toggle, author-only guards |

### Known Minor Gaps (not blocking ACs, candidates for future polish)

- **Mobile touch selection**: `useTextSelection` listens to `mouseup`/`keyup` only — no explicit touch event listeners. Mobile browsers generally fire `mouseup` for tap-selections, but edge cases on iOS Safari may miss selections.
- **`originalContextSnippet` flow**: The hook returns `text` (selected string); `StudentWorkPane.onCreateComment` handler constructs and passes `originalContextSnippet` downstream. Data flow works but is not immediately obvious from the hook API alone.

## Acceptance Criteria

1. Teacher can select arbitrary text in student work to create a comment.
2. Selected text is highlighted with a visual indicator.
3. Comments appear in a sidebar panel, linked to their highlighted text.
4. Clicking a sidebar comment highlights and scrolls to the anchored text.
5. Multiple overlapping highlights are visually distinguishable.
6. Comments can be edited and deleted from the sidebar.

## Implementation Audit

### Full-Stack Components (all production-ready)

**Frontend — Text Selection & Highlighting:**
| File | Role |
|------|------|
| `apps/webapp/src/features/grading/hooks/use-text-selection.ts` | Arbitrary text selection → global offsets via `data-char-start` |
| `apps/webapp/src/features/grading/hooks/use-highlight-context.tsx` | Hover highlight + scroll target state (split context pattern) |
| `apps/webapp/src/features/grading/hooks/use-anchor-validation.ts` | Drift detection via Levenshtein distance (0.8 valid / 0.5 drifted) |
| `apps/webapp/src/features/grading/components/CommentPopover.tsx` | Popover at cursor: textarea + visibility toggle + submit |
| `apps/webapp/src/features/grading/components/HighlightedText.tsx` | Boundary-sweep segments, severity colors, flash animation |
| `apps/webapp/src/features/grading/components/ConnectionLineOverlay.tsx` | SVG Bezier paths from sidebar cards to text highlights |

**Frontend — Sidebar & Orchestration:**
| File | Role |
|------|------|
| `apps/webapp/src/features/grading/components/TeacherCommentCard.tsx` | Card with edit/delete/visibility/click-to-scroll |
| `apps/webapp/src/features/grading/components/AIFeedbackPane.tsx` | Right pane: AI feedback + separated teacher comments section + AddCommentInput |
| `apps/webapp/src/features/grading/components/StudentWorkPane.tsx` | Left pane: renders HighlightedText, wires useTextSelection → CommentPopover |
| `apps/webapp/src/features/grading/GradingQueuePage.tsx` | HighlightProvider wrapper, handleScrollTo wiring, layout orchestration |

**Backend — CRUD API:**
| Endpoint | Route File |
|----------|------------|
| `POST /submissions/:submissionId/comments` | `grading.routes.ts` — creates anchored or general comment |
| `GET /submissions/:submissionId/comments` | `grading.routes.ts` — lists all comments for submission |
| `PATCH /submissions/:submissionId/comments/:commentId` | `grading.routes.ts` — updates content or visibility |
| `DELETE /submissions/:submissionId/comments/:commentId` | `grading.routes.ts` — deletes with auth check |

**Database — TeacherComment model** (Prisma schema lines 838-857):
`startOffset Int?`, `endOffset Int?`, `originalContextSnippet String?`, `visibility String @default("student_facing")`, tenant-isolated via `centerId`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 13, Story 13.2]
- [Source: _bmad-output/planning-artifacts/user-feedback-backlog-2026-04-03.md — D2, P2, Size L]
- [Source: _bmad-output/implementation-artifacts/13-1-click-to-scroll-comments.md — Previous story]
- [Source: apps/webapp/src/features/grading/ — Complete comment system implementation]

## Dev Agent Record

### Agent Model Used

### Completion Notes List
- Story closed as pre-satisfied — no code changes required
- All ACs verified against source code on 2026-04-13
- Implementation spread across Epic 5 (Story 5-7) and Epic 13 (Story 13-1)

### Change Log
- 2026-04-13: Story context created and immediately closed — exhaustive code audit confirms all 6 ACs met by existing implementation

### File List
