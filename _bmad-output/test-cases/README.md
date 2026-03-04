# Manual Test Cases

## File

- **`classlite-manual-test-cases.xlsx`** — 448 test cases across 10 sheets (one per epic)

## Structure

Each sheet has these columns:

| Column | Purpose |
|--------|---------|
| Test Case ID | Unique ID per epic (e.g., `1.2-005`) |
| Story | Links to the story file (e.g., `1.2` = Story 1.2 in `_bmad-output/implementation-artifacts/`) |
| Feature | Feature area within the story |
| Scenario | What is being tested |
| Role | OWNER, ADMIN, TEACHER, STUDENT, ALL, SYSTEM, or PUBLIC |
| Preconditions | What must be true before testing |
| Test Steps | Step-by-step instructions |
| Expected Result | What should happen |
| Priority | P1 = must test every release, P2 = standard, P3 = nice-to-have |
| Regression | "Yes" = re-run on every release |
| Last Updated | Date the test case was last reviewed |
| Status | Pass / Fail / Blocked / Skipped (fill during test run) |
| Tester | Who ran it |
| Notes | Bugs found, observations, links to issues |

## How to Run a Test Cycle

1. **Copy the sheet** for the epic(s) you're testing — name it with the date (e.g., `Epic 1 - 2026-03-10`)
2. **Filter by Priority** — start with P1, then P2
3. **Filter by Role** — test one role at a time (log in as that role, run all cases)
4. **Fill Status** for each row: Pass, Fail, Blocked, or Skipped
5. **Log bugs** in the Notes column with a link to the issue tracker
6. **After the cycle**, count Pass/Fail/Blocked to get your pass rate

## How to Update When Features Change

1. **Find the Story ID** of the changed feature (e.g., `2.3` for Conflict Detection)
2. **Filter the Excel** by that Story column value
3. **For changed behavior** — update Test Steps and Expected Result
4. **For new scenarios** — add rows at the bottom of that story's section
5. **For removed features** — delete the rows or mark them as "Deprecated" in Notes
6. **Update the `Last Updated` column** on every modified row
7. **Check the Regression column** — if the change affects a regression case, flag it for the next release

## Sheets

| Sheet | Epic | Cases |
|-------|------|-------|
| Epic 1 - Tenant & Users | Registration, Branding, RBAC, Login, Profile, CSV Import, Nav | 108 |
| Epic 2 - Scheduling | Courses, Scheduler, Conflicts, Attendance, Sessions, Notifications | 68 |
| Epic 3 - Exercise Builder | 16 question types, Answer Keys, Timer, Tags, AI Gen, Mock Tests, Library, Assignments | 80 |
| Epic 3.5 - Infrastructure | Docker, CI/CD, Migrations, Error Boundaries, E2E | 8 |
| Epic 4 - Submissions | Mobile UI, Auto-save, Offline Safeguards | 29 |
| Epic 5 - AI Grading | AI Analysis, Split Screen, Anchoring, Approval, Queue, Feedback, Comments | 57 |
| Epic 6 - Student Health | Traffic Light, Profile Overlay, Interventions, Teacher View, Flags | 36 |
| Epic 7 - Notifications | Engagement Emails, Preferences, Parent Emails | 23 |
| Epic 9 - Billing | Dashboard, Polar Integration, Grace Period, Tier Management | 28 |
| Epic 10 - Marketing | Landing Page, SEO, Responsive, Performance | 14 |

## Role Testing Order

Test each role separately. Recommended order:

1. **OWNER** — has full access, covers the most ground
2. **ADMIN** — same as Owner minus a few restrictions (role changes, billing)
3. **TEACHER** — scoped access, important permission boundaries to verify
4. **STUDENT** — most restricted, focus on submission flow and dashboard

## Tips

- **Use Excel filters heavily** — filter by Role + Priority to create focused test sessions
- **Permission boundary tests are critical** — always verify what each role CANNOT do, not just what they can
- **Cross-tenant isolation** — if you have two test centers, periodically verify Center A never sees Center B data
- **Mobile testing** — many cases have responsive breakpoints (375px, 768px, 1024px). Test on real devices when possible
