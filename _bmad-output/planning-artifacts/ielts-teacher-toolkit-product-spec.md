# IELTS Teacher Toolkit — Product Spec

**One-liner:** AI-powered grading + student analytics for IELTS teachers — plugs into Google Docs & Sheets they already use.

**Last updated:** 2026-04-21

---

## Who it's for

Individual IELTS teachers or small center teachers (1-3 classes, 10-50 students) who currently manage everything in Google Workspace and don't want to learn a new platform.

## Core principle

**Don't replace their tools. Make their tools smarter.**

---

## Cold-Start Strategy

**Principle: never show an empty screen. Always show either data or a clear 1-step action to get data.**

The biggest risk is a teacher signing up, seeing empty everything, and never coming back. Every feature needs to deliver value before the teacher has invested time setting things up.

### First-time experience: skip setup, start with the magic moment

After Google login, teacher sees three paths — not a setup wizard:

```
"How do you want to start?"

 ○ Grade an essay right now         → paste doc URL → instant AI grading
   (fastest to wow moment)

 ○ Import my existing scores        → connect Google Sheet → instant dashboard
   (fastest to full dashboard)

 ○ Set up my class from scratch     → traditional onboarding
   (for brand new teachers)
```

**Path 1: Grade an essay (recommended default)**

```
Minute 0:  Login with Google
Minute 1:  Paste a doc link → AI grades it → wow moment
Minute 2:  "Who wrote this?" → type student name → score saved
Minute 3:  Grade a second essay → second student name
Minute 5:  App suggests: "Create a class with Minh and Linh?"
Minute 6:  Teacher sees mini-dashboard with 2 students, 2 scores
Minute 7:  "Connect your Drive folder so we detect new essays?" (optional)
```

Class, students, and structure are created *around* the work, not before it.

**Path 2: Import existing scores**

```
Teacher connects a Google Sheet with existing score data
        │
        ▼
App reads the sheet, detects columns that look like:
  Student Name | R1 | R2 | W1 | W2 | L1 | S1
        │
        ▼
"We found 12 students and 6 tests. Here's what we detected:"
  Minh:   R: 6.0, 6.5  W: 5.5, 6.0  L: 5.5  S: —
  Linh:   R: 7.0, 6.5  W: 6.0, 6.5  L: 6.0  S: 5.5
  [Looks right — import all] [Let me adjust]
        │
        ▼
Dashboard is instantly populated with historical data.
Trends, at-risk flags, everything — from day one.
```

**Path 3: Traditional setup**

For teachers starting fresh with no existing data. Full onboarding flow (see section 1 below).

### Cold-start solutions per feature

| Feature | Empty state problem | Solution |
|---|---|---|
| Dashboard | No scores = empty charts | Import from existing Sheet OR show progress ("Grade 2 more essays to unlock trends") |
| Grading inbox | No Drive folder = nothing detected | Skip setup — paste any Doc URL to start |
| Test library | Empty, teacher has to create | Pre-loaded Cambridge IELTS answer keys (14-18) — public knowledge |
| Class/students | No class created | Create retroactively from grading activity |
| Parent reports | No data to share | Unlock messaging: "3+ scores needed to generate Minh's report" |
| Drive folder | Not connected | Optional, suggested after teacher is already engaged |

### Pre-loaded test library

Cambridge answer keys are publicly available. On first login, offer:

```
"Want to start with Cambridge answer keys?"

 ☐ Cambridge IELTS 18 — Reading Tests 1-4 + Listening Tests 1-4
 ☐ Cambridge IELTS 17 — Reading Tests 1-4 + Listening Tests 1-4
 ☐ Cambridge IELTS 16 — Reading Tests 1-4 + Listening Tests 1-4

 [Add to my library]
```

Teacher can assign a test in 30 seconds on day one without building anything.

### Progressive dashboard states

**1 score recorded:**
```
Minh — Writing: 6.5
⚪ Need 2 more scores to show trends
💡 Grade another essay to build Minh's profile
```

**3+ scores:**
```
Minh — Writing: 6.5 → 6.0 → 6.5  📈 Improving
💡 Set a target band to enable projections
```

**3+ scores + target set:**
```
Minh — Writing avg: 6.3  Target: 7.0 by Dec
Projected: 6.7 — ⚠️ at risk
```

---

## Features

### 1. Onboarding (deferred — triggered progressively)

Full onboarding is available for teachers who choose "Set up my class from scratch" or as prompted after initial grading activity:

- **Create a class:** name the class
- **Import students:**
  - Paste Google Sheet link with names
  - Or type names manually
  - Optionally add parent emails
- **Essay collection setup:**
  - "I have a Drive folder" → link it, auto-match subfolders to students
  - "Set one up for me" → app creates organized folder structure
  - "I'll share docs manually" → paste URL flow
- **Set per-student targets (optional):**
  - Target band + target date
  - Can skip — dashboard still works without targets

### 2. AI Grading (Writing / Speaking)

**Entry points (multiple ways essays arrive):**
1. **Student submissions** — student submits writing/speaking via assignment link (see Feature 3). Appears in grading inbox automatically. This is the primary flow.
2. **Drive folder detection** — app detects new docs in class Drive folder. For teachers who still collect essays via Google Docs.
3. **Paste Doc URL** — teacher pastes any Google Doc URL + picks student from dropdown. Fallback for any workflow.
4. **Upload audio** — teacher uploads a speaking recording directly.

#### 2a. Writing

**Grading screen (split panel):**
- Left: student's essay content with highlighted sections corresponding to suggestions
- Right: AI suggestions panel

**Right panel contents:**
- Task type selector (shown on first grade, remembered per folder):
  - Task 1 Academic (describe a chart/diagram)
  - Task 1 General (write a letter)
  - Task 2 Essay
  - "Remember for this folder" checkbox
- Band scores (overall + 4 criteria) — each editable/overridable by teacher
  - Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy
- AI comment suggestions — each with [Accept] [Edit] [Reject]
- [+ Add my own comment] button
- [Re-grade] button (costs 1 AI credit)
- [Publish to Google Doc & Save Score] button

**What "Publish" does:**
1. Accepted/edited suggestions → inserted as real Google Doc comments anchored to the text
2. Band scores (AI or teacher-overridden) → saved to DB
3. Scores auto-synced to teacher's Google Sheet
4. Nothing rejected ever touches the Doc

**Stretch goal:** AI auto-detects task type from essay content ("This looks like a Task 2 agree/disagree essay. Correct?")

#### 2b. Speaking

Three input modes:

**Mode A: Audio file (primary — saves the most time)**
- Teacher uploads audio (MP3/M4A/WAV, max 30min) or picks from Google Drive
- Single Gemini API call handles transcription + grading + suggestions together (Gemini accepts audio natively)
- Grading screen (split panel):
  - Left: audio player with play/pause/progress bar + timestamped transcript below
  - Right: suggestions panel
- Part selector: Part 1 (Q&A) / Part 2 (Cue card) / Part 3 (Discussion)
- Band scores: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation
- Suggestions anchored to timestamps with [▶ Play] button per suggestion — teacher listens to verify before accepting
- "Save" creates a Google Doc with accepted feedback + scores, shared with student

**Mode B: Transcript in Google Doc**
- Graded same as writing flow, but with speaking criteria and part selector
- No timestamps, suggestions reference text ranges
- Comments published to the Google Doc

**Mode C: Manual score entry**
- Teacher enters band scores only (see Manual Score Entry section below)
- For teachers who grade speaking live in class

#### 2c. What gets stored

| Field | Purpose |
|---|---|
| AI scores | Analytics — track AI vs teacher agreement over time |
| Final scores | What teacher approved — used for dashboard & parent reports |
| Comments published | Audit trail |

### 3. Assignments (all 4 skills)

Unified assignment system for all IELTS skills. Teacher creates an assignment → gets a shareable link → students submit via the link → results flow into grading inbox and analytics.

#### 3a. Assignment library

Teachers build up a reusable library. Each assignment includes:
- Assignment name
- Skill type: Reading / Listening / Writing / Speaking
- For R/L: sections with passages/audio, questions with types and answer keys, band conversion table
- For W/S: task prompt, task type (Task 1 Academic/General, Task 2, Part 1/2/3), word limit or time limit
- Can be assigned to multiple classes. Results tracked separately per class.

#### 3b. Creating an assignment

**For Reading / Listening:**

**Option A: Import from PDF**
- Upload PDF → AI extracts passage, questions, answer key
- Teacher reviews and corrects → Save to library

**Option B: Quick answer key**
- Enter test name + paste answer key: "1:T, 2:F, 3:NG, 4:C..."
- No passage, no question rendering — just scoring
- Fastest option for teachers who already have the test on paper

**Option C: Build manually**
- Add sections → add questions per section → set answer key
- Full control, most effort

**For Writing:**
- Enter task prompt (e.g., "Some people think universities should...")
- Select task type: Task 1 Academic / Task 1 General / Task 2
- Set word minimum (default: 150 for Task 1, 250 for Task 2)
- Optional: time limit (default: 20 min for Task 1, 40 min for Task 2)
- Optional: attach stimulus image (chart/graph for Task 1 Academic)

**For Speaking:**
- Enter prompt/cue card text
- Select part: Part 1 (Q&A) / Part 2 (Cue card) / Part 3 (Discussion)
- Set preparation time (default: 1 min for Part 2, 0 for Part 1/3)
- Set recording time limit (default: 2 min for Part 2, varies for Part 1/3)
- For Part 1: multiple short questions, student records one answer per question
- For Part 2: single long-form response after prep time
- For Part 3: multiple follow-up questions

#### 3c. Assigning to a class

Pick assignment → Pick class → Choose mode:

**Online mode (all skills):**
- Generates shareable link: app.com/assignment/abc123
- Configure: timed or untimed
- For listening: allow replay (practice mode) or single play (real test)
- Student opens link, identifies themselves (dropdown from roster), completes the task
- R/L: auto-scored, band calculated, saved to DB
- W/S: submission appears in teacher's grading inbox for AI-assisted review

**Paper mode (R/L only):**
- Export printable PDF:
  - Full test (passage + questions) for printing
  - Separate answer sheet for easy collection
- After the test, enter results via quick entry grid (see 3f)

#### 3d. Online R/L — student experience (no account needed)

**Layout — mimics real IELTS computer-based test:**
- Split panel: passage/audio left, questions right (desktop)
- Stacked on mobile (passage/audio on top, questions below)
- Both panels scroll independently
- Timer top-right, counts down
- Question navigator dots at bottom — filled = answered, hollow = unanswered
- Section tabs to jump between sections

**For listening:**
- Left panel = audio player with play/pause/progress
- Teacher configures: single play (real test) or allow replay (practice)

**Supported question types (reused from ClassLite):**

Weekend (covers ~70% of tests):
- MCQ single (R1, L2)
- MCQ multi (R2)
- True/False/Not Given (R3)
- Yes/No/Not Given (R4)
- Sentence completion (R5, L5)
- Short answer (R6, L6)
- Form/note completion (L1)
- Matching — simple dropdown (L3)

Week 2+:
- Summary word bank — drag/drop (R7)
- Matching headings/info/features (R9-R12)
- Note/table/flowchart completion (R13)
- Diagram labelling (R14)
- Map/plan labelling (L4)

#### 3e. Online W/S — student experience (no account needed)

**Writing:**
```
┌──────────────────────────────────────────────────┐
│  Writing Task 2                      Timer: 40:00│
│                                                  │
│  "Some people think universities should provide  │
│   graduates with the knowledge and skills needed │
│   in the workplace. Others think the true purpose│
│   of a university education is to give access to │
│   knowledge for its own sake."                   │
│                                                  │
│  Write at least 250 words.                       │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │                                          │    │
│  │  [Rich text editor — student types here] │    │
│  │                                          │    │
│  └──────────────────────────────────────────┘    │
│  Word count: 0 / 250 minimum                     │
│  Auto-saved ✓                                    │
│                                                  │
│  [Submit]                                        │
└──────────────────────────────────────────────────┘
```

- For Task 1 Academic: stimulus image (chart/graph) shown above the prompt
- Word count live-updates as student types
- Submit warns if below minimum word count but doesn't block
- Auto-saved every 30 seconds (same as R/L tests)
- Timer optional — teacher configures per assignment
- On submit: essay text saved to DB, appears in teacher's grading inbox

**Speaking:**
```
┌──────────────────────────────────────────────────┐
│  Speaking Part 2                                 │
│                                                  │
│  Preparation time: 0:45 remaining                │
│                                                  │
│  Describe a time when you helped someone.        │
│  You should say:                                 │
│  • who you helped                                │
│  • how you helped them                           │
│  • why you helped them                           │
│  and explain how you felt about it.              │
│                                                  │
│  [Start Recording 🎙️]  (available after prep)   │
│                                                  │
└──────────────────────────────────────────────────┘

After prep time expires or student clicks "Start Recording":

┌──────────────────────────────────────────────────┐
│  Speaking Part 2                  Recording: 1:23│
│                                                  │
│  [Cue card still visible]                        │
│                                                  │
│  🔴 Recording...                 Max: 2:00      │
│  ████████████░░░░░░░░░░░░░                      │
│                                                  │
│  [Stop & Submit]                                 │
└──────────────────────────────────────────────────┘
```

- Browser-based audio recording via MediaRecorder API
- Prep time countdown (Part 2: 1 min default, configurable)
- Recording time limit (Part 2: 2 min default, configurable)
- Auto-stops recording when time limit reached
- Audio uploaded to server on submit
- Appears in teacher's grading inbox with audio file ready for AI transcription + grading
- For Part 1/3: multiple prompts shown one at a time, student records per question

**Student flow for W/S submissions → grading:**
```
Student submits essay/recording via link
        │
        ▼
Submission saved to DB (text or audio file)
        │
        ▼
Appears in teacher's grading inbox:
  "Minh submitted Writing Task 2 — 15 min ago"
        │
        ▼
Teacher clicks → AI grades automatically → review screen
(same grading flow as Feature 2, but essay text comes 
from submission instead of Google Doc)
        │
        ▼
For writing: teacher can optionally publish feedback
as a Google Doc shared with student, or student views
feedback in-app via a results link
        │
        ▼
For speaking: same as audio grading flow in 2b
```

#### 3f. Paper results — quick entry grid (R/L only)

Grid view: student names as rows, question numbers as columns.
- Answer key shown as header row for reference
- Teacher enters answers (T/F/NG/A/B/C/D or typed text)
- Green = matches key, Red = wrong (live feedback as teacher types)
- Raw score + band auto-calculated per student
- [Save all] button

### 4. Manual Score Entry

For any score that doesn't come from AI grading or online tests — external mock tests, paper tests (score only), live speaking assessments, scores from other platforms.

#### 4a. Single student entry

Accessible from:
- Student profile → Scores tab → [+ Add manual score]
- Grading inbox → [+ Manual score]

Fields:
- Student (pre-filled if accessed from student profile, dropdown if from grading inbox)
- Skill: Reading / Listening / Writing / Speaking
- Date
- Overall band score
- Optional: criteria breakdown (TA, CC, LR, GRA for writing; FC, LR, GRA, Pron for speaking)
- Optional: note (e.g., "Cambridge 18 mock test")

#### 4b. Bulk class entry

Accessible from:
- Class view → Students tab → [+ Add scores for class]

Fields:
- Date
- Skill: Reading / Listening / Writing / Speaking
- Label (e.g., "Mock test 5")
- Grid: student name × score + optional note per student
- Students can be marked absent (skipped)
- [Save all] button

#### 4c. Paper test results with per-question answers

Accessible from:
- Test results → [Enter paper results]

Uses the quick entry grid from section 3e — this captures per-question answers, not just the final score. Provides richer analytics (which questions students struggle with).

### 5. Dashboard — Student Analytics

See Cold-Start Strategy section for progressive dashboard states (how the dashboard evolves from 0 scores to full analytics).

#### 5a. Cross-class overview (home screen for multi-class teachers)

- All classes at a glance with average band and trend
- Total students, total at-risk count
- Recent grading activity
- Quick links to ungraded essays (badge count)

#### 5b. Class overview

- Class average band (overall + per skill)
- Trend since start (↑/↓ with delta)
- Weakest skill across class
- Band over time line chart (one line per skill: R/L/W/S)
- Student list grouped by status:
  - ⚠️ Needs attention
  - ✅ On track
  - ⚪ Not enough data

**Status logic:**

| Status | Rule |
|---|---|
| 📈 Improving | Upward trend over last 3+ scores |
| 📊 Plateaued | No change (±0.5) over 4+ scores across 1+ month |
| 📉 Declining | Dropped 0.5+ over last 3 scores |
| ⚠️ At risk | Has target set AND projected band at current rate < target by target date |
| ⚪ Not enough data | Fewer than 3 scores |

#### 5c. Individual student view

- Current overall band + per-skill bands
- Target band + target date (if set)
- Projected band at current rate
- Band over time line chart
- Auto-generated strengths and weaknesses
- Recent activity list (date, type, score, AI vs teacher score)
- [Share with parent] and [Add teacher note] buttons
- [+ Add manual score] button

### 6. Parent Progress Report (shareable link, no login)

- Student name, class name, last updated date
- Current level + target
- Simple line chart — band over time, all 4 skills
- Strengths in plain language (no IELTS jargon)
- Areas needing practice in plain language
- Recent scores list
- Teacher's personal note (optional, teacher edits per student)
- Vietnamese or English — teacher picks per class
- Live link — always shows latest data, not a snapshot
- Branded footer: "Powered by [App Name]"

**Key differences from teacher view:**
- Simpler language — no IELTS jargon
- No AI vs teacher score comparison
- No at-risk/projected language — just "needs more practice"
- Teacher controls the note

---

## Information Architecture

```
app.com/
│
├── / (landing page — marketing, sign up CTA)
│
├── /login (Google OAuth)
│
├── /welcome (first-time only — pick your starting path)
│     • "Grade an essay right now" → /grade with paste-URL prompt
│     • "Import my existing scores" → /import
│     • "Set up my class from scratch" → /onboarding
│
├── /import (connect existing Google Sheet)
│     • Paste Sheet link → app detects students + score columns
│     • Preview detected data → confirm or adjust mapping
│     • Creates class + students + imports all scores → redirect to /dashboard
│
├── /onboarding (traditional setup — also triggered progressively)
���   ├── /onboarding/create-class
│   │     • Class name
│   │     • Import students (paste Sheet link / type names / CSV)
│   │     • Add parent emails (optional)
│   │     • Set student targets (optional, can do later)
│   │
│   └── /onboarding/essay-setup
│         • "How do you collect essays?"
│           → Link existing Drive folder
│           → Create folder for me
│           → I'll share docs manually
│
├── /dashboard (home — cross-class overview)
│     • All classes at a glance with average band and trend
│     • Total students, total at-risk count
│     • Recent grading activity
│     • Quick links to ungraded essays (badge count)
│     • Progressive empty states (see Cold-Start Strategy)
│     • Contextual prompts: "Grade 2 more essays to unlock trends"
│
├── /classes
│   ├── /classes (class list)
│   │     • My classes with student count, last activity
│   │     • [+ New class]
│   │
│   └── /classes/:classId
│         ├── Overview tab
│         │     • Class average, trend, weakest skill
│         │     • Band over time chart (R/L/W/S)
│         │     • Students grouped by status (at-risk / on-track / no data)
│         │     • Quick actions: [Grade essays] [Assign test]
│         │
│         ├── Students tab
│         │     • Student list with current band, target, status
│         │     • [+ Add student] [Import from Sheet]
│         │     • [+ Add scores for class] → bulk manual entry
│         │     • Click student → /students/:studentId
│         │
│         ├── Essays tab
│         │     • Shows Drive folder contents organized by student
│         │     • New/ungraded docs highlighted
│         │     • Click doc → /grade/:gradeSessionId
│         │
│         ├── Assignments tab
│         │     • All assignments for this class (R/L/W/S)
│         │     • Results per assignment (completed count, avg score, pending gradings)
│         │     • [Assign from library]
│         │
│         └── Settings tab
│               • Class name, Drive folder link
│               • Default language (EN/VI) for parent reports
│               • Archive class
│
├── /students
│   └── /students/:studentId
│         ├── Overview tab
│         │     • Current bands (R/L/W/S + overall)
│         │     • Target band + date + projected
│         │     • Status (improving/plateaued/declining/at-risk)
│         │     • Band over time chart
│         │     • Strengths & weaknesses (auto-generated)
│         │
│         ├── Scores tab
│         │     • All scores chronologically
│         │     • Filter by skill
│         │     • Each entry: date, type, score, AI vs final
│         │     • [+ Add manual score] → single entry modal
│         │
│         ├── Essays tab
│         │     • All graded docs for this student
│         │     • Click → view grading result or re-grade
│         │
│         └── Parent report tab
│               • Preview of parent-facing report
│               • Teacher note (editable)
│               • [Copy shareable link] [Send to parent email]
│
├── /grade (AI Grading)
│   │
│   ├── /grade (grading inbox)
│   │     • First-time state: prominent "Paste a Google Doc URL to grade" input
│   │     • After setup: shows all pending items from multiple sources:
│   │       - Student W/S submissions via assignment links (primary)
│   │       - New docs detected in Drive folders
│   │     • Badge counts: "Minh (3 new)" "Linh (1 new)"
│   │     • Each item shows: student name, skill, source (submission/Drive/manual), time
│   │     • [+ Paste Doc URL] always available
│   │     • [+ Upload audio] for speaking
│   │     • [+ Manual score] → single entry modal
│   │     • After grading without a class: "Who wrote this?" → type name
│   │       → "Create a class with these students?" (progressive onboarding)
│   │
│   └── /grade/:gradeSessionId
│         │
│         ├── Writing mode
│         │     • Split panel: essay left, suggestions right
│         │     • Task type selector with "remember for folder"
│         │     • Band scores (editable)
│         │     • AI suggestions with [Accept] [Edit] [Reject]
│         │     • [+ Add own comment]
│         │     • [Re-grade] [Publish to Google Doc & Save]
│         │
│         ├── Speaking mode — audio
│         │     • Split panel: audio player + transcript left, suggestions right
│         │     • Part selector (Part 1/2/3)
│         │     • Band scores (editable)
│         │     • Timestamped suggestions with [▶ Play] [Accept] [Edit] [Reject]
│         │     • [+ Add own comment]
│         │     • [Re-grade] [Save & Generate Feedback Doc]
│         │
│         └── Speaking mode — transcript doc
│               • Same as writing mode but with speaking criteria
│               • Part selector instead of task type selector
│
├── /assignments (Assignment Library — all 4 skills)
│   │
│   ├── /assignments (library list)
│   │     • First-time: "Add Cambridge answer keys to get started?" prompt
│   │     • All assignments with: name, skill, question count / task type, times used
│   │     • Filter by: Reading / Listening / Writing / Speaking
│   │     • [+ Create assignment]
│   │
│   ├── /assignments/create
│   │     • Skill picker: R / L / W / S
│   │     • For R/L:
│   │     │  ├── Import from PDF tab
│   │     │  ├── Quick answer key tab
│   │     │  └── Build manually tab
│   │     • For Writing:
│   │     │  • Task type (T1 Academic / T1 General / T2)
│   │     │  • Task prompt text
│   │     │  • Optional stimulus image (T1 Academic)
│   │     │  • Word minimum, time limit
│   │     • For Speaking:
│   │        • Part (1 / 2 / 3)
│   │        • Prompt / cue card text
│   │        • Prep time, recording time limit
│   │
│   ├── /assignments/:id
│   │     • View/edit assignment details
│   │     • Preview how students will see it
│   │     • Assignment history (which classes, when, results)
│   │     • [Assign to class] [Export PDF (R/L)] [Duplicate] [Delete]
│   │
│   ├── /assignments/:id/assign
│   │     • Pick class
│   │     • Mode: online or paper (paper for R/L only)
│   │     • Online config: timed/untimed, replay (listening)
│   │     • → Generates shareable link (or PDF for paper R/L)
│   │
│   ├── /assignments/:id/results/:classId
│   │     • For R/L: per-question breakdown, which questions most got wrong
│   │     • For W/S: submission list with grading status (graded / pending)
│   │     • Student-by-student scores
│   │
│   └── /assignments/:id/enter-results/:classId
│         • Quick entry grid for paper R/L results
│         • Student × question answer grid
│         • Auto-scores + band as teacher types
│         • [Save all]
│
├── /a/:assignmentId (PUBLIC — student-facing, no auth)
│   │
│   ├── /a/:assignmentId (start screen)
│   │     • Assignment name, skill type, time limit
│   │     • Student picks name from class roster dropdown
│   │     • "I'm not on the list" → type name
│   │     • [Start]
│   │
│   ├── /a/:assignmentId/test (R/L test taking)
│   │     • Split panel: passage/audio left, questions right
│   │     • Timer top-right
│   │     • Question navigator dots bottom
│   │     • Section tabs
│   │     • Listening: audio player with play/pause
│   │
│   ├── /a/:assignmentId/write (Writing submission)
│   │     • Task prompt + optional stimulus image displayed
│   │     • Rich text editor for essay
│   │     • Live word count
│   │     • Timer (if configured)
│   │     • Auto-save every 30s
│   │
│   ├── /a/:assignmentId/speak (Speaking submission)
│   │     • Prompt / cue card displayed
│   │     • Prep time countdown (Part 2)
│   │     • Browser audio recorder (MediaRecorder API)
│   │     • Recording time limit with visual progress
│   │     • For Part 1/3: multiple prompts, record per question
│   │
│   └── /a/:assignmentId/complete
│         • "Submitted!"
│         • R/L: score shown immediately (if teacher configured)
│         • W/S: "Your teacher will review and share feedback"
│         • Optional: link to view feedback when ready
│
├── /report/:studentToken (PUBLIC — parent-facing, no auth)
│     • Student name, class, last updated
│     • Current level + target
│     • Band over time chart (R/L/W/S)
│     • Strengths (plain language)
│     • Needs practice (plain language)
│     • Recent scores
│     • Teacher's note
│     • Language: EN or VI (set by teacher)
│     • Always live — not a snapshot
│
└── /settings
      ├── Profile
      │     • Name, email (from Google)
      │     • Default language preference
      │
      ├── Subscription
      │     • Current plan (Free / Pro)
      │     • Usage: AI gradings used / limit
      │     • [Upgrade to Pro]
      │
      └── Connected services
            • Google Drive: connected ✅ [Disconnect]
            • Google Sheets: auto-sync on/off
            • Sheet link for score sync
```

### Navigation structure

```
┌──────────────────────────────────────────────┐
│  [Logo]                          [Settings]  │
│                                              │
│  Sidebar:                                    │
│  📊 Dashboard                                │
│  ✏️ Grade essays          (badge: 7 new)     │
│  📝 Assignments                              │
│  📚 Classes                                  │
│     ├── IELTS Advanced Mon                   │
│     └── IELTS Foundation Wed                 │
│                                              │
│  ── Free plan: 12/20 AI gradings ─────────── │
│  [Upgrade to Pro]                            │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Audio Transcription Pipeline (Speaking)

```
Teacher uploads audio (MP3/M4A/WAV, max 30min)
        │
        ▼
Gemini 2.0 Flash (multimodal — accepts audio directly)
        │
        ├── Transcribes with timestamps
        │   [0:00] "I'd like to talk about..."
        │   [0:12] "When I was younger..."
        │
        ├── Grades on speaking criteria
        │   FC: 5.0, LR: 6.0, GRA: 5.5, Pron: 5.5
        │
        └── Returns suggestions anchored to timestamps
            [0:45] Excessive fillers "uh, very, very"
            [2:15] Mispronunciation of "government"

Single API call — Gemini handles audio natively.
No separate speech-to-text service needed.
```

---

## Monetization

| | Free | Pro |
|---|---|---|
| Classes | 2 | Unlimited |
| Students | 30 | Unlimited |
| AI essay gradings | 20 / month | Unlimited |
| R/L tests (online + paper) | Unlimited | Unlimited |
| Test library | Unlimited | Unlimited |
| Dashboard & analytics | Full | Full |
| Parent report links | 5 students | Unlimited |
| PDF test export | Unlimited | Unlimited |
| **Price** | $0 | $X / month per teacher |

**Upgrade triggers:** AI grading limit (daily pain) and parent report limit (parent pressure).

---

## Design Decisions & Edge Cases

### 1. Student identity matching for online tests

Students taking an online test must identify themselves. Free text input leads to typos and duplicates.

**Resolution:**
- When assigning a test to a class, the generated link is class-scoped — the test knows which roster to use
- Start screen shows a **dropdown of student names** from the class roster, not free text
- Plus an "I'm not on the list" option → types name → teacher gets notified to match or add them later
- If test is shared without a class (standalone link), fall back to free text → teacher matches names manually in results view

### 2. Band conversion table

IELTS has official raw-score-to-band mappings. They differ slightly by test version and Academic vs General Training.

**Resolution:**
- Ship with the **standard Academic conversion table** built in (the one Cambridge publishes in every book)
- Reading: 40 questions, mapping: 39-40 = 9.0, 37-38 = 8.5, 35-36 = 8.0, ... 15 = 5.0, etc.
- Listening: 40 questions, same mapping (Listening and Reading share the same table for Academic)
- General Training Reading uses a different table — support this as a test-level setting
- Teacher can **override the band** after auto-calculation if they use a custom scale
- Pre-loaded Cambridge tests come with the correct conversion table already set

### 3. Re-grading an already-published essay

Teacher published comments to a Google Doc, then wants to re-grade (e.g., AI was wrong, or student revised the essay).

**Resolution:**
- **Old comments stay in the Doc** — they're real Google Doc comments now, teacher can manually resolve/delete them in Docs if desired
- Re-grade creates a **new grading session** — new AI suggestions, new review flow
- New "Publish" appends new comments to the Doc (doesn't touch old ones)
- Score history keeps **all versions**: "Apr 15: 5.5 (first grading), Apr 18: 6.0 (re-grade)"
- Dashboard uses the **most recent final score** for analytics
- Previous grading sessions viewable in student's Essays tab for audit trail

### 4. Student in multiple classes

A student could be in "IELTS Writing Monday" and "IELTS Speaking Wednesday" with the same teacher.

**Resolution:**
- Students are **global to the teacher**, not scoped per-class
- A student can belong to multiple classes
- Student profile (`/students/:studentId`) shows **all scores across all classes** merged into one view
- Class overview shows only scores from tests/essays associated with that class
- Parent report shows the **full picture** across all classes
- Matching: when teacher types "Minh" in a new class, app suggests "Is this the same Minh from IELTS Advanced?" to avoid duplicates

### 5. Data deletion / student removal

**Resolution:**
- **Remove student from class:** Student disappears from class view, but scores and grading history are preserved. Student still exists in teacher's account. Can be re-added.
- **Delete student entirely:** Soft delete — scores retained for 30 days, then permanently deleted. Parent report link stops working immediately.
- **Archive class:** Class hidden from sidebar and dashboard. All data preserved. Can be unarchived. Students remain in teacher's account.
- **Delete class:** Removes class and all class-specific assignments/test results. Student profiles and their scores persist (scores are owned by the student, not the class).
- **Google Doc comments:** Once published, comments live in Google Docs — we don't touch them on deletion.

### 6. Google OAuth scopes — incremental authorization

Requesting all permissions upfront is intimidating. Request only what's needed for the current action.

**Resolution:**

| When | Scopes requested |
|---|---|
| **Login** | `openid`, `email`, `profile` (basic identity only) |
| **First grading (paste URL)** | `drive.readonly` (read the Doc content) |
| **Publish comments** | `drive.file` (write comments to Docs the app opened) |
| **Connect Drive folder** | `drive.readonly` (list folder contents) |
| **Create Drive folder** | `drive` (create folders + set permissions) |
| **Import from Sheet** | `spreadsheets.readonly` |
| **Auto-sync to Sheet** | `spreadsheets` (read + write) |

Teacher sees permission prompts only when they use a feature that needs it, not all at once. Each prompt explains why: "To grade this essay, we need to read the Google Doc."

### 7. Concurrent test-taking and session handling

20+ students opening the same test link at once.

**Resolution:**
- Each student gets a **session** when they start the test (stored server-side, keyed by assignmentId + student name)
- Answers are **auto-saved** every 30 seconds and on every answer change (no explicit "save" needed)
- If student closes tab and reopens the link, they **resume** where they left off (answers preserved, timer continues from where it was)
- Timer is **server-authoritative** — stored start time on server, calculated remaining time on load. Can't be cheated by refreshing.
- If timer expires while tab is closed, test auto-submits with whatever was saved
- Teacher sees real-time progress: "8/12 students submitted" on the results page

### 8. Speaking feedback doc format

When teacher grades audio and clicks "Save & Generate Feedback Doc," the app creates a Google Doc.

**Resolution:**

```
��──────────────────────────────────────────────────┐
│  Speaking Feedback                                │
│  Student: Minh                                    │
│  Date: April 21, 2026                             │
│  Part: Part 2 — Cue Card                          │
│                                                   │
│  Band Scores:                                     │
│  Overall: 5.5                                     │
│  Fluency & Coherence: 5.0                         │
│  Lexical Resource: 6.0                            │
│  Grammatical Range & Accuracy: 5.5                │
│  Pronunciation: 5.5                               │
��                                                   │
│  Feedback:                                        │
│                                                   │
│  [0:45] Excessive use of fillers ("uh", "very,    │
│  very") — try pausing briefly instead of filling  │
│  silence.                                         │
│                                                   │
│  [2:15] Pronunciation: "government" — stress      │
│  should be on first syllable /ˈɡʌvənmənt/.       │
│                                                   │
│  [Teacher's additional comment if any]            │
│                                                   │
│  ─────────────────────────────────────────────── │
│  Generated by [App Name]                          │
└──────────────────────────────────────────────────┘
```

- Doc is created in the **teacher's Drive** (in the student's subfolder if Drive folder is connected, otherwise in root)
- Teacher is the **owner** — they can share with the student or keep it private
- App stores a link to the created Doc for reference in the student's Essays tab

### 9. Security of public links

`/report/:studentToken` and `/test/:assignmentId` are unauthenticated.

**Resolution:**
- **Parent report tokens:** UUID v4 (128-bit random, unguessable). Non-expiring by default — the link should always work so parents can bookmark it.
- **Teacher can revoke:** Regenerates a new token, old link returns "This report is no longer available. Contact your teacher."
- **Test assignment IDs:** UUID v4. Test links become inactive after teacher closes the assignment.
- **Rate limiting:** Public endpoints rate-limited to prevent scraping (100 req/min per IP)
- **No sensitive data exposed:** Parent reports show only first name + scores. No email, no contact info, no other students' data.
- **Optional:** Teacher can enable a simple PIN per parent report ("Enter the PIN your teacher gave you"). Nice-to-have, not MVP.

### 10. Error handling and loading states

**Resolution:**

| Scenario | Behavior |
|---|---|
| Gemini API slow (>10s) | Show progress: "Analyzing essay..." with spinner. Timeout at 60s with retry option. |
| Gemini API fails | "AI grading unavailable right now. You can grade manually or try again." Save draft state so nothing is lost. |
| Gemini returns poor results | Teacher rejects all suggestions and overrides scores manually. Re-grade button for second attempt. |
| Google Drive API rate limit | Queue and retry with backoff. Show "Syncing..." indicator. |
| Google OAuth token expires | Silent refresh. If refresh fails, prompt re-login without losing in-progress work. |
| Publishing comments fails | Retry up to 3 times. If fails, save comments locally and show "Comments couldn't be published — try again" with retry button. Scores are still saved. |
| Student's test connection drops | Answers auto-saved server-side. Resume on reconnect. |

**General principle:** Never lose teacher's work. If any external service fails, save state locally and let teacher retry or continue manually.

### 11. Mobile / responsive experience

**Resolution:**

| Screen | Desktop | Mobile |
|---|---|---|
| Grading (writing) | Side-by-side: essay left, suggestions right | Stacked: essay on top, suggestions below. Or swipeable tabs. |
| Grading (speaking) | Side-by-side: player+transcript left, suggestions right | Audio player pinned to top, transcript and suggestions in tabs below |
| Online test | Split panel: passage left, questions right | Stacked: passage on top (collapsible), questions below |
| Dashboard | Full charts + tables | Simplified cards, charts stack vertically |
| Quick entry grid | Full grid visible | Horizontal scroll, or switch to per-student entry mode |
| Parent report | Full layout | Already simple enough — works as-is |

**MVP:** Desktop-first for teacher features (grading, dashboard, test creation). Mobile-responsive for student-facing (test taking) and parent-facing (reports) since those are most likely opened on phones.

### 12. Edit / delete a score

**Resolution:**
- **Edit:** Teacher can click any score in the student's Scores tab → edit modal with current values pre-filled → save. Original value kept in history.
- **Delete:** Teacher can delete a manually-entered score. Confirmation required: "Delete Writing 6.5 from Apr 15?"
- **AI-graded scores:** Cannot be deleted (they're tied to a grading session), but teacher can re-grade which creates a new version. Teacher can mark a score as "excluded from analytics" if it was a practice/test run.
- **Audit trail:** All changes logged: "Apr 18: Writing score changed from 6.5 to 6.0 by teacher" — visible in student's score history.
- **Bulk edit:** Not supported in MVP. Teacher edits one at a time.

### 13. Writing/Speaking student submissions

**Resolution:**

**Writing submissions:**
- Essay text stored in DB (not Google Docs) — teacher can optionally export to a Google Doc when publishing feedback
- Auto-saved every 30 seconds, same session handling as R/L tests (server-side, resumable)
- Word count validated client-side — warning below minimum ("You've written 180 words, minimum is 250") but submission not blocked
- Timer is optional and server-authoritative (same as R/L)
- Plagiarism: out of scope for MVP. Could add AI similarity check later.

**Speaking submissions:**
- Audio recorded in browser via MediaRecorder API (WebM/Opus format for best browser support)
- Audio uploaded to server on submit — stored temporarily for grading, not permanently (teacher can choose to save to Drive)
- Max file size: ~30MB (covers ~30 min recording at reasonable quality)
- If browser doesn't support MediaRecorder (rare, older browsers): show message "Your browser doesn't support audio recording. Please use Chrome, Firefox, or Edge."
- Recording auto-stops at time limit
- Student can re-record before submitting (discard and start over)
- For Part 1/3 with multiple questions: each question has its own recording, all uploaded as a set

**Feedback delivery for in-app submissions:**
- R/L: score shown immediately after submission (auto-scored)
- W/S: student sees "Your teacher will review this" after submission
- Once teacher grades and saves: student can view feedback via a results link (`/a/:assignmentId/results/:studentToken`)
- Results page shows: band scores, teacher comments (accepted suggestions), teacher's additional notes
- Teacher can optionally also generate a Google Doc with feedback (same as speaking feedback doc flow)

### 14. Notifications / reminders

**Resolution for MVP:** Out of scope for weekend. The grading inbox badge count in the sidebar is the primary notification mechanism.

**Week 2+:**
- **Weekly email digest** (opt-in): "You have 8 ungraded essays this week. 2 students are at risk."
- Sent Monday morning, configurable day/time
- Teacher can turn off in settings

**Later:**
- Parent notification: optional email when a new score is posted ("Minh's latest Writing score: 6.5 — view full report")
- Teacher configurable: auto-send vs manual-send per score

---

## Shipping phases

| Phase | Features | Timeframe |
|---|---|---|
| **Weekend MVP** | Google login, three-path welcome flow (grade now / import scores / setup class), progressive onboarding, AI grading (writing + speaking audio) with suggestion review + Doc comments, Google Sheet score import, manual score entry (single + bulk), simple R/L answer key entry + quick score grid, pre-loaded Cambridge answer keys, basic dashboard with progressive empty states (trends + status flags) | Weekend |
| **Week 2** | Unified assignment library (all 4 skills), online R/L test form (IELTS-style split panel, simple question types), online W/S submission forms (essay editor + audio recorder), student submission → grading inbox flow, paper PDF export, parent shareable link | Week 2 |
| **Week 3** | PDF test import (AI extracts questions), remaining question types (matching, word bank, diagram), Google Sheet auto-sync, student feedback/results view for W/S submissions | Week 3 |
| **Later** | Photo scan for paper answer sheets, Vietnamese language support, comparative benchmarking, center-level multi-teacher view | Later |
