---
stepsCompleted:
  [
    step-01-init,
    step-02-discovery,
    step-03-success,
    step-04-journeys,
    step-05-domain,
    step-06-innovation,
    step-07-project-type,
    step-08-scoping,
    step-09-functional,
    step-10-nonfunctional,
    step-11-polish,
    step-12-complete,
  ]
inputDocuments:
  [
    "_bmad-output/planning-artifacts/product-brief-classlite-2026-01-16.md",
    "README.md",
    "AGENTS.md",
    "package.json",
  ]
workflowType: "prd"
classification:
  projectType: saas_b2b
  domain: edtech
  complexity: medium
  projectContext: brownfield
lastEdited: "2026-04-06"
editHistory:
  - date: "2026-01-17"
    changes: "Updated Executive Summary, User Journeys, Functional Requirements, and NFRs based on UX Design Specification (High-Velocity Pedagogy, Offline-Proofing, Grading Workbench details)."
  - date: "2026-01-24"
    changes: "Narrative expansion (Admin & Content journeys), domain compliance (Decree 13), RBAC matrix addition, and structural hardening of FRs/NFRs to remove implementation leakage and improve SMART alignment."
  - date: "2026-01-29"
    changes: "Added comprehensive IELTS Exercise Type Taxonomy (Section 3.1) with 13 Reading types, 6 Listening types, Writing tasks, and Speaking format. Added FRs for audio support, timers, mock tests, rubrics, skill tagging, and answer key management. Updated Journey 5 for realistic IELTS workflow."
  - date: "2026-02-11"
    changes: "Removed Zalo integration entirely (business registration blocker, poor docs, no validated demand). Replaced parent communication with email-based notifications. Added Parent Portal to Phase 2. Added Section 9: Billing & Subscription with per-active-student pricing model, Polar.sh self-serve billing, and billing FRs (FR43-FR48). Updated integrations and RBAC matrix."
  - date: "2026-02-17"
    changes: "Added free-form teacher commenting (FR49-FR53). Teachers can add text-anchored and general comments with private/student-facing visibility toggle, mixed into AI feedback feed. Updated Executive Summary, Journey 1 (new Annotate step), and RBAC matrix."
  - date: "2026-04-06"
    changes: "Aligned PRD with architecture addendum for Epics 8.5, 18, 19. Added Knowledge Hub (FR54-FR59), Course Management (FR60-FR64), Session Hub (FR65-FR69) — 16 new FRs. Added Journey 7 (Session Prep) and Journey 8 (Content Curator). Moved Knowledge Hub, Course Redesign, Session Hub from Phase 2 to Phase 1.5. Updated FR32/FR33 to reference Knowledge Hub as golden sample source. Added 10 new RBAC rows. Added NFR12 (50MB upload limit). Updated Executive Summary with Knowledge Hub, Course-as-template, and Session Hub."
  - date: "2026-04-06"
    changes: "Aligned PRD with architecture addendum for Epic 14 (Session & Schedule Redesign). Added FR70-FR74 for auto-generation from recurrence rules, individual session exceptions, and recurrence rule updates. Updated Journey 4 for recurrence-based scheduling. Added Session Redesign to Phase 1.5 roadmap. Added 2 RBAC rows. Updated Executive Summary."
---

# Product Requirements Document - classlite

**Author:** Ducdo
**Date:** 2026-01-24

## Executive Summary

**ClassLite** is a B2B SaaS Learning Management System tailored for small to medium-sized IELTS centers in Vietnam. It streamlines operations by unifying administrative logistics (scheduling, rosters), pedagogical delivery (AI-assisted grading, exercise building), and content management (Knowledge Hub, course planning) into a single "Lite" platform.

The core vision is **"High-Velocity Pedagogy"**. By automating 80% of the grading drudgery through an AI-assisted workbench ("Review -> Annotate -> Approve"), ClassLite empowers expert teachers to double their feedback speed without sacrificing quality. Teachers retain full editorial control — they can add their own free-form comments anchored to specific text, alongside AI-generated feedback, with per-comment visibility control (private notes vs student-facing). A **Knowledge Hub** serves as the center's unified content library — uploaded files, authored rich-text pages, and golden samples for AI style training all live in one searchable, tagged system. **Courses** function as reusable templates with structured lesson plans, linked materials, and exercises that snapshot-copy into classes. **Sessions** become the daily teaching hub where teachers see today's content, customize materials, and journal pre/post-class notes. **Scheduling** is automated — sessions are auto-generated from recurrence rules (weekly/biweekly, with end date or rolling window), with per-occurrence exception handling for cancellations and reschedules that survive rule changes. For owners, it offers **"Glanceable Intelligence"**—immediate visibility into center health ("Done by 5 PM" philosophy) without complex reporting tools.

### Target Users

- **Teaching Owner:** Requires **"Clarity & Calm"**. Needs instant "Traffic Light" visibility into student performance and business health to make data-driven decisions without manual spreadsheets.
- **Expert Teacher:** Values **"Respect & Support"**. Needs a "Grading Workbench" that acts as a humble assistant, drafting feedback and scores that they can validate in seconds ("3-Minute Loop") while retaining full editorial control.
- **Student:** Needs to feel **"Safe & Seen"**. Requires a friction-free, offline-first mobile interface ("Login-Free feeling") to submit work reliably from anywhere, even with unstable internet.
- **Center Admin:** Needs **"Operational Efficiency"**. Responsible for the logistical backbone—rosters, schedules, and resource allocation—ensuring the center runs without friction.

---

## Success Criteria

### User Success

- **Teaching Owner (Visibility Guarantee)**:
  - **Metric:** "Time to Insight"
  - **Target:** Generate a "Student Health Report" (at-risk students + actions) in **< 1 minute**.
  - **Baseline:** Currently takes hours of manual aggregation.
- **Expert Teacher (Efficiency Guarantee)**:
  - **Metric:** "Grading Time Reduction"
  - **Target:** **50% reduction** in time spent grading Writing/Speaking assignments compared to manual process.
  - **Constraint:** Must maintain feedback depth (no generic "good job" comments).
- **Student (Frictionless Submission)**:
  - **Metric:** "Submission Friction"
  - **Target:** Student can submit homework in **< 3 clicks** from login.
  - **Outcome:** Zero student complaints about submission complexity during pilot.

### Business Success

- **Pilot Launch Penetration**:
  - **Goal:** Validated deployment in **3 pilot centers**.
  - **Target:** **100% of teachers** use the platform for **every class** for a continuous **2-week period**.
- **Retention**:
  - **Target:** Zero "Student Churn" flagged due to missed performance signals during the pilot.

### Technical Success

- **AI Performance**:
  - **Target:** Teachers accept **> 70%** of AI-suggested grammar corrections and scoring without edit.
  - **Target:** Teachers accept **> 80%** of AI-parsed questions from PDF uploads.
- **Stability**:
  - **Target:** Zero "Class Stopping" bugs (bugs preventing class operations) during pilot.

---

## Product Scope & Roadmap

### MVP Strategy (Phase 1)

**Focus:** The "Painkiller" MVP. Robust, autonomous operations for the two biggest pains: **Grading Efficiency** and **Scheduling Logistics**.

- **Administration**: Auth (Fixed Roles), Center Config, Roster Management, Visual Scheduler.
- **Pedagogy**: IELTS Exercise Builder (see Exercise Type scope below), Student Submission (Mobile Web).
- **AI Core**: AI Grading Workbench (Generic AI models) to prove efficiency.

**Exercise Builder - MVP Scope:**
- **Reading (8 types):** R1-R8 (MCQ Single/Multi, TFNG, YNNG, Sentence Completion, Short Answer, Summary Completion with/without word bank)
- **Listening (6 types):** L1-L6 with audio upload and playback (single-play + practice modes)
- **Writing (3 types):** W1-W3 with AI-assisted band scoring
- **Core Features:** Time limits, answer key management, skill/level tagging, auto-grading for Reading/Listening

### Phase 1.5 (Differentiation Update)

**Focus:** Innovation, Content Management, and Retention. De-risked features deployed shortly after stability is proven.

- **Knowledge Hub**: Unified content library — file uploads (PDF, DOCX, PPTX up to 50MB), markdown rich-text pages, and golden samples for AI style training. Shared tag system across exercises and documents. Inline PDF preview.
- **Course Redesign**: Courses as standalone reusable templates with structured lesson plans, linked documents and exercises. Snapshot-copy to classes on creation. Dedicated course page.
- **Session Hub**: Sessions become the daily teaching hub — lesson content inherited from course plans, customizable materials and assignments per session, append-only teacher session notes (pre/post class journal).
- **Session & Schedule Redesign**: Sessions auto-generated from recurrence rules (weekly/biweekly with end date or rolling 3-month window). Individual session exceptions (cancel, reschedule, edit) preserved across recurrence rule changes. Completed sessions protected from re-generation.
- **Methodology Guardian**: Golden samples unified into Knowledge Hub (Document type: GOLDEN_SAMPLE). AI style training via Few-Shot Prompting from curated student work + teacher feedback pairs.
- **Billing**: Self-serve subscription via Polar.sh (per-active-student pricing).
- **Exercise Builder Additions:** R9-R12 (Matching types: Headings, Information, Features, Sentence Endings)

### Phase 2 (Growth)

**Focus:** Scale and Ecosystem.

- **Features**: Student Personal Notes (with entity linking to documents, sessions, assignments), Gamification (Badges/Points), Native Mobile Apps, **Parent Portal** (Parent role with read-only student progress view, invite/onboarding flow), Course template versioning with "pull updates" action.
- **Exercise Builder Additions:** R13-R14 (Diagram/Flow-chart types), S1-S3 (Speaking with audio recording), Full Mock Test Assembly with band conversion.

---

## User Journeys

### Journey 1: The "3-Minute Grading Loop" (Teacher)

**Goal:** Reduce grading time per essay from 15 mins to < 3 mins while increasing feedback quality.

- **Trigger:** Teacher opens "Grading Workbench" (Deep link or Dashboard).
- **Step 1 (Auto-Load):** System auto-loads the first "Ready" submission in < 500ms.
- **Step 2 (Review):** Teacher sees split-screen view: Student Essay (Left) vs AI Analysis (Right). AI highlights grammar errors and suggests band scores.
- **Step 3 (Verify):** Teacher hovers over AI comments; "Evidence Anchors" visually connect comments to text. Teacher swipes to reject bad suggestions or clicks to accept/edit.
- **Step 3b (Annotate):** Teacher selects a passage in the student's text and adds a custom comment (e.g., "Good use of cohesive devices here"). Teacher toggles visibility to "Student-Facing". Comment appears in the feedback feed alongside AI items.
- **Step 4 (Completion):** Teacher clicks "Approve & Next". "Stamp" animation plays. Next submission slides in automatically.
- **Validation:** Teacher feels in "Flow". No manual file opening/closing.

### Journey 2: The "3 Clicks to Rescue" (Owner)

**Goal:** Identify and save at-risk students before they churn.

- **Trigger:** Owner sees "Red Light" indicator on Dashboard.
- **Step 1 (Scan):** Click Red indicator. Student Profile Overlay opens (no page reload).
- **Step 2 (Diagnose):** Root cause displayed immediately (e.g., "Missed 3 Homeworks").
- **Step 3 (Act):** Click "Contact Parent". System sends email notification with pre-filled "Concern Template" and logs the intervention in-app.
- **Validation:** Intervention logged. Owner feels "in control".

### Journey 3: The "Offline-Proof" Submission (Student)

**Goal:** Submit homework reliably regardless of network quality.

- **Trigger:** Student finishes typing/uploading photo on mobile web.
- **Step 1 (Attempt):** Student clicks "Submit". Network check fails (Offline).
- **Step 2 (Safeguard):** UI shows "Saved Locally" banner with "Do Not Close Tab" warning. Amber status icon rotates.
- **Step 3 (Sync):** Student walks to better signal. Background worker detects connection.
- **Step 4 (Success):** Data uploads automatically. Green "Success" checkmark appears.
- **Validation:** Zero data loss. Student trusts the platform.

### Journey 4: The Logistics Master (Admin/Owner)

**Goal:** Setup a new center and class schedule in under 10 minutes.

- **Trigger:** New center sign-up.
- **Step 1 (Setup):** Owner configures center name and timezone.
- **Step 2 (Roster):** Owner uploads student/teacher CSV or invites via email.
- **Step 3 (Schedule):** Owner creates a recurring schedule — "IELTS Writing, Tue & Thu at 3pm, weekly, ends June 30." System auto-generates all session instances. Conflict warnings surface post-generation (non-blocking).
- **Step 4 (Resolution):** Owner resolves a flagged teacher conflict by adjusting one session's time. That session becomes an exception — it survives future rule changes.
- **Step 5 (Exceptions):** Teacher cancels next week's Thursday session (holiday). Students are notified. The cancelled session remains visible with a strikethrough badge.
- **Validation:** Roster and schedule are live. Sessions auto-populate from rules. Individual adjustments don't break the series.

### Journey 5: The Content Architect (Teacher)

**Goal:** Create a realistic IELTS Reading passage with mixed question types in under 10 minutes.

- **Trigger:** Teacher needs a new Reading exercise for Band 6-7 students.
- **Step 1 (Source):** Teacher uploads an academic article PDF (~800 words).
- **Step 2 (Configure):** Teacher selects question types: "True/False/Not Given" (5 questions), "Matching Headings" (6 paragraphs), "Summary Completion" (4 blanks). Sets 20-minute time limit.
- **Step 3 (Generate):** AI parses the passage, generates questions with answer keys. Preview shows passage with paragraph labels and question sections.
- **Step 4 (Refine):** Teacher adjusts a distractor in the TFNG section, reorders one heading option, adds an alternative accepted spelling to an answer.
- **Step 5 (Tag & Assign):** Teacher tags as "Reading / Band 6-7 / Academic" and assigns to Class 10A with Friday 6 PM deadline.
- **Validation:** Exercise is published with auto-grading enabled. Teacher saved 45 minutes vs manual creation.

### Journey 6: The Listening Lab (Teacher)

**Goal:** Create a Listening exercise with audio and mixed question types.

- **Trigger:** Teacher has an IELTS-style audio recording to use.
- **Step 1 (Upload Audio):** Teacher uploads MP3 file (5 minutes). System shows waveform preview.
- **Step 2 (Add Questions):** Teacher manually creates: "Form Completion" (5 blanks), "Multiple Choice" (3 questions). Links each section to audio timestamps.
- **Step 3 (Configure Playback):** Teacher sets "Single Play" mode for test simulation, enables "Show Transcript After Submit".
- **Step 4 (Preview):** Teacher tests the exercise as a student would experience it.
- **Step 5 (Assign):** Assigned to Class 10A with instructions: "Use headphones in a quiet room."
- **Validation:** Students can practice realistic Listening conditions. Auto-grading handles answer variants.

### Journey 7: The Session Prep (Teacher)

**Goal:** Prepare for today's class in under 5 minutes with all materials, content, and notes in one place.

- **Trigger:** Teacher clicks today's session in their schedule.
- **Step 1 (Review):** Session detail opens showing lesson title, markdown content (inherited from course lesson plan), linked materials (PDFs, pages), and linked assignments.
- **Step 2 (Customize):** Teacher adds an extra document from Knowledge Hub for today's class. Removes one exercise that's too advanced for this group.
- **Step 3 (Prep Notes):** Teacher writes a pre-session note: "Focus on Hoa's essay structure. Minh missed last class — recap paragraph 2."
- **Step 4 (Teach):** Class happens.
- **Step 5 (Reflect):** After class, teacher writes a post-session note: "Group struggled with coherence transitions. Revisit next week."
- **Validation:** Teacher feels prepared and organized. Notes accumulate as a running journal across sessions.

### Journey 8: The Content Curator (Teacher/Admin)

**Goal:** Build a searchable, organized content library and connect it to courses and AI grading.

- **Trigger:** Teacher has materials to organize for an upcoming IELTS prep course.
- **Step 1 (Upload):** Teacher uploads 3 PDFs (past exam papers) and creates 2 markdown pages (vocabulary lists, essay structure guide) in the Knowledge Hub.
- **Step 2 (Tag):** Teacher tags all items with "IELTS Writing", "Band 6-7". Same tags already used on exercises appear in the tag picker.
- **Step 3 (Golden Sample):** Owner creates a Golden Sample document — pastes a student essay and the ideal teacher feedback. Marks it active for Writing.
- **Step 4 (Link to Course):** Teacher opens the "IELTS Prep Q3" course, adds materials to Lesson Plan 3: "Opinion Essays". Links the vocabulary page and one past exam PDF.
- **Step 5 (Student Access):** After class, students see the linked materials in their session view. They can also browse the Knowledge Hub directly for tagged content.
- **Validation:** Content is centralized, discoverable, and flows from library → course → session → student.

---

## Functional Requirements

### 1. Authentication & Center Management

_Traces to: Journey 4_

- **FR1**: [Visitor] can [sign up their own center or login via Google/Email].
- **FR2**: [Platform Admin] can [manually provision new tenants].
- **FR3**: [Center Owner/Admin] can [invite users via email].
- **FR4**: [System] can [enforce RBAC based on Role (Owner, Admin, Teacher, Student)].
- **FR5**: [System] can [enforce logical data isolation via tenant identifiers].
- **FR6**: [Center Owner/Admin] can [configure center settings (Name, Logo, Timezone)].

### 2. Class Logistics & Scheduling

_Traces to: Journey 4_

- **FR7**: [Admin] can [manage Courses and Class Sessions].
- **FR8**: [Admin] can [assign Teachers and Students to Classes].
- **FR9**: [User] can [view a visual Weekly Schedule of assigned classes].
- **FR10**: [System] can [detect and warn of resource conflicts (Room/Teacher double-booking) during scheduling].
- **FR11**: [Teacher] can [mark attendance (Present/Absent)].
- **FR12**: [System] can [notify participants of schedule changes via in-app notification and email within 30 seconds of update].

### 2.1 Session & Schedule Redesign (Phase 1.5)

_Traces to: Journey 4, Epic 14_

- **FR70**: [System] can [auto-generate session instances from a recurrence rule (day of week, start/end time, frequency of weekly or biweekly, and optional end date) when a schedule is created or updated, capped at a maximum horizon of 12 months].
- **FR71**: [System] can [generate sessions on a rolling 3-month window for schedules without an end date, via a daily background job that fills the gap automatically].
- **FR72**: [Teacher] can [cancel a single session occurrence without affecting the rest of the series, preserving the cancelled session as a visible record with visual marking and triggering student notification within 30 seconds].
- **FR73**: [Teacher] can [reschedule a single session occurrence to a different time or date, creating an exception that is preserved when the recurrence rule is later changed, with conflict detection on the new time slot].
- **FR74**: [Admin] can [update a recurrence rule (day, time, frequency) with changes applied to future sessions only — past sessions and manually edited or cancelled exceptions are preserved, and affected participants are notified via summary email].

### 3. Pedagogy & Exercise Builder

_Traces to: Journey 5, Journey 6_

- **FR13**: [Teacher] can [create exercises using the IELTS Exercise Builder supporting all question types defined in Section 3.1].
- **FR14**: [Teacher] can [upload PDF/Word docs to trigger AI exercise generation for Reading question types].
- **FR15**: [Teacher] can [edit AI-generated content before publishing].
- **FR16**: [Teacher] can [assign exercises with due dates and optional time limits].
- **FR17**: [Student] can [view "Due Soon" assignments dashboard].
- **FR37**: [Teacher] can [upload audio files (MP3/WAV/M4A, max 100MB) for Listening exercises with configurable playback rules].
- **FR38**: [Teacher] can [set time limits on exercises with auto-submit on expiry and optional "5-minute warning" alert].
- **FR39**: [Teacher] can [assemble multiple exercises into a Mock Test with ordered sections, cumulative timing, and unified scoring].
- **FR40**: [Teacher] can [define answer keys with acceptable variants (spelling, capitalization, synonyms) for auto-grading].
- **FR41**: [Teacher] can [tag exercises by Skill (Reading/Listening/Writing/Speaking), Target Band Level, and Topic for organization and filtering].
- **FR42**: [System] can [provide IELTS-aligned band descriptor rubrics for Writing/Speaking with per-criterion scoring (1-9 scale)].

### 4. Grading Workbench

_Traces to: Journey 1_

- **FR18**: [Student] can [submit assignments via mobile-responsive interface].
- **FR19**: [System] can [auto-save student work-in-progress to persistent client-side storage every 3 seconds].
- **FR20**: [System] can [trigger AI analysis within 5 seconds of submission (Auto-grade Reading/Listening; Suggest scores for Writing/Speaking)].
- **FR21**: [Teacher] can [use a split-screen interface (Student Work / AI Analysis) for grading].
- **FR22**: [Teacher] can [view visual "Evidence Anchors" connecting AI comments to text evidence on hover].
- **FR23**: [Teacher] can [apply AI suggestions (score + grammar fix) with one click].
- **FR24**: [System] can [maintain comment anchors if < 20% of text is modified; it shall orphan the comment if modified by > 50%].
- **FR25**: [Teacher] can [reject AI suggestions, removing them from the final feedback].
- **FR26**: [System] can [auto-advance to the next submission upon approval (with an optional "Breather" pause after 5 items)].
- **FR49**: [Teacher] can [add text-anchored comments by selecting a text range in the student's submission and typing a free-form comment, creating a visual anchor identical to AI-generated anchors].
- **FR50**: [Teacher] can [add general (unanchored) comments to a submission without selecting text].
- **FR51**: [Teacher] can [toggle each comment's visibility between "Private" (visible only to the teacher) and "Student-Facing" (visible to both teacher and student)].
- **FR52**: [System] can [display teacher-authored comments mixed with AI feedback items in the same feed, visually distinguished by a "Teacher" badge and author attribution].
- **FR53**: [Student] can [view student-facing teacher comments alongside AI feedback when reviewing graded submissions].

### 5. Student Success

_Traces to: Journey 2_

- **FR27**: [Owner/Admin] can [view "Student Health Dashboard" with real-time updates based on attendance and submission data].
- **FR28**: [Owner/Admin] can [open Student Profile Overlay from the dashboard without a page reload].
- **FR29**: [Owner/Admin] can [initiate parent interventions via email with pre-filled concern templates and in-app logging].

### 6. Innovation & Reliability (Phase 1.5)

_Traces to: Journey 1, 2, 3_

- **FR30**: [System] can [send automated email notifications to parents for Personal Bests or 7-day assignment streaks].
- **FR31**: [Parent] can [manage email notification preferences] (Phase 2: via Parent Portal).
- **FR32**: [Owner] can [create Golden Sample documents in the Knowledge Hub with student work text and ideal teacher feedback text, categorized by skill type (Writing/Speaking), with a maximum of 10 active samples per skill type per center].
- **FR33**: [System] can [utilize active Golden Sample documents from the Knowledge Hub for Few-Shot Prompting to target > 85% style alignment with the center's feedback tone and vocabulary].
- **FR34**: [System] can [detect offline status and display a persistent "Do Not Close" warning banner during submission attempts].
- **FR35**: [System] can [queue failed submissions and auto-retry upon network reconnection via Background Sync].
- **FR36**: [System] can [screen AI-generated and user-submitted content for compliance with local regulations (Decree 72/2013/ND-CP) and flag violations for admin review].

### 7. Knowledge Hub (Phase 1.5)

_Traces to: Journey 8_

- **FR54**: [Teacher/Admin] can [upload documents (PDF, DOCX, PPTX, max 50MB) to the Knowledge Hub with title, description, and tags].
- **FR55**: [Teacher/Admin] can [create rich-text pages in the Knowledge Hub using a WYSIWYG markdown editor with headings, bold/italic, lists, links, and inline images].
- **FR56**: [User] can [search the Knowledge Hub by document title, tags, and document type (File, Page, Golden Sample)].
- **FR57**: [User] can [preview PDF documents inline in the browser without downloading].
- **FR58**: [User] can [tag documents and exercises with shared tags from a unified tag pool for cross-content discovery].
- **FR59**: [Student] can [access Knowledge Hub documents linked to courses or sessions they are enrolled in].

### 8. Course Management (Phase 1.5)

_Traces to: Journey 8_

- **FR60**: [Admin] can [create standalone courses with a markdown syllabus, status (Draft/Published/Archived), linked documents, and linked exercises].
- **FR61**: [Admin] can [create structured lesson plans within a course, each with a title, markdown content, ordered linked documents, and ordered linked exercises].
- **FR62**: [Admin] can [create a class from a course template, snapshot-copying lesson plans (content, materials, exercises) to the class sessions as a one-time copy that does not update retroactively].
- **FR63**: [System] can [display how many active classes are linked to a course on the course list and detail pages].
- **FR64**: [Teacher/Admin] can [view and manage courses independently from classes at a dedicated course page (`/:centerId/courses/:courseId`)].

### 9. Session Hub (Phase 1.5)

_Traces to: Journey 7_

- **FR65**: [Teacher] can [view session detail showing lesson title, lesson content (markdown), linked materials, and linked assignments for that session].
- **FR66**: [Teacher] can [customize session materials and assignments independently from the originating course lesson plan].
- **FR67**: [Teacher] can [write append-only session notes (pre-session and post-session types) as a running journal, with multiple notes per type ordered chronologically].
- **FR68**: [Student] can [view session materials (linked documents) and assignments (with status) for sessions in their enrolled classes].
- **FR69**: [System] can [display session content provenance indicating which course lesson plan the content originated from, with a link back to the source].

---

## Section 3.1: IELTS Exercise Type Taxonomy

This section defines all supported IELTS question types that the Exercise Builder (FR13) must implement. Each type has specific UI/UX requirements and grading logic.

### Reading Question Types (13 Types)

#### Auto-Gradable Types (MVP Priority: High)

| ID | Type | Description | Student UI | Answer Format | Auto-Grade Logic |
|:---|:-----|:------------|:-----------|:--------------|:-----------------|
| **R1** | Multiple Choice (Single) | Select ONE correct answer from A-D | Radio buttons | Single letter | Exact match |
| **R2** | Multiple Choice (Multi) | Select 2-3 correct answers from A-E | Checkboxes with max selection | Multiple letters | All correct = full marks |
| **R3** | True/False/Not Given | Judge factual accuracy of statements | 3-option radio per statement | T/F/NG per item | Exact match |
| **R4** | Yes/No/Not Given | Judge agreement with writer's opinion | 3-option radio per statement | Y/N/NG per item | Exact match |
| **R5** | Sentence Completion | Complete sentence with words from passage | Text input (word limit enforced) | Text (1-3 words) | Normalized match* |
| **R6** | Short Answer | Answer question in ≤N words from passage | Text input (word limit enforced) | Text (1-3 words) | Normalized match* |
| **R7** | Summary Completion (Word Bank) | Fill blanks by selecting from word list | Dropdown or drag-drop | Selected words | Exact match |
| **R8** | Summary Completion (Passage) | Fill blanks with words from passage | Text input | Text (1-2 words) | Normalized match* |

#### Auto-Gradable Types (MVP Priority: Medium)

| ID | Type | Description | Student UI | Answer Format | Auto-Grade Logic |
|:---|:-----|:------------|:-----------|:--------------|:-----------------|
| **R9** | Matching Headings | Match headings to paragraphs | Drag-drop or dropdown per paragraph | Heading letter per paragraph | Exact match |
| **R10** | Matching Information | Match statements to paragraphs | Dropdown per statement | Paragraph letter | Exact match |
| **R11** | Matching Features | Match items to categories | Dropdown per item | Category letter | Exact match |
| **R12** | Matching Sentence Endings | Connect sentence beginnings to endings | Dropdown or drag-drop | Ending letter | Exact match |

#### Auto-Gradable Types (MVP Priority: Low - Phase 2)

| ID | Type | Description | Student UI | Answer Format | Auto-Grade Logic |
|:---|:-----|:------------|:-----------|:--------------|:-----------------|
| **R13** | Note/Table/Flow-chart Completion | Fill structured blanks | Text inputs in visual layout | Text per blank | Normalized match* |
| **R14** | Diagram Labelling | Label parts of a diagram | Text inputs positioned on image | Text per label | Normalized match* |

**\*Normalized Match:** Answer comparison ignores case, leading/trailing spaces, and accepts teacher-defined variants (e.g., "19" = "nineteen", "UK" = "United Kingdom").

### Listening Question Types (6 Types)

All Listening types require **audio player integration** with these capabilities:
- Play/Pause control
- Progress bar (non-seekable in test mode, seekable in practice mode)
- Single-play enforcement option (audio plays once, then locks)
- Section markers for multi-part audio
- Playback speed: 0.75x, 1.0x, 1.25x (practice mode only)

| ID | Type | Description | Student UI | Auto-Grade |
|:---|:-----|:------------|:-----------|:-----------|
| **L1** | Form/Note/Table Completion | Fill details heard in audio | Text inputs in structured layout | Normalized match |
| **L2** | Multiple Choice | Select answer based on audio | Radio buttons | Exact match |
| **L3** | Matching | Match speakers/items to options | Dropdown per item | Exact match |
| **L4** | Map/Plan Labelling | Label locations on a visual | Dropdown or drag letters onto map | Exact match |
| **L5** | Sentence Completion | Complete sentences from audio | Text input (word limit) | Normalized match |
| **L6** | Short Answer | Brief answers from audio | Text input (word limit) | Normalized match |

### Writing Task Types (3 Types)

Writing tasks are **not auto-gradable** but receive AI-assisted scoring suggestions per IELTS band descriptors.

| ID | Type | Description | Student UI | AI Grading Output |
|:---|:-----|:------------|:-----------|:------------------|
| **W1** | Task 1 Academic | Describe chart/graph/table/process/map | Rich text editor + reference image display | 4-criterion band scores + comments |
| **W2** | Task 1 General | Write a letter (formal/informal/semi-formal) | Rich text editor + prompt display | 4-criterion band scores + comments |
| **W3** | Task 2 Essay | Argument/Discussion/Problem-Solution essay | Rich text editor + prompt display | 4-criterion band scores + comments |

**Writing Rubric Criteria (IELTS Official):**

| Criterion | Task 1 Label | Task 2 Label | Weight |
|:----------|:-------------|:-------------|:-------|
| Criterion 1 | Task Achievement | Task Response | 25% |
| Criterion 2 | Coherence & Cohesion | Coherence & Cohesion | 25% |
| Criterion 3 | Lexical Resource | Lexical Resource | 25% |
| Criterion 4 | Grammatical Range & Accuracy | Grammatical Range & Accuracy | 25% |

### Speaking Format (Phase 2 - Recording Required)

Speaking exercises require **audio recording** capability from student devices.

| ID | Part | Duration | Format | Student UI |
|:---|:-----|:---------|:-------|:-----------|
| **S1** | Part 1 | 4-5 min | Short Q&A (examiner questions displayed) | Record button per question |
| **S2** | Part 2 | 3-4 min | Cue card monologue (1 min prep + 2 min speak) | Timer + cue card display + single recording |
| **S3** | Part 3 | 4-5 min | Discussion (follow-up questions) | Record button per question |

### Mock Test Assembly

Teachers can combine exercises into a **Mock Test** that simulates full IELTS test conditions:

| Component | Exercises Included | Total Time | Scoring |
|:----------|:-------------------|:-----------|:--------|
| **Listening Test** | 4 sections (L1-L6 types), 40 questions | 30 min + 10 min transfer | Raw score → Band conversion |
| **Reading Test** | 3 passages (R1-R14 types), 40 questions | 60 min | Raw score → Band conversion |
| **Writing Test** | Task 1 + Task 2 | 60 min (20 + 40) | Averaged band score |
| **Speaking Test** | Parts 1-3 | 11-14 min | Averaged band score |

**Band Score Conversion (Reading/Listening):**

| Raw Score | Band |
|:----------|:-----|
| 39-40 | 9.0 |
| 37-38 | 8.5 |
| 35-36 | 8.0 |
| 33-34 | 7.5 |
| 30-32 | 7.0 |
| 27-29 | 6.5 |
| 23-26 | 6.0 |
| 19-22 | 5.5 |
| 15-18 | 5.0 |
| ... | ... |

---

## Domain Compliance & Security

### Section 7: Domain Compliance

- **Data Sovereignty (Vietnam Decree 13/2023/ND-CP):** Personal data of Vietnamese citizens must be stored and processed in compliance with local regulations. The system must support local hosting or provide data residency guarantees for the Vietnamese market.
- **Content Moderation:** AI-generated content and student submissions must be screened for prohibited content (political, sensitive, or offensive) as per Vietnamese internet regulations (Decree 72/2013/ND-CP).

### Section 8: RBAC Matrix

| Feature                      | Owner | Admin |     Teacher      | Student |
| :--------------------------- | :---: | :---: | :--------------: | :-----: |
| Center Settings              | CRUD  | CRUD  |        R         |    -    |
| User Management              | CRUD  | CRUD  |        -         |    -    |
| Class Scheduling             | CRUD  | CRUD  |        R         |    R    |
| Attendance                   | CRUD  | CRUD  |       CRUD       |    R    |
| Exercise Creation            | CRUD  | CRUD  |       CRUD       |    -    |
| Audio Upload (Listening)     | CRUD  | CRUD  |       CRUD       |    -    |
| Mock Test Assembly           | CRUD  | CRUD  |       CRUD       |    -    |
| Assignment                   | CRUD  | CRUD  |       CRUD       |    -    |
| Submission                   |   -   |   -   |        -         |  CRUD   |
| AI Grading Workbench         | CRUD  | CRUD  |       CRUD       |    -    |
| Teacher Comments             | CRUD  | CRUD  |       CRUD       | R (student-facing only) |
| Band Rubric Config           | CRUD  | CRUD  |        R         |    -    |
| Student Health Dashboard     |   R   |   R   | R (Own Students) |    -    |
| Billing & Subscription       | CRUD  |   R   |        -         |    -    |
| Knowledge Hub: Upload/Create | CRUD  | CRUD  |       CRUD       |    -    |
| Knowledge Hub: View/Download | CRUD  | CRUD  |       CRUD       | R (enrolled) |
| Knowledge Hub: Delete        | CRUD  | CRUD  |    D (own only)  |    -    |
| Golden Samples: Manage       | CRUD  |   -   |        -         |    -    |
| Course: Create/Edit          | CRUD  | CRUD  |        -         |    -    |
| Course: View                 |   R   |   R   |        R         | R (enrolled) |
| Lesson Plans: Create/Edit    | CRUD  | CRUD  |        -         |    -    |
| Recurrence Rule: Create/Edit | CRUD  | CRUD  |        -         |    -    |
| Session: Cancel Occurrence   | CRUD  | CRUD  | CU (assigned)    |    -    |
| Session: Reschedule          | CRUD  | CRUD  | CU (assigned)    |    -    |
| Session: Customize Materials | CRUD  | CRUD  | CRU (assigned)   |    -    |
| Session: Teacher Notes       |   -   |   -   | CRUD (assigned)  |    -    |
| Session: View Materials      |   R   |   R   |        R         | R (enrolled) |

---

## SaaS B2B Requirements

### Technical Architecture

- **Tenant Model**: Logical Separation (Logical data isolation via tenant identifiers).
- **Layering**: Clean architecture (Route -> Controller -> Service) to ensure testability and logic decoupling.
- **Enforcement**: Middleware-level security enforcement.
- **Subscription**: Free during pilot; per-active-student billing in Phase 1.5 (see Section 9: Billing).

### Integrations

- **Primary**: Google Calendar (One-way sync), Google Meet (Link generation).
- **Secondary**: Polar.sh (Subscription billing — Phase 1.5), Email (Transactional notifications).

---

## Section 9: Billing & Subscription (Phase 1.5)

### Pricing Model

- **Model:** Per-active-student per month.
- **Definition of "Active Student":** Any student enrolled in at least one class during the billing period. Center owners control count by managing their roster.
- **Volume Tiers:**

| Enrolled Students | Per-Student Rate | Notes |
|:------------------|:-----------------|:------|
| 1–30 | Base rate | Small center |
| 31–100 | Discounted rate | Medium center |
| 100+ | Further discounted rate | Large center |

*Exact pricing TBD based on market research and pilot feedback.*

### Billing Functional Requirements

- **FR43**: [Center Owner] can [view current enrolled student count, billing estimate, and payment history via a Billing Dashboard].
- **FR44**: [System] can [track enrolled student count per center per billing cycle for metered billing].
- **FR45**: [System] can [process self-serve payments via Polar.sh with receipt generation].
- **FR46**: [System] can [send billing reminders via email 7 days before renewal date].
- **FR47**: [System] can [enforce a grace period (configurable, default 14 days) when payment lapses, then restrict new student enrollments until payment is resolved].
- **FR48**: [Center Owner] can [upgrade/downgrade tier or view tier benefits from the Billing Dashboard].

### Payment Provider

- **Provider:** Polar.sh (self-serve subscription billing).
- **Note:** Polar.sh is an international billing platform with good developer experience. No Vietnamese business registration required for payment processing. Supports subscription management, invoicing, and checkout out of the box.

### Pilot Phase (MVP)

- All features are **free** during pilot (2–3 centers).
- Billing UI may be present in read-only/preview mode to gather feedback on pricing presentation.
- No payment processing during pilot.

---

## Non-Functional Requirements

### Performance & Reliability

- **NFR1**: [Performance, < 500ms latency, P95 Server Response Time, Grading Workbench auto-advance].
- **NFR2**: [Performance, < 1 second, UI rendering, Dashboard "Traffic Light" widgets].
- **NFR3**: [Availability, 99.9% uptime, Monitoring, Business hours 8 AM - 10 PM GMT+7].
- **NFR4**: [Data Integrity, 3s interval, background sync, persistent client-side storage during student submissions].

### Security & Privacy

- **NFR5**: [Security, Cross-tenant access prevention, Middleware validation, Unauthorized access attempts].
- **NFR6**: [Privacy, AES-256 (or similar), Encryption-at-rest, Sensitive PII and grades].

### Usability & Accessibility

- **NFR7**: [Accessibility, 100% viewport compliance, Audit, Viewports >= 375px].
- **NFR8**: [i18n, Multi-language support, User toggle, English/Vietnamese UI].
- **NFR9**: [Accessibility, WCAG 2.1 Level AA, Audit, All public-facing interfaces].
- **NFR10**: [Usability, Keyboard-only operation, Audit, Grading Loop workflow].
- **NFR11**: [Usability, High-contrast visual focus indicators, Audit, All interactive elements].

### Storage & Upload

- **NFR12**: [Storage, 50MB maximum file size, Upload validation, Knowledge Hub document uploads (PDF, DOCX, PPTX, images)].
