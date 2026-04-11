# Story 8.5: Golden Sample Management Interface

Status: review

## Story

As a Center Owner,
I want to manage my Golden Samples through a dedicated interface,
so that I can refine AI behavior over time.

## Acceptance Criteria

1. **AC1: Access Path** — Settings > AI Customization > Golden Samples. A new "AI Customization" tab appears in settings nav (OWNER-only).
2. **AC2: Sample List** — Display uploaded samples grouped by skill type (Writing/Speaking tabs), each showing: Title, Upload Date, Type (Writing/Speaking), Status (Active/Inactive toggle).
3. **AC3: Upload Flow** — "Add Sample" opens form with: Title, Skill Type selector, Student Work textarea, Teacher Feedback textarea. Text input only (PDF upload deferred to Epic 18 Knowledge Hub).
4. **AC4: Preview** — Before saving, display side-by-side preview of student work and teacher feedback within the form dialog.
5. **AC5: Edit Sample** — Existing samples can have title, student work, and teacher feedback edited. Skill type is locked on edit.
6. **AC6: Toggle Active** — Samples can be toggled active/inactive via Switch. Inactive samples are excluded from AI prompting.
7. **AC7: Sample Limit** — Display "X/10 samples used" counter per skill type tab. "Add Sample" button disabled with tooltip when 10 reached.
8. **AC8: Delete** — Samples can be permanently deleted with a confirmation dialog.

## Tasks / Subtasks

- [x] **Task 1: Add AI Customization settings tab** (AC: 1)
  - [x] 1.1 Add `"ai"` entry to `settingsTabs` array in `apps/webapp/src/features/settings/config/settings-nav.ts`: `{ id: "ai", label: "AI Customization", path: "ai", order: 4.5, roles: ["OWNER"] }` (labels are plain strings in this codebase, not i18n keys)
  - [x] 1.2 Add route `<Route path="ai" element={<AICustomizationPage />} />` inside the settings layout in `apps/webapp/src/App.tsx`
  - [x] 1.3 Update `settings-nav.ts` test (if it exists) to include the new tab — no test exists, skipped

- [x] **Task 2: Create AICustomizationPage** (AC: 1, 2, 3, 5, 6, 7, 8)
  - [x] 2.1 Create `apps/webapp/src/features/settings/pages/AICustomizationPage.tsx`
  - [x] 2.2 Page structure: heading + description + skill type tabs (Writing / Speaking)
  - [x] 2.3 Use `useGoldenSamples()` from `golden-samples.api.ts` to fetch all samples
  - [x] 2.4 Filter samples by skill type per active tab, sort by `order` ASC
  - [x] 2.5 Display sample cards with: title, truncated student work + feedback preview, active/inactive Switch, Edit and Delete icon buttons
  - [x] 2.6 "Add Sample" button per tab, disabled when skill type has 10 samples (show tooltip via `ai.maxSamplesTooltip`)
  - [x] 2.7 Tab labels show "Writing (X/10)" / "Speaking (X/10)" using `ai.tabWriting` / `ai.tabSpeaking` interpolation keys
  - [x] 2.8 Wire "Add Sample" to open `GoldenSampleForm` in create mode with `useCreateGoldenSample()` mutation
  - [x] 2.9 Wire Edit button to open `GoldenSampleForm` in edit mode with `useUpdateGoldenSample()` mutation
  - [x] 2.10 Wire toggle Switch to `useToggleGoldenSample()` mutation
  - [x] 2.11 Wire Delete button to open confirmation AlertDialog, on confirm call `useDeleteGoldenSample()`
  - [x] 2.12 Show role gate: if user is not OWNER, display `ai.errorTitle` / `ai.errorMessage` instead of the page content
  - [x] 2.13 Show empty states per tab using `ai.emptyWriting` / `ai.emptySpeaking` keys
  - [x] 2.14 Show toast on create/update/delete/toggle success and error using existing `ai.toast*` locale keys

- [x] **Task 3: Add reorder API hook** (AC: 2)
  - [x] 3.1 Add `useReorderGoldenSamples()` mutation hook in `golden-samples.api.ts` calling `POST /api/v1/golden-samples/reorder` with `{ ids: string[] }` body
  - [x] 3.2 Invalidate `goldenSampleKeys.all` on success

- [x] **Task 4: Add drag-and-drop reorder** (AC: 2)
  - [x] 4.1 Use `@hello-pangea/dnd` (already installed in webapp) — do NOT install `@dnd-kit`. Find existing drag-and-drop usage in the exercises feature (mock test reorder from story 12-11) for reference patterns
  - [x] 4.2 Wrap sample card list in `<DragDropContext>` + `<Droppable>` within each skill type tab
  - [x] 4.3 Make each sample card a `<Draggable>` item with a grip handle icon
  - [x] 4.4 On drag end: compute new ID order, call `useReorderGoldenSamples()`, optimistically reorder in UI

- [x] **Task 5: Fix GoldenSampleForm i18n gaps** (AC: 3, 4, 5)
  - [x] 5.1 Replace hardcoded "Cancel" button text with `t("button.cancel", { ns: "common" })` in `GoldenSampleForm.tsx` (key is `button.cancel` in common.json)
  - [x] 5.2 Replace hardcoded "Update" / "Create" button text with `t("button.update", { ns: "common" })` / `t("button.create", { ns: "common" })`
  - [x] 5.3 Replace hardcoded "Writing" / "Speaking" SelectItem labels with `t("skill.writing", { ns: "common" })` / `t("skill.speaking", { ns: "common" })` (keys already exist in common.json)
  - [x] 5.4 Translate Zod validation messages using i18n (use `useMemo` + `t()` pattern from ProfileEditForm.tsx)

- [x] **Task 6: Testing** (AC: all)
  - [x] 6.1 Create `apps/webapp/src/features/settings/pages/__tests__/AICustomizationPage.test.tsx` — unit tests:
    - Renders with Writing/Speaking tabs
    - Shows sample list from mocked query
    - Shows empty state when no samples
    - "Add Sample" opens form dialog
    - Delete opens confirmation dialog
    - Role gate shows error for non-OWNER
    - Sample counter shows correct X/10
  - [x] 6.2 Verify existing tests still pass: `pnpm --filter=webapp test` — 1055 tests passing (106 files)
  - [x] 6.3 Add locale keys parity — verify all new `ai.*` keys exist in both en and vi — parity test passes

## Dev Notes

### Critical: Almost Everything Already Exists — Wire It Together

The backend API, types, frontend API hooks, form component, and locale keys were ALL built in Story 8-1. **This story is primarily a frontend page assembly task.** Do NOT rebuild any of the following:

| Component | Status | Location |
|-----------|--------|----------|
| Backend CRUD + reorder API | DONE | `apps/backend/src/modules/golden-samples/` |
| Zod types | DONE | `packages/types/src/golden-samples.ts` |
| DB model + migration | DONE | `packages/db/prisma/schema.prisma` (GoldenSample model) |
| Frontend API hooks | DONE | `apps/webapp/src/features/settings/golden-samples.api.ts` (create, update, delete, toggle) |
| Form component | DONE | `apps/webapp/src/features/settings/components/GoldenSampleForm.tsx` |
| Locale keys (en + vi) | DONE | `apps/webapp/src/locales/{en,vi}/settings.json` (all `ai.*` keys) |
| AI grading integration | DONE | `apps/backend/src/modules/grading/ai-grading-prompts.ts` (buildStyleReference) |

**What's missing and needs to be built:**
1. `AICustomizationPage.tsx` — the actual settings page
2. `"ai"` tab in `settings-nav.ts`
3. Route in `App.tsx`
4. Reorder mutation hook (backend endpoint exists, frontend hook doesn't)
5. Drag-and-drop reorder UI
6. Delete confirmation dialog
7. Fix i18n gaps in GoldenSampleForm (hardcoded "Cancel", "Update", "Create", "Writing", "Speaking")

### Settings Nav Pattern

Current tabs in `settings-nav.ts`:
```typescript
{ id: "general", label: "General", path: "", order: 1 },
{ id: "users", label: "Users", path: "users", order: 2 },
// ... rooms (2.5), tags (2.7), integrations (3), privacy (4), compliance (4.3)
{ id: "billing", label: "Billing", path: "billing", order: 5 },
```

Add AI Customization at order 4.5 (between compliance and billing). Use `roles: ["OWNER"]` to restrict visibility. The `SettingsLayout` component automatically renders tabs from this array and handles role-based visibility.

### Settings Page Pattern

Follow the pattern from existing settings pages (e.g., `TagsSettingsPage.tsx`, `ModerationPage.tsx`):
```tsx
export default function AICustomizationPage() {
  const { t } = useTranslation("settings");
  const { role } = useAuth();
  // ... role gate, data fetching, state management
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("ai.heading")}</h3>
        <p className="text-sm text-muted-foreground">{t("ai.description")}</p>
      </div>
      {/* Skill type tabs + sample list */}
    </div>
  );
}
```

### Drag-and-Drop — Reuse @hello-pangea/dnd (Already Installed)

The project uses `@hello-pangea/dnd` (a maintained fork of react-beautiful-dnd), NOT `@dnd-kit`. This package is already in `apps/webapp/package.json`. Do NOT install any other DnD library.

Reference implementations (5 files use `@hello-pangea/dnd`):
- `apps/webapp/src/features/mock-tests/components/MockTestEditor.tsx` — drag-and-drop reorder for mock test sections
- `apps/webapp/src/features/exercises/components/ExerciseEditor.tsx` — drag-and-drop for exercise sections
- `apps/webapp/src/features/exercises/components/QuestionSectionEditor.tsx` — drag-and-drop for questions

```tsx
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
```

The backend `/api/v1/golden-samples/reorder` endpoint accepts `{ ids: string[] }` body — all IDs must belong to the same skill type. Reorder within a skill type tab only.

### Existing API Hooks (golden-samples.api.ts)

Already available:
- `useGoldenSamples()` — fetches all samples (no centerId needed, inferred from auth)
- `useCreateGoldenSample()` — body: `{ title, skillType, studentWork, teacherFeedback }`
- `useUpdateGoldenSample()` — body: `{ id, title?, studentWork?, teacherFeedback?, isActive? }`
- `useDeleteGoldenSample()` — takes `id: string`
- `useToggleGoldenSample()` — takes `{ id, isActive }`

**Missing:** `useReorderGoldenSamples()` — needs to be added, calling `POST /api/v1/golden-samples/reorder`

### GoldenSampleForm Props Interface

```typescript
interface GoldenSampleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => Promise<void>;
  initialData?: Partial<FormValues>;
  isSubmitting?: boolean;
  isEdit?: boolean;
}
```

The form handles both create and edit. For edit: pass `initialData` and `isEdit: true`. Skill type selector is disabled in edit mode.

### i18n Gaps in GoldenSampleForm

The form has hardcoded English strings that need i18n:
- Line 192: `"Cancel"` → `t("button.cancel", { ns: "common" })`
- Line 195-196: `"Update"` / `"Create"` → `t("button.update", { ns: "common" })` / `t("button.create", { ns: "common" })`
- Line 119: `"Writing"` → `t("skill.writing", { ns: "common" })`
- Line 120: `"Speaking"` → `t("skill.speaking", { ns: "common" })`

All these keys already exist in `apps/webapp/src/locales/en/common.json` (and vi). No new common keys needed.

Also: Zod validation messages in the form schema (lines 32-35) are hardcoded English. Use the `useMemo` + `t()` pattern established in `ProfileEditForm.tsx` (from story 8-4) to create a localized schema.

### Delete Confirmation

Use Shadcn `AlertDialog` component for delete confirmation:
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@workspace/ui/components/alert-dialog";
```
Use existing keys `ai.deleteTitle` and `ai.deleteDescription`.

### PDF Upload — Out of Scope

AC3 in the epics mentions "Upload Student Work (PDF/Text)". PDF upload is **deferred to Epic 18 (Knowledge Hub)** per the architecture addendum, which plans to migrate `GoldenSample` into a unified `Document` model. For this story, student work and teacher feedback are text-only (textarea input), which is what the existing form already supports.

### Backend — No Changes Needed

All backend endpoints, service methods, tests, and AI integration are complete from Story 8-1. Do NOT modify any backend code.

### What NOT to Do

- Do NOT create a new backend module or modify existing backend golden-sample code
- Do NOT create a new DB migration
- Do NOT modify Prisma schema
- Do NOT modify types in packages/types
- Do NOT modify AI grading integration
- Do NOT add PDF upload — that's Epic 18 scope
- Do NOT duplicate the GoldenSampleForm component — reuse the existing one
- Do NOT re-create API hooks that already exist — only add the missing reorder hook

### Previous Story Intelligence (Story 8-4)

- i18n fully operational: `useTranslation("settings")` provides all `ai.*` keys
- Locale parity test at `apps/webapp/src/__tests__/locale-key-parity.test.ts` — any new keys added to en must also be added to vi
- All 1046 webapp tests passing as of story 8-4 completion
- Settings nav uses plain string labels (not i18n keys) — use `label: "AI Customization"` to match existing convention
- Auth context provides `role` via `useAuth()` hook for OWNER gate

### Git Intelligence

Recent commits: `feat: add language preference & i18n` (8-4), `feat: remove AI assistant, hide unused features` (17-01), `feat: add content moderation system` (8-3). Pattern: `feat:` prefix, single commit per story. All tests passing on develop branch.

### App.tsx Route Pattern

Settings child routes in `apps/webapp/src/App.tsx` follow this pattern:
```tsx
<Route path="settings" element={...}>
  <Route index element={<GeneralSettingsPage />} />
  <Route path="users" element={<UsersPage />} />
  <Route path="rooms" element={<RoomsPage />} />
  <Route path="tags" element={<TagsSettingsPage />} />
  {/* ... more routes */}
</Route>
```
Add: `<Route path="ai" element={<AICustomizationPage />} />`

### Test Pattern (Reference: TagsSettingsPage.test.tsx)

Settings page tests use:
- Vitest: `describe`, `it`, `expect`, `vi`
- `vi.mock()` for auth context and API hooks
- Testing Library: `render`, `screen`, `userEvent`
- `beforeEach` to clear mocks
- `waitFor` for async assertions

### Project Structure Notes

- New page at `apps/webapp/src/features/settings/pages/AICustomizationPage.tsx` — follows existing settings page convention
- Tests at `apps/webapp/src/features/settings/pages/__tests__/AICustomizationPage.test.tsx` — co-located
- No new packages/modules — all infrastructure exists

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 8, Story 8.5 (lines 965-979)]
- [Source: _bmad-output/planning-artifacts/architecture.md — GoldenSample → Document Migration (lines 920-929)]
- [Source: _bmad-output/planning-artifacts/architecture.md — RBAC Rules (line 982)]
- [Source: _bmad-output/implementation-artifacts/8-1-methodology-guardian.md — Story 8.1 completion notes]
- [Source: apps/webapp/src/features/settings/golden-samples.api.ts — Existing API hooks]
- [Source: apps/webapp/src/features/settings/components/GoldenSampleForm.tsx — Existing form component]
- [Source: apps/webapp/src/features/settings/config/settings-nav.ts — Settings tab config]
- [Source: apps/webapp/src/locales/en/settings.json — Existing ai.* locale keys (lines 99-131)]
- [Source: apps/backend/src/modules/golden-samples/ — Complete backend API (routes, controller, service, tests)]
- [Source: packages/types/src/golden-samples.ts — Zod schemas]
- [Source: packages/db/prisma/schema.prisma — GoldenSample model]
- [Source: _bmad-output/implementation-artifacts/8-4-language-preference-i18n.md — Previous story learnings]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
None — clean implementation with no debugging cycles needed.

### Completion Notes List
- Created AICustomizationPage.tsx — full settings page with Writing/Speaking tabs, sample cards, CRUD operations, role gate, empty states, toast notifications
- Added "ai" tab to settings-nav.ts at order 4.5 with OWNER-only role gate
- Added route in App.tsx for /settings/ai
- Added useReorderGoldenSamples() mutation hook to golden-samples.api.ts
- Integrated @hello-pangea/dnd for drag-and-drop reorder (DragDropContext → Droppable → Draggable per tab)
- Fixed GoldenSampleForm i18n gaps: localized Cancel/Update/Create buttons, Writing/Speaking select items, and Zod validation messages using useMemo + t() pattern
- Added 6 new locale keys (ai.goldenSample.error*) to both en and vi settings.json
- Created 9 unit tests covering: tabs rendering, sample list, empty state, add/delete dialogs, role gate, counter, Speaking tab switch, delete mutation
- All 1055 tests passing (106 files), locale parity verified

### Change Log
- 2026-04-12: Story 8-5 implementation complete — Golden Sample Management Interface

### File List
- apps/webapp/src/features/settings/pages/AICustomizationPage.tsx (NEW)
- apps/webapp/src/features/settings/pages/__tests__/AICustomizationPage.test.tsx (NEW)
- apps/webapp/src/features/settings/config/settings-nav.ts (MODIFIED — added ai tab)
- apps/webapp/src/features/settings/golden-samples.api.ts (MODIFIED — added useReorderGoldenSamples)
- apps/webapp/src/features/settings/components/GoldenSampleForm.tsx (MODIFIED — i18n fixes)
- apps/webapp/src/App.tsx (MODIFIED — added ai route)
- apps/webapp/src/locales/en/settings.json (MODIFIED — added validation keys)
- apps/webapp/src/locales/vi/settings.json (MODIFIED — added validation keys)
