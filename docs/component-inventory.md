# Component Inventory

**Generated:** 2026-03-20 | **Scan Level:** Exhaustive

---

## Shared UI Library (`packages/ui`)

### Design System Foundation

- **Framework:** shadcn/ui (Radix Primitives + Tailwind CSS)
- **Icons:** Lucide React
- **Styling:** Tailwind CSS 4 + `cn()` utility (clsx + tailwind-merge)
- **Typography:** Inter (body/UI), Outfit (headings)
- **Animations:** framer-motion
- **Notifications:** sonner (toast)

### Primitive Components (40+)

| Category | Components |
|----------|-----------|
| **Form Controls** | Button, Input, Textarea, Checkbox, RadioGroup, Switch, Select, Label, Calendar, InputGroup |
| **Data Display** | Badge, Avatar, Card (Header/Title/Description/Action/Content/Footer), Progress, Skeleton, Table |
| **Data Table** | DataTable, LazyDataTable (virtualized), DataTableColumnHeader (sortable) |
| **Navigation** | Sidebar, Breadcrumb, Tabs, DropdownMenu |
| **Overlay** | Dialog, AlertDialog, Sheet (drawer), Popover, Tooltip, Command (palette) |
| **Layout** | Accordion, Collapsible, ScrollArea, Separator, ToggleGroup |
| **Feedback** | Alert, Sonner (toast), Logo |

### Hooks

| Hook | Purpose |
|------|---------|
| `use-mobile` | Mobile breakpoint detection (`< 768px`) |

---

## Webapp Feature Components

### Core Layout

| Component | Location | Purpose |
|-----------|----------|---------|
| `DashboardShell` | `core/components/layout/` | Main layout (sidebar + content area) |
| `TopBar` | `core/components/layout/` | Header with breadcrumbs |
| `Breadcrumbs` | `core/components/layout/` | Auto-generated from route config |
| `MobileNavOverflow` | `core/components/layout/` | Mobile navigation overflow menu |
| `OfflineIndicator` | `core/components/layout/` | Network status badge |
| `AppSidebar` | `core/components/common/` | Main navigation sidebar |
| `NavMain` | `core/components/common/` | Navigation menu items (role-aware) |
| `NavUser` | `core/components/common/` | User dropdown (profile, logout) |
| `ThemeProvider` | `core/components/common/` | Dark/light mode context |
| `ErrorBoundary` | `core/components/common/` | Global error catch |

### Auth Components

| Component | Purpose |
|-----------|---------|
| `LoginForm` | Email/password login with validation |
| `SignupForm` | Personal account signup |
| `SignupCenterForm` | Center owner registration |
| `GoogleLoginButton` | OAuth login via Firebase |
| `RBACWrapper` | Conditional render based on user role |
| `ProtectedRoute` | Route guard (redirects to login) |
| `GuestRoute` | Redirects authenticated users away |
| `RoleRedirect` | Routes users by role |

### Exercise Builder Components

| Component | Purpose |
|-----------|---------|
| `ExerciseEditor` | Main create/edit exercise form |
| `QuestionSectionEditor` | Section management within exercise |
| `SkillSelector` | Reading/Listening/Writing/Speaking picker |
| `TagSelector` | Tag assignment with search |
| `TimerSettingsEditor` | Time limit + warning + auto-submit config |
| `PassageEditor` | Rich text passage editing |
| `WritingTaskEditor` | Writing prompt + rubric display |
| `WritingRubricDisplay` | IELTS band descriptor display |
| `SpeakingTaskEditor` | Speaking cue card editor |
| `AudioUploadEditor` | Listening audio upload + waveform |
| `AudioSectionMarkers` | Audio timestamp markers |
| `PlaybackModeSettings` | Single-play vs practice mode config |
| `AIGenerationPanel` | AI question generation trigger |
| `DocumentUploadPanel` | PDF/Word upload for AI parsing |

### Question Type Editors (per IELTS type)

| Editor | Preview | Question Type |
|--------|---------|---------------|
| `MCQEditor` | `MCQPreview` | Multiple choice (single + multi) |
| `TFNGEditor` | `TFNGPreview` | True/False/Not Given + Yes/No/NG |
| `TextInputEditor` | `TextInputPreview` | Sentence/summary completion, short answer |
| `WordBankEditor` | `WordBankPreview` | Summary completion with word bank |
| `MatchingEditor` | `MatchingPreview` | All matching types (headings, info, features, endings) |
| `DiagramLabellingEditor` | `DiagramLabellingPreview` | Diagram/map labelling |
| `NoteTableFlowchartEditor` | `NoteTableFlowchartPreview` | Note/table/flowchart completion |
| `SpeakingCueCardEditor` | - | Speaking Part 2 cue card |
| `AnswerVariantManager` | - | Answer key variant configuration |

### Submission Components (Student)

| Component | Purpose |
|-----------|---------|
| `SubmissionPage` | Main submission-taking interface |
| `SubmissionHeader` | Timer + progress display |
| `QuestionStepper` | Question navigation |
| `QuestionNumberPills` | Question number indicators |
| `PassagePanel` | Reading passage display |
| `AudioPlayerPanel` | Listening audio playback |
| `OfflineBanner` | "Saved Locally" warning |
| `SubmitConfirmDialog` | Final submission confirmation |
| `SubmissionCompletePage` | Post-submission success |

### Question Inputs (Student-facing)

| Component | Input Type |
|-----------|-----------|
| `MCQInput` | Radio/checkbox for MCQ |
| `TextAnswerInput` | Text field for completion/short answer |
| `WordBankInput` | Dropdown/drag for word bank |
| `MatchingInput` | Dropdown matching |
| `DiagramLabellingInput` | Positioned text inputs |
| `NoteTableFlowchartInput` | Structured text inputs |
| `WritingInput` | Rich text editor (TipTap) |
| `SpeakingInput` | Audio recording |
| `PhotoCaptureInput` | Camera capture for handwritten work |

### Grading Workbench Components

| Component | Purpose |
|-----------|---------|
| `WorkbenchLayout` | Resizable split-pane layout |
| `QueueListMode` | Submission queue list view |
| `GradingQueueListView` | Sortable/filterable queue |
| `QueueFilters` | Filter by skill, status, grading status |
| `QueueProgressBar` | Graded/total progress |
| `SubmissionNav` | Prev/next navigation + auto-advance |
| `StudentWorkPane` | Student answer display (left pane) |
| `AIFeedbackPane` | AI feedback cards (right pane) |
| `FeedbackItemCard` | Individual AI item with accept/reject |
| `BandScoreCard` | IELTS band score display + adjustment |
| `AddCommentInput` | Teacher comment composition |
| `TeacherCommentCard` | Comment display with edit/delete |
| `CommentPopover` | Comment actions popover |
| `HighlightedText` | Text selection for anchoring |
| `ConnectionLineOverlay` | SVG bezier lines connecting anchors |
| `AnchorStatusIndicator` | Anchor validity indicator |
| `StampedAnimation` | "Approved" stamp effect (framer-motion) |
| `BreatherCard` | 5-item break prompt card |

### Student Feedback Components

| Component | Purpose |
|-----------|---------|
| `StudentFeedbackPage` | Student view of graded submission |
| `StudentFeedbackContent` | Feedback display |
| `StudentCommentsList` | Teacher + AI comments (student-facing only) |
| `StudentScoreDisplay` | Band scores + criteria breakdown |
| `SubmissionHistoryPanel` | Assignment submission timeline |

### Logistics Components

| Component | Purpose |
|-----------|---------|
| `ClassDrawer` | Create/edit class side drawer |
| `CourseDrawer` | Create/edit course side drawer |
| `RosterManager` | Student roster management |
| `ScheduleManager` | Class schedule configuration |
| `WeeklyCalendar` | Weekly schedule grid view |
| `SessionBlock` | Individual session display |
| `SessionDetailsPopover` | Session detail overlay |
| `CreateSessionDialog` | New session dialog |
| `EditSessionDialog` | Edit session dialog |
| `ConflictWarningBanner` | Schedule conflict inline banner |
| `ConflictDrawer` | Conflict resolution drawer |
| `AttendanceSheet` | Attendance tracking grid |
| `AttendanceModal` | Attendance entry dialog |

### Student Health Components

| Component | Purpose |
|-----------|---------|
| `StudentHealthDashboard` | Main health overview |
| `StudentHealthCard` | Individual student health card |
| `HealthSummaryBar` | At-risk/warning/on-track counts |
| `TrafficLightBadge` | Red/yellow/green status indicator |
| `StudentProfileOverlay` | Detailed student profile (no page reload) |
| `FlagStudentModal` | Manual at-risk flagging |
| `StudentFlagsSection` | Flag history display |
| `InterventionComposeModal` | Send intervention email |
| `InterventionHistoryTab` | Intervention log timeline |
| `TeacherAtRiskWidget` | Teacher dashboard widget |

### User Management Components

| Component | Purpose |
|-----------|---------|
| `UserListTable` | Data table of center users |
| `SearchFilterControls` | Search + role/status filters |
| `UserActionsDropdown` | Per-user action menu |
| `BulkActionBar` | Bulk deactivate/remind |
| `InviteUserModal` | Send user invitation |
| `PendingInvitationsTable` | Pending invitation list |
| `RoleChangeModal` | Change user role confirmation |
| `DeleteAccountModal` | Account deletion flow |
| `CsvImportModal` | CSV bulk import wizard |
| `ImportHistorySection` | Import history timeline |
| `ProfileEditForm` | Self-service profile editing |
| `PasswordChangeForm` | Password change form |
| `ParentEmailSection` | Parent communication log |

### Settings Components

| Component | Purpose |
|-----------|---------|
| `SettingsLayout` | Settings page tab navigation |
| `GracePeriodBanner` | Billing grace period warning |
| `BillingMetricCards` | Usage metric cards |
| `UsageChart` | Student count usage graph |
| `TierComparisonTable` | Plan feature comparison |
| `PaymentHistoryTable` | Payment records table |
| `DowngradeConfirmDialog` | Tier change confirmation |

### Dashboard Components

| Component | Purpose |
|-----------|---------|
| `OwnerDashboard` | Owner home (health summary, quick actions) |
| `TeacherDashboard` | Teacher home (grading queue, upcoming sessions) |
| `StudentDashboard` | Student home (assignments, upcoming classes) |
| `AssignmentCard` | Assignment summary card |
| `NotificationBell` | Notification indicator + dropdown |

---

## Custom React Hooks (Feature Hooks)

### Auth
`useAuth`, `useLoginMutation`, `useSignupCenterMutation`, `useGoogleLoginMutation`

### Exercises
`useExercises`, `useExercise`, `useSections`, `useTags`, `useAIGeneration`, `useAudioUpload`, `useDiagramUpload`, `useDocumentUpload`, `useStimulusUpload`

### Submissions
`useSubmission`, `useStartSubmission`, `useSaveAnswers`, `useSubmitSubmission`, `useAutoSave`, `useUploadPhoto`, `useAssignmentDetail`

### Grading
`useGradingQueue`, `useSubmissionDetail`, `useStudentFeedback`, `useSubmissionHistory`, `useTeacherComments`, `useCreateComment`, `useUpdateComment`, `useDeleteComment`, `useApproveFeedbackItem`, `useBulkApprove`, `useFinalizeGrading`, `useHighlightContext`, `useTextSelection`, `useAnchorValidation`, `useTogglePriority`, `useGradingShortcuts`, `useRetriggerAnalysis`, `usePrefetchSubmission`

### Logistics
`useCourses`, `useClasses`, `useSessions`, `useRooms`, `useAttendance`, `useConflictCheck`, `useSchedules`

### Student Health
`useStudentHealthDashboard`, `useStudentProfile`, `useStudentFlags`, `useIntervention`, `useTeacherAtRiskWidget`

### Mock Tests
`useMockTests`, `useMockTest`, `useMockTestSections`

### Users
`useUsers`, `useChangeRole`, `useExecuteImport`, `useInvitations`

### Billing
`useBillingOverview`, `useTiers`, `usePaymentHistory`, `useUsageHistory`, `useCheckout`
