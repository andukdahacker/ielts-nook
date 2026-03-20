# Data Models

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive
**Database:** PostgreSQL 16 | **ORM:** Prisma 7.x (PrismaPg adapter)
**Multi-Tenancy:** Logical isolation via `centerId` discriminator column (33 tenanted models)

---

## Entity Relationship Overview

### Core Domain Groups

1. **Identity & Access** -- Center, User, AuthAccount, CenterMembership, LoginAttempt
2. **Logistics** -- Course, Class, Room, ClassSchedule, ClassSession, Attendance
3. **Pedagogy** -- Exercise, ExerciseSection, ExerciseQuestion, ExerciseTag
4. **Assessment** -- Assignment, Submission, SubmissionAnswer
5. **Grading & Feedback** -- GradingJob, SubmissionFeedback, AIFeedbackItem, TeacherComment
6. **Student Engagement** -- StudentFlag, InterventionLog, Engagement, Notification
7. **Billing** -- Subscription, BillingEvent, StudentCountSnapshot
8. **Import** -- CsvImportLog, CsvImportRow

---

## Models by Domain

### Identity & Access

#### Center (Tenant)
```
center
├── id (UUID, PK)
├── name (String)
├── logo (String?)
├── primaryColor (String?)
├── timezone (String, default "Asia/Ho_Chi_Minh")
├── createdAt, updatedAt
└── Relations: memberships[], courses[], classes[], exercises[], assignments[]
```

#### User
```
user
├── id (UUID, PK)
├── email (String, unique)
├── displayName (String)
├── avatarUrl (String?)
├── language (String?, default "en")
├── deletionRequestedAt (DateTime?)
├── createdAt, updatedAt
└── Relations: authAccounts[], memberships[], teacherComments[]
```

#### AuthAccount
```
auth_account
├── id (UUID, PK)
├── userId (FK → User)
├── provider (String: "email" | "google")
├── providerAccountId (String, unique) -- Firebase UID
├── createdAt
```

#### CenterMembership
```
center_membership (TENANTED)
├── id (UUID, PK)
├── userId (FK → User)
├── centerId (FK → Center)
├── role (Enum: OWNER, ADMIN, TEACHER, STUDENT)
├── status (Enum: ACTIVE, INACTIVE, PENDING)
├── invitedByEmail (String?)
├── createdAt, updatedAt
└── Unique: [userId, centerId]
```

#### LoginAttempt
```
login_attempt
├── id (UUID, PK)
├── email (String, unique)
├── attempts (Int, default 0)
├── lockedUntil (DateTime?)
├── lastAttemptAt (DateTime?)
```

### Logistics

#### Course
```
course (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── name, description (String)
├── createdAt, updatedAt
└── Relations: classes[]
```

#### Class
```
class (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── courseId (FK → Course)
├── name (String)
├── teacherId (FK → CenterMembership)
├── roomId (FK → Room?)
├── status (Enum: ACTIVE, ARCHIVED)
├── createdAt, updatedAt
└── Relations: students[] (CenterMembership), sessions[], schedules[], assignments[]
```

#### Room
```
room (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── name (String)
├── capacity (Int?)
├── createdAt, updatedAt
```

#### ClassSchedule
```
class_schedule (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── classId (FK → Class)
├── dayOfWeek (Int, 0-6)
├── startTime, endTime (String, "HH:mm")
├── roomId (FK → Room?)
├── createdAt, updatedAt
```

#### ClassSession
```
class_session (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── classId (FK → Class)
├── scheduleId (FK → ClassSchedule?)
├── date (DateTime)
├── startTime, endTime (String)
├── roomId (FK → Room?)
├── status (Enum: SCHEDULED, CANCELLED)
├── notes (String?)
├── createdAt, updatedAt
└── Relations: attendance[]
```

#### Attendance
```
attendance (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── sessionId (FK → ClassSession)
├── studentId (FK → CenterMembership)
├── status (Enum: PRESENT, ABSENT, LATE, EXCUSED)
├── notes (String?)
├── createdAt, updatedAt
└── Unique: [sessionId, studentId]
```

### Pedagogy

#### Exercise
```
exercise (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── title, instructions (String)
├── skill (Enum: READING, LISTENING, WRITING, SPEAKING)
├── status (Enum: DRAFT, PUBLISHED, ARCHIVED)
├── bandLevel (String?)
├── timeLimitSeconds (Int?)
├── timerWarningEnabled (Boolean, default false)
├── timerWarningSeconds (Int?)
├── autoSubmitOnExpiry (Boolean, default false)
├── passageContent (String?) -- Reading passage text
├── audioUrl (String?) -- Listening audio URL
├── audioFileName (String?)
├── audioPlaybackMode (Enum: SINGLE_PLAY, PRACTICE?)
├── stimulusImageUrl (String?) -- Writing Task 1 image
├── diagramImageUrl (String?) -- Diagram labelling image
├── createdById (FK → CenterMembership)
├── createdAt, updatedAt
└── Relations: sections[], tags[] (many-to-many), assignments[]
```

#### ExerciseSection
```
exercise_section (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── exerciseId (FK → Exercise)
├── title (String)
├── instructions (String?)
├── orderIndex (Int)
├── questionType (Enum: MCQ_SINGLE, MCQ_MULTI, TFNG, YNNG, SENTENCE_COMPLETION, SHORT_ANSWER, SUMMARY_WORD_BANK, SUMMARY_PASSAGE, MATCHING_HEADINGS, MATCHING_INFORMATION, MATCHING_FEATURES, MATCHING_SENTENCE_ENDINGS, NOTE_TABLE_FLOWCHART, DIAGRAM_LABELLING, FORM_COMPLETION, LISTENING_MCQ, LISTENING_MATCHING, MAP_PLAN_LABELLING, LISTENING_SENTENCE_COMPLETION, LISTENING_SHORT_ANSWER, WRITING_TASK_1_ACADEMIC, WRITING_TASK_1_GENERAL, WRITING_TASK_2)
├── createdAt, updatedAt
└── Relations: questions[]
```

#### ExerciseQuestion
```
exercise_question (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── sectionId (FK → ExerciseSection)
├── orderIndex (Int)
├── questionText (String)
├── options (Json?) -- Question-type-specific options
├── correctAnswer (Json?) -- Answer key with variants
├── explanation (String?)
├── points (Int, default 1)
├── createdAt, updatedAt
```

#### ExerciseTag
```
exercise_tag (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── name (String)
├── color (String?)
├── createdAt
└── Many-to-many with Exercise
```

### Assessment

#### Assignment
```
assignment (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── exerciseId (FK → Exercise)
├── classId (FK → Class)
├── title (String)
├── instructions (String?)
├── dueDate (DateTime?)
├── timeLimitSeconds (Int?)
├── status (Enum: OPEN, CLOSED, ARCHIVED)
├── createdById (FK → CenterMembership)
├── createdAt, updatedAt
└── Relations: submissions[]
```

#### Submission
```
submission (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── assignmentId (FK → Assignment)
├── studentId (FK → CenterMembership)
├── status (Enum: IN_PROGRESS, SUBMITTED, AI_PROCESSING, GRADED)
├── submittedAt (DateTime?)
├── isPriority (Boolean, default false)
├── createdAt, updatedAt
└── Relations: answers[], feedback?, gradingJob?, teacherComments[]
```

#### SubmissionAnswer
```
submission_answer (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── submissionId (FK → Submission)
├── questionId (FK → ExerciseQuestion)
├── answer (Json) -- Student's answer (flexible structure)
├── isCorrect (Boolean?)
├── score (Float?)
├── createdAt, updatedAt
└── Unique: [submissionId, questionId]
```

### Grading & Feedback

#### GradingJob
```
grading_job (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── submissionId (FK → Submission, unique)
├── status (Enum: PENDING, PROCESSING, COMPLETED, FAILED)
├── errorMessage (String?)
├── errorCategory (String?)
├── retryCount (Int, default 0)
├── completedAt (DateTime?)
├── createdAt, updatedAt
```

#### SubmissionFeedback
```
submission_feedback (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── submissionId (FK → Submission, unique)
├── overallScore (Float?)
├── overallBand (Float?)
├── criteriaScores (Json?) -- Per-criterion IELTS scores
├── teacherOverallScore (Float?) -- Teacher override
├── teacherOverallBand (Float?)
├── generalFeedback (String?)
├── createdAt, updatedAt
└── Relations: items[]
```

#### AIFeedbackItem
```
ai_feedback_item (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── feedbackId (FK → SubmissionFeedback)
├── type (Enum: GRAMMAR, VOCABULARY, COHERENCE, TASK_RESPONSE, SCORE_SUGGESTION, GENERAL)
├── content (String) -- Feedback text
├── startOffset (Int?) -- Text anchor start
├── endOffset (Int?) -- Text anchor end
├── severity (Enum: INFO, WARNING, ERROR?)
├── status (Enum: PENDING, APPROVED, REJECTED)
├── approvedAt (DateTime?)
├── createdAt, updatedAt
```

#### TeacherComment
```
teacher_comment (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── submissionId (FK → Submission)
├── authorId (FK → User)
├── content (String) -- Comment text
├── startOffset (Int?) -- Text anchor start (null = general comment)
├── endOffset (Int?) -- Text anchor end
├── visibility (Enum: TEACHER_FACING, STUDENT_FACING)
├── createdAt, updatedAt
```

### Student Engagement

#### StudentFlag
```
student_flag (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── studentId (FK → CenterMembership)
├── flaggedById (FK → CenterMembership)
├── status (Enum: OPEN, ACKNOWLEDGED, RESOLVED)
├── note (String, min 10 chars)
├── resolveNote (String?)
├── resolvedById (FK → CenterMembership?)
├── resolvedAt (DateTime?)
├── createdAt, updatedAt
```

#### InterventionLog
```
intervention_log (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── studentId (FK → CenterMembership)
├── initiatedById (FK → CenterMembership)
├── template (Enum: CONCERN_ATTENDANCE, CONCERN_ASSIGNMENTS, CONCERN_GENERAL)
├── status (Enum: PENDING, SENT, FAILED, SKIPPED)
├── recipientEmail (String)
├── subject, body (String)
├── sentAt (DateTime?)
├── errorMessage (String?)
├── createdAt
```

#### Notification
```
notification (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── userId (FK → User)
├── type (String)
├── title, body (String)
├── isRead (Boolean, default false)
├── metadata (Json?)
├── createdAt
```

### Billing

#### Subscription
```
subscription
├── id (UUID, PK)
├── centerId (FK → Center, unique)
├── tier (Enum: PILOT, STARTER, GROWTH, ENTERPRISE)
├── status (Enum: PILOT, ACTIVE, PAST_DUE, CANCELED, GRACE_PERIOD, INACTIVE)
├── polarSubscriptionId (String?)
├── polarCustomerId (String?)
├── currentPeriodStart, currentPeriodEnd (DateTime?)
├── gracePeriodStartedAt (DateTime?)
├── canceledAt (DateTime?)
├── createdAt, updatedAt
```

#### BillingEvent
```
billing_event
├── id (UUID, PK)
├── centerId (FK → Center)
├── type (String: subscription.created, order.paid, etc.)
├── polarEventId (String, unique) -- Idempotency key
├── amount (Int?) -- Cents
├── currency (String?)
├── metadata (Json?)
├── createdAt
```

#### StudentCountSnapshot
```
student_count_snapshot
├── id (UUID, PK)
├── centerId (FK → Center)
├── count (Int)
├── snapshotDate (DateTime)
├── createdAt
```

### Import

#### CsvImportLog
```
csv_import_log (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── initiatedById (FK → CenterMembership)
├── fileName (String)
├── totalRows (Int)
├── importedCount, skippedCount, failedCount (Int)
├── status (Enum: PENDING, PROCESSING, COMPLETED, PARTIAL, FAILED)
├── completedAt (DateTime?)
├── createdAt, updatedAt
└── Relations: rows[]
```

#### CsvImportRow
```
csv_import_row (TENANTED)
├── id (UUID, PK)
├── centerId (FK → Center)
├── importLogId (FK → CsvImportLog)
├── rowNumber (Int)
├── data (Json) -- Raw CSV row data
├── status (Enum: VALID, DUPLICATE_IN_CSV, DUPLICATE_IN_CENTER, ERROR, IMPORTED, SKIPPED, FAILED)
├── errorMessage (String?)
├── createdAt
```

---

## Multi-Tenancy Enforcement

The `getTenantedClient(prisma, centerId)` Prisma Extension automatically injects `centerId` filtering into all CRUD operations for the following 33 models:

```
CenterMembership, Course, Class, Room, ClassSchedule, ClassSession,
Attendance, Exercise, ExerciseSection, ExerciseQuestion, ExerciseTag,
Assignment, Submission, SubmissionAnswer, GradingJob, SubmissionFeedback,
AIFeedbackItem, TeacherComment, StudentFlag, InterventionLog,
Notification, CsvImportLog, CsvImportRow, Engagement,
MockTest, MockTestSection, MockTestSectionExercise, ParentEmail,
NotificationPreference, and more
```

**Key behaviors:**
- `findMany` / `findFirst`: Adds `where: { centerId }` automatically
- `create`: Injects `centerId` into data
- `update` / `delete`: Scopes operation to center
- `findUnique`: Rewritten to `findFirst` with centerId filter (Prisma limitation)

---

## Migration History

| Migration | Description |
|-----------|-------------|
| `0001_init` | Initial schema (centers, users, auth, courses, classes, exercises, questions) |
| `rename_csv_tables_singular` | Normalize CSV import table names |
| `add_submission_models` | Submission + SubmissionAnswer models |
| `add_grading_models` | GradingJob, SubmissionFeedback, AIFeedbackItem |
| `add_teacher_comment_model` | TeacherComment with text anchoring |
| `add_submission_is_priority` | Priority flag on submissions |
| `add_intervention_log_and_parent_email` | InterventionLog, ParentEmail |
| `add_student_flag` | StudentFlag for manual at-risk marking |
| `add_notification_preferences` | User notification preference settings |
| `parent_email_model` | Enhanced parent email tracking |
| `billing_models` | Subscription, BillingEvent, StudentCountSnapshot |
| `add_grace_period_started_at` | Grace period tracking for billing |

## Naming Conventions

- **Prisma models:** PascalCase (e.g., `model ClassSession`)
- **Database tables:** snake_case via `@@map("class_session")`
- **Prisma fields:** camelCase (e.g., `startTime`)
- **Database columns:** snake_case via `@map("start_time")`
