---
title: "User Feedback Backlog"
date: "2026-04-03"
source: "User feedback collected and triaged by PM"
status: "Draft — pending Ducdo's priority sign-off"
totalItems: 44
---

# User Feedback Backlog — 2026-04-03

All 44 items from user feedback, organized into themed epics with priority tiers.

**Priority Tiers:**
- **P0 — Critical:** Blocks core workflows or causes data loss. Fix immediately.
- **P1 — High:** Significant UX pain or missing expected behavior. Next sprint.
- **P2 — Medium:** Polish, responsiveness, QoL improvements. Soon after P1.
- **P3 — Low:** Nice-to-have, cosmetic, or deferred by design decision.
- **P4 — Strategic:** Major new features requiring design/architecture work first.

---

## Epic A: Critical Bug Fixes

_Bugs that block core workflows or cause data loss._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| A1 | Course Detail Next Button | Pressing Next saves changes and closes sidebar but doesn't show the next screen | P0 | S |
| A2 | Option Not Saved on Add | If user doesn't blur input before clicking "Add Option", that option is silently lost | P0 | S |
| A3 | Question Text Missing in Preview | Note/Table/Flowchart/Matching Headings/Matching Sentence Ending question text not rendering in preview | P0 | M |
| A4 | Matching Headings Space Bug | Space character in heading causes error when matching with paragraph | P0 | S |
| A5 | Unsaved Changes False Positive | "Unsaved changes" indicator persists after successful save draft | P1 | S |
| A6 | Exercise Edit Breadcrumbs | All breadcrumb links navigate to dashboard homepage instead of correct pages | P1 | S |
| A7 | Students Can Edit After Submit | Submitted exercises remain editable — students should be locked out (teacher can unlock) | P1 | M |

---

## Epic B: Exercise Editor UX

_UX improvements for the exercise builder and editor experience._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| B1 | Input Lag — Matching Headings | Instructions, paragraphs, and headings inputs are laggy | P1 | M |
| B2 | Input Lag — T/F/NG | Answer inputs are laggy | P1 | M |
| B3 | Sticky Toolbar | Tools and actions should stay sticky/pinned in exercise edit view | P1 | S |
| B4 | Auto-scroll to New Section | When a new section is created (manual or AI), screen should scroll to it | P2 | S |
| B5 | Stay on Page After Publish | After publishing, user stays on edit page instead of navigating to exercise list. Add Assign button when published, keep disabled when draft | P1 | S |
| B6 | Matching Headings Duplicate Warning | If 2 paragraphs share the same heading, show a validation warning | P2 | S |
| B7 | Blank Placeholder Format | Change `__1__` to `(1)` or `{1}` across all exercise types | P2 | S |
| B8 | Rename "Categories" to "Features" | In Matching Feature exercise type, rename the word "Categories" to "Features" | P2 | XS |
| B9 | Writing Exercise — Remove Redundant Fields | Hide/remove `section` and `questionText` fields for Writing exercises since `writingPrompt` and `instructions` cover the need | P2 | S |
| B10 | Correct Answer Discoverability | Note/Table/Flowchart/Word Bank correct answer UI exists but users can't find it. Improve discoverability (e.g., visual cue, always-visible panel) | P2 | M |
| B11 | Mock Test Drag Not Working | Exercise drag handles show in mock test but dragging doesn't work | P1 | S |
| B12 | Edit After Publish — Only Before Submissions | Allow teachers to edit published exercises only if no student has submitted yet. Block edits once first submission exists | P2 | M |
| B13 | Section Navigation for Long Exercises | Reading/Listening with many sections — add outline/minimap sidebar for easier navigation | P2 | M |

---

## Epic C: Exercise List & Table

_Table display and overflow issues._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| C1 | Table Overflow with Sidebar | Exercise list table overflows when sidebar is open. Make table fit page width with horizontal scroll | P1 | S |

---

## Epic D: Grading & Feedback

_Grading workflow improvements._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| D1 | Click-to-Scroll Comments | Grading Queue: comment hover scrolls to it — change to click-to-scroll | P1 | S |
| D2 | Google Docs-Style Comments | Replace line-based comment anchoring with Google Docs-style inline highlights + sidebar comments | P2 | L |
| D3 | Manual Grading Discoverability | Manual grading exists but users can't find it. Add clearer entry point or onboarding hint | P2 | S |

---

## Epic E: Session & Schedule Redesign

_Major rework of how sessions are generated and managed._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| E1 | Auto-Generate Sessions from Recurrence | When a class has a recurring schedule + end date, auto-populate all sessions. No "Generate Sessions" button. Infinite rolling if no end date | P1 | L |
| E2 | Edit/Cancel Individual Sessions | Teachers can edit or cancel a single session occurrence (exception handling) | P1 | M |
| E3 | Reschedule Single Occurrence | Drag or edit to reschedule one session without affecting the series | P1 | M |
| E4 | Update Recurrence Rule | Change recurrence pattern and apply to future sessions only | P1 | M |

---

## Epic F: Role-Based Access & Permissions (RBAC Audit)

_Redesign role boundaries and sidebar structure._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| F1 | RBAC Audit | Full audit: map what Owner/Admin/Teacher/Student should and shouldn't access | P1 | M |
| F2 | Admin — Remove Grading/Assignment Views | Admins should not see grading queue or exercise assignment — teachers only | P1 | S |
| F3 | Owner = God Mode | Owner gets access to everything. Sidebar needs nested/structured redesign | P1 | M |
| F4 | Clearer Role Distinction in UI | Users report confusion between roles. Add visual indicators, role labels, or permission-based UI filtering | P2 | M |

---

## Epic G: Dashboard Redesign

_Per-role dashboards with real-time data._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| G1 | Differentiate Dashboard vs Students Page | Currently identical — redesign dashboard to be role-specific landing page | P2 | L |
| G2 | Real-Time Dashboard Widgets | Sessions/classes today, at-risk students, late assignments, etc. | P2 | L |
| G3 | Owner Test Management | Owner can create/manage test dates (entry/exit, midterm) and view scores | P3 | L |

---

## Epic H: UI Polish & Quick Wins

_Small fixes, hide unused features, responsive issues._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| H1 | Remove AI Assistant | Remove AI Assistant from the app and all E2E tests | P1 | M |
| H2 | Hide Language Toggle | Hide language switcher since multi-language is not supported yet | P1 | XS |
| H3 | Hide Achievement & Streak | Hide these sections until we have functionality for them | P1 | XS |
| H4 | Hide Already-Added Students in Roster | When adding students to a class roster, filter out students already added | P1 | S |
| H5 | Add Exercise Modal — Responsive | Fix responsive layout for the Add Exercise modal | P2 | S |
| H6 | Mark Attendance — Responsive + Padding | Fix responsive layout and add padding | P2 | S |
| H7 | Delete Session — Responsive | Fix responsive layout for delete session dialog/flow | P2 | S |
| H8 | Google Account Avatar | Use the Google account avatar when user logs in with Google | P2 | S |
| H9 | Collapsed Navbar Tooltips | Add tooltip help text on hover for collapsed navigation items | P2 | XS |
| H10 | Selectable Timezone in Settings | Make timezone a dropdown/selectable field instead of manual input | P2 | S |
| H11 | Light/Dark Mode Toggle | Add theme toggle for light and dark mode | P3 | M |
| H12 | Extend Login Session | Extend session to 3 months or add "Keep me logged in" option | P1 | S |

---

## Epic I: Knowledge Hub (NEW)

_New module: document library for centers._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| I1 | Knowledge Hub MVP | Upload PDFs, books, slides. Flat storage with tag-based grouping. Searchable and indexed | P1 | XL |
| I2 | Link to Golden Samples | Connect Knowledge Hub documents to the golden sample feature | P1 | M |

---

## Epic J: Course Redesign (NEW)

_Separate Course as a reusable, standalone entity._

| ID | Item | Description | Priority | Size |
|----|------|-------------|----------|------|
| J1 | Course as Standalone Page | Separate course from class. Course has its own page with timeline, exercises, samples, documents | P1 | XL |
| J2 | Reusable Course → Class | A designed course can be reused to create multiple class instances | P1 | L |
| J3 | Course ↔ Knowledge Hub Link | Courses can reference documents from the Knowledge Hub | P1 | M |

---

## Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 4 | Critical bugs — data loss or workflow blockers |
| **P1** | 27 | High-impact UX, bugs, structural fixes, and strategic differentiators |
| **P2** | 16 | Polish, responsiveness, medium improvements (incl. Google Docs comments) |
| **P3** | 2 | Nice-to-have (dark mode, test management) |

---

## Suggested Sprint Sequence

### Sprint N (Next): P0 + High-Impact P1 Quick Wins
Focus: Critical bugs (A1-A4), remove/hide unused features (H1-H3), session login (H12), exercise editor pain (B1-B3, B5, B11, C1), submitted exercise lock (A7), grading click-to-scroll (D1), roster filter (H4)

### Sprint N+1: RBAC + Session Redesign + Knowledge Hub/Course Design
Focus: RBAC audit (F1-F3), Session/Schedule redesign (E1-E4), breadcrumbs fix (A6), unsaved changes bug (A5). **Begin design work** for Knowledge Hub (I1-I2) and Course redesign (J1-J3) — architecture, data model, UX wireframes.

### Sprint N+2: Knowledge Hub MVP + Course Redesign Build
Focus: Knowledge Hub MVP implementation (I1-I2), Course as standalone entity (J1-J3). This is the differentiator sprint.

### Sprint N+3: P2 Polish + Google Docs Comments
Focus: Responsive fixes (H5-H7), editor UX improvements (B4, B6-B10, B12-B13), Google Docs-style comments (D2), dashboard differentiation (G1), UI polish (H8-H10)

### Sprint N+4+: Dashboard & Remaining
Focus: Dashboard real-time widgets (G2), Owner test management (G3), dark mode (H11), remaining P2/P3 items
