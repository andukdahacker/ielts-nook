# Story 7.3: Parent Email Registration

Status: review

## Story

As a Center Owner,
I want to register parent email addresses for students,
so that parents receive intervention and achievement notifications.

> **FR29–FR31 note:** This story completes the parent communication pipeline. Story 6.3 added intervention emails (FR29), Story 7.1 added achievement emails (FR30), and Story 7.2 added notification preferences (FR31). This story adds the missing piece: admin-managed parent email registration with multi-email support, welcome emails, and unsubscribe.

## Acceptance Criteria

1. **AC1 — Parent Email Management UI:** Student Profile page (when viewed by OWNER/ADMIN) includes a "Parent/Guardian Emails" section. OWNER/ADMIN can add and remove parent email addresses for any STUDENT in their center.
2. **AC2 — Welcome Email:** Adding a parent email triggers a welcome email to that address explaining what notifications they'll receive (intervention alerts and achievement celebrations). Email uses center branding and the student's preferred language.
3. **AC3 — Notification Delivery:** Parent emails receive: intervention alerts (Story 6.3 infrastructure), achievement notifications (Story 7.1 infrastructure). These already work for the current single `parentEmail` field — this story migrates them to use the new `ParentEmail` model.
4. **AC4 — Unsubscribe:** Every email sent to a parent includes an unsubscribe link in the footer. Clicking the link opens a confirmation page; confirming marks that parent email as unsubscribed. Future emails to that address are skipped.
5. **AC5 — Multiple Emails:** Up to 3 parent email addresses supported per student. Enforced at API level with clear error message.

## Tasks / Subtasks

- [x] **Task 1: Database — ParentEmail model + migration** (AC: 5)
  - [x]1.1 Add `ParentEmail` model to `packages/db/prisma/schema.prisma` (see Dev Notes for exact schema)
  - [x]1.2 Add `parentEmails ParentEmail[]` relation to `User` model (replace `parentEmail String?`)
  - [x]1.3 Remove `parentEmail String? @map("parent_email")` field from `User` model
  - [x]1.4 Run `pnpm --filter=db db:migrate:dev --name parent-email-model` — IMPORTANT: Edit the generated migration SQL to include the data migration INSERT before the DROP COLUMN (see Dev Notes for exact SQL)
  - [x]1.5 Run `pnpm --filter=db db:generate`

- [x] **Task 2: Shared Types** (AC: 1, 5)
  - [x]2.1 In `packages/types/src/user.ts`: Add `ParentEmailSchema` and `AddParentEmailSchema` (see Dev Notes)
  - [x]2.2 In `packages/types/src/user.ts`: Remove any references to `parentEmail` in existing schemas (verify none exist — currently it's NOT in UserProfileSchema or UpdateProfileSchema)
  - [x]2.3 Run `pnpm --filter=types build`

- [x] **Task 3: Backend — Parent email service** (AC: 1, 5)
  - [x]3.1 Create `apps/backend/src/modules/users/parent-email.service.ts`
  - [x]3.2 Implement `listParentEmails(centerId, studentId)` — verify student is in center, return all ParentEmail records
  - [x]3.3 Implement `addParentEmail(centerId, studentId, email)` — validate max 3, unique email per student, create record, fire Inngest event
  - [x]3.4 Implement `removeParentEmail(centerId, studentId, parentEmailId)` — verify ownership, delete record
  - [x]3.5 Write unit tests

- [x] **Task 4: Backend — Parent email routes** (AC: 1)
  - [x]4.1 Create `apps/backend/src/modules/users/parent-email.routes.ts`
  - [x]4.2 `GET /api/v1/users/:userId/parent-emails` — list parent emails (OWNER/ADMIN only)
  - [x]4.3 `POST /api/v1/users/:userId/parent-emails` — add parent email (OWNER/ADMIN only)
  - [x]4.4 `DELETE /api/v1/users/:userId/parent-emails/:parentEmailId` — remove (OWNER/ADMIN only)
  - [x]4.5 Register routes in `users.routes.ts` or app plugin
  - [x]4.6 Write integration tests

- [x] **Task 5: Welcome email** (AC: 2)
  - [x]5.1 Create `apps/backend/src/modules/users/emails/parent-welcome.template.ts` — pure function, en/vi locale, center branding
  - [x]5.2 Create Inngest job `apps/backend/src/modules/users/jobs/parent-welcome-email.job.ts` — listens for `parent-email/registered`, sends welcome email, logs to EmailLog
  - [x]5.3 Register job in `apps/backend/src/modules/inngest/functions.ts`
  - [x]5.4 Write template tests

- [x] **Task 6: Unsubscribe endpoint** (AC: 4)
  - [x]6.1 Create `apps/backend/src/modules/users/unsubscribe.routes.ts`
  - [x]6.2 `GET /api/v1/unsubscribe/:token` — public (no auth), renders HTML confirmation page
  - [x]6.3 `POST /api/v1/unsubscribe/:token` — public (no auth), marks ParentEmail as unsubscribed, renders HTML success page
  - [x]6.4 Register as public route (no auth middleware)
  - [x]6.5 Write integration tests

- [x] **Task 7: Update engagement flow** (AC: 3, 4)
  - [x]7.1 Refactor `getParentEmails()` in `engagement.service.ts` — query ParentEmail model, filter unsubscribed, return `{ email, unsubscribeToken }[]`
  - [x]7.2 Update `engagement-notification.job.ts` — use refactored `getParentEmails()`, pass `unsubscribeToken` to template
  - [x]7.3 Update `engagement-notification.template.ts` — add unsubscribe footer link when `unsubscribeToken` is provided
  - [x]7.4 Update existing engagement tests

- [x] **Task 8: Update intervention flow** (AC: 3, 4)
  - [x]8.1 Update `student-health.service.ts` → `getEmailPreview()` — query ParentEmail model instead of `user.parentEmail`, return first non-unsubscribed email
  - [x]8.2 Update `intervention.template.ts` — add optional unsubscribe footer link
  - [x]8.3 Update `intervention-email.job.ts` — look up ParentEmail record by email, include unsubscribe token if found
  - [x]8.4 Update existing intervention tests

- [x] **Task 9: Frontend + Schema Sync + Tests** (AC: 1, all)
  - [x]9.1 Start backend: `pnpm --filter=backend dev`
  - [x]9.2 Regenerate frontend types: `pnpm --filter=webapp sync-schema-dev`
  - [x]9.3 Create `apps/webapp/src/features/users/components/ParentEmailSection.tsx` — add/remove parent emails, max 3, unsubscribe status display
  - [x]9.4 Update `apps/webapp/src/features/users/profile-page.tsx` — render ParentEmailSection when OWNER/ADMIN views a STUDENT profile
  - [x]9.5 Verify all backend tests pass: `pnpm --filter=backend test`
  - [x]9.6 Verify webapp builds: `pnpm --filter=webapp build`

## Dev Notes

### Design Decisions

**Why a separate `ParentEmail` model instead of JSON array on User?**

AC5 requires max 3 parent emails per student with AC4 requiring per-email unsubscribe tracking. A separate model gives us:
- Per-email unsubscribe flag + token
- Database-enforced unique constraint `(userId, email)`
- Easy querying for unsubscribe endpoint
- Clean cascade delete when student is removed

**Why remove `User.parentEmail` in the same migration?**

The single field is replaced entirely by the new model. Keeping both creates confusion about source of truth. The migration copies existing data before dropping the column. All consumers (engagement job, intervention service) are updated in this story.

**Why ParentEmail is NOT tenanted?**

`User` is NOT in `TENANTED_MODELS` — users are global entities. Parent emails belong to the student user, not to a center. If a student is in multiple centers, their parent emails are the same across all. Unsubscribe is global (affects all centers).

**Why the unsubscribe endpoint serves HTML directly from Fastify?**

Creating a React page for unsubscribe requires webapp routing changes, auth bypass, and adds complexity. A minimal HTML response from the backend is the standard pattern for email unsubscribe (no JS required, works in all email clients' built-in browsers, no CORS issues).

**Why NOT extend CSV import for parent emails?**

Out of scope per ACs. Can be a follow-up enhancement. Admins use the profile UI for individual management.

### Prisma Schema Changes

**New ParentEmail model** — Add after the User model in `packages/db/prisma/schema.prisma`:

```prisma
model ParentEmail {
  id               String   @id @default(cuid())
  userId           String   @map("user_id")
  email            String
  unsubscribed     Boolean  @default(false)
  unsubscribeToken String   @unique @default(cuid()) @map("unsubscribe_token")
  createdAt        DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, email])
  @@index([userId])
  @@map("parent_email_entry")
}
```

**Table name:** `parent_email_entry` (not `parent_email`) to avoid confusion with the old `parent_email` column name on the `user` table.

**User model changes:**
```prisma
// REMOVE this line:
parentEmail  String?  @map("parent_email")

// ADD this relation (near other relations):
parentEmails  ParentEmail[]
```

### Data Migration Strategy

After running `pnpm --filter=db db:migrate:dev --name parent-email-model`, Prisma generates a migration SQL. You MUST edit it to add the data migration BETWEEN the CREATE TABLE and the DROP COLUMN. The final migration SQL should look like:

```sql
-- CreateTable
CREATE TABLE "parent_email_entry" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribe_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_email_entry_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data from user.parent_email to new table
INSERT INTO "parent_email_entry" ("id", "user_id", "email", "unsubscribed", "unsubscribe_token", "created_at")
SELECT
    gen_random_uuid()::text,
    "id",
    "parent_email",
    false,
    gen_random_uuid()::text,
    CURRENT_TIMESTAMP
FROM "user"
WHERE "parent_email" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "parent_email_entry_unsubscribe_token_key" ON "parent_email_entry"("unsubscribe_token");
CREATE UNIQUE INDEX "parent_email_entry_user_id_email_key" ON "parent_email_entry"("user_id", "email");
CREATE INDEX "parent_email_entry_user_id_idx" ON "parent_email_entry"("user_id");

-- AddForeignKey
ALTER TABLE "parent_email_entry" ADD CONSTRAINT "parent_email_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropColumn (AFTER data is migrated)
ALTER TABLE "user" DROP COLUMN "parent_email";
```

**CRITICAL:** The INSERT must happen BEFORE the DROP COLUMN. Prisma's auto-generated migration may place the DROP first — you must reorder.

### Shared Types Changes

**`packages/types/src/user.ts`** — Add these schemas:

```typescript
// Parent email response schema
export const ParentEmailSchema = z.object({
  id: z.string(),
  email: z.string(),
  unsubscribed: z.boolean(),
  createdAt: z.string(),
});
export type ParentEmail = z.infer<typeof ParentEmailSchema>;

// Add parent email request schema
export const AddParentEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
});
export type AddParentEmailInput = z.infer<typeof AddParentEmailSchema>;
```

**No changes to `UserProfileSchema` or `UpdateProfileSchema`** — parent emails are managed via separate endpoints, not the profile update endpoint. Verify `parentEmail` is NOT referenced in any existing schema (it was never added — confirmed from Story 7.2 research).

### Backend — Parent Email Service

**File:** `apps/backend/src/modules/users/parent-email.service.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import { getTenantedClient } from "@workspace/db";
import { inngest } from "../inngest/client.js";

const MAX_PARENT_EMAILS = 3;

export class ParentEmailService {
  constructor(private prisma: PrismaClient) {}

  async listParentEmails(centerId: string, studentId: string) {
    // Verify student belongs to center
    const db = getTenantedClient(this.prisma, centerId);
    const membership = await db.centerMembership.findFirst({
      where: { userId: studentId, role: "STUDENT" },
    });
    if (!membership) throw new Error("Student not found in this center");

    // ParentEmail is NOT tenanted — query directly via raw prisma
    return this.prisma.parentEmail.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, unsubscribed: true, createdAt: true },
    });
  }

  async addParentEmail(centerId: string, studentId: string, email: string) {
    // Verify student belongs to center
    const db = getTenantedClient(this.prisma, centerId);
    const membership = await db.centerMembership.findFirst({
      where: { userId: studentId, role: "STUDENT" },
    });
    if (!membership) throw new Error("Student not found in this center");

    // Check max limit
    const count = await this.prisma.parentEmail.count({ where: { userId: studentId } });
    if (count >= MAX_PARENT_EMAILS) {
      throw new Error(`Maximum ${MAX_PARENT_EMAILS} parent emails allowed per student`);
    }

    // Check duplicate
    const existing = await this.prisma.parentEmail.findUnique({
      where: { userId_email: { userId: studentId, email: email.toLowerCase().trim() } },
    });
    if (existing) throw new Error("This email is already registered for this student");

    // Create
    const parentEmail = await this.prisma.parentEmail.create({
      data: { userId: studentId, email: email.toLowerCase().trim() },
      select: { id: true, email: true, unsubscribed: true, createdAt: true },
    });

    // Fire welcome email event
    await inngest.send({
      name: "parent-email/registered",
      data: { studentId, parentEmailId: parentEmail.id, centerId },
    });

    return parentEmail;
  }

  async removeParentEmail(centerId: string, studentId: string, parentEmailId: string) {
    // Verify student belongs to center
    const db = getTenantedClient(this.prisma, centerId);
    const membership = await db.centerMembership.findFirst({
      where: { userId: studentId, role: "STUDENT" },
    });
    if (!membership) throw new Error("Student not found in this center");

    // Verify parent email belongs to this student
    const parentEmail = await this.prisma.parentEmail.findFirst({
      where: { id: parentEmailId, userId: studentId },
    });
    if (!parentEmail) throw new Error("Parent email not found");

    await this.prisma.parentEmail.delete({ where: { id: parentEmailId } });
  }
}
```

**CRITICAL:** `ParentEmail` is NOT tenanted. Use `this.prisma` (raw) for ParentEmail queries, NOT `getTenantedClient()`. The `getTenantedClient()` call is only for verifying the student's center membership.

### Backend — Parent Email Routes

**File:** `apps/backend/src/modules/users/parent-email.routes.ts`

Register under the existing users route plugin (already auth-protected). Follow the exact pattern of existing routes in `users.routes.ts`:

```typescript
// GET  /api/v1/users/:userId/parent-emails
// POST /api/v1/users/:userId/parent-emails
// DELETE /api/v1/users/:userId/parent-emails/:parentEmailId
```

**Auth/RBAC:** Use the same OWNER/ADMIN guard pattern used by other user management routes (role change, deactivate, etc.). Check `request.userData.role` for OWNER or ADMIN.

**Route registration:** Import and register the parent email routes in the same plugin where other user routes are registered. Look at how `users.routes.ts` is structured and add the parent email routes in the same file or as a child plugin.

### Welcome Email Template

**File:** `apps/backend/src/modules/users/emails/parent-welcome.template.ts`

```typescript
interface ParentWelcomeEmailParams {
  studentName: string | null;
  centerName: string;
  locale: "en" | "vi";
  unsubscribeUrl: string;
}

export function buildParentWelcomeEmail(params: ParentWelcomeEmailParams): {
  subject: string;
  html: string;
}
```

**Content outline:**
- Subject: "Welcome to {centerName} Parent Notifications" / "Chao mung den thong bao phu huynh {centerName}"
- Header: Center name with Royal Blue `#2563EB` header (follow existing template pattern)
- Body: Explain they've been registered as a parent/guardian contact for {studentName}
- What they'll receive:
  - Achievement celebrations (7-day streaks, personal bests)
  - Important updates from teachers about their child's progress
- Footer: Unsubscribe link + "You received this email because an administrator at {centerName} registered your email."

**Follow exact template pattern** from `engagement-notification.template.ts`:
- Import `escapeHtml` from `../../logistics/emails/format-utils.js` (path: `users/emails/` → `users/` → `modules/`, then into `logistics/emails/`)
- Inline CSS, `<table>` layout, 600px max-width
- en/vi locale support
- CTA button with `#2563EB` if applicable

### Welcome Email Inngest Job

**File:** `apps/backend/src/modules/users/jobs/parent-welcome-email.job.ts`

```typescript
export const parentWelcomeEmailJob = inngest.createFunction(
  { id: "parent-welcome-email", retries: 3 },
  { event: "parent-email/registered" },
  async ({ event, step }) => {
    const { studentId, parentEmailId, centerId } = event.data;

    // Step 1: Fetch parent email record + student name
    const data = await step.run("fetch-data", async () => {
      const prisma = createPrisma();
      try {
        const parentEmail = await prisma.parentEmail.findUnique({
          where: { id: parentEmailId },
          select: { email: true, unsubscribeToken: true },
        });
        if (!parentEmail) return null;

        const user = await prisma.user.findUnique({
          where: { id: studentId },
          select: { name: true, preferredLanguage: true },
        });

        const center = await prisma.center.findUnique({
          where: { id: centerId },
          select: { name: true },
        });

        return {
          email: parentEmail.email,
          unsubscribeToken: parentEmail.unsubscribeToken,
          studentName: user?.name ?? null,
          locale: (user?.preferredLanguage ?? "en") as "en" | "vi",
          centerName: center?.name ?? "ClassLite",
        };
      } finally {
        await prisma.$disconnect();
      }
    });
    if (!data) return { status: "parent-email-not-found" };

    // Step 2: Send welcome email
    await step.run("send-welcome-email", async () => {
      const prisma = createPrisma();
      try {
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) return { status: "no-resend-key" };

        const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
        const unsubscribeUrl = `${backendUrl}/api/v1/unsubscribe/${data.unsubscribeToken}`;

        const { subject, html } = buildParentWelcomeEmail({
          studentName: data.studentName,
          centerName: data.centerName,
          locale: data.locale,
          unsubscribeUrl,
        });

        const resend = new Resend(resendApiKey);
        const emailFrom = process.env.EMAIL_FROM || "ClassLite <noreply@classlite.app>";

        const db = getTenantedClient(prisma, centerId);
        try {
          await resend.emails.send({ from: emailFrom, to: data.email, subject, html });
          await db.emailLog.create({
            data: {
              recipientId: studentId,
              centerId,
              type: "parent-welcome",
              status: "sent",
              subject,
            },
          });
        } catch (err) {
          await db.emailLog.create({
            data: {
              recipientId: studentId,
              centerId,
              type: "parent-welcome",
              status: "failed",
              subject,
              error: String(err),
            },
          });
          throw err; // Let Inngest retry
        }
      } finally {
        await prisma.$disconnect();
      }
    });

    return { status: "sent" };
  },
);
```

**Pattern notes:**
- `createPrisma()` from `../../../plugins/create-prisma.js` (path: `users/jobs/` → `users/` → `modules/` → `src/`, then `plugins/`)
- `ParentEmail` queries use raw prisma (NOT tenanted)
- `EmailLog` uses `getTenantedClient` (EmailLog IS tenanted)
- `recipientId` = student ID (consistent with engagement email pattern)
- `type: "parent-welcome"` — new email type

### Unsubscribe Endpoint

**File:** `apps/backend/src/modules/users/unsubscribe.routes.ts`

**CRITICAL:** These routes must be PUBLIC (no auth middleware). Check how auth is applied in the Fastify app setup and register these routes OUTSIDE the auth-protected plugin scope.

```typescript
// GET /api/v1/unsubscribe/:token — Shows confirmation page
// POST /api/v1/unsubscribe/:token — Performs unsubscribe + shows success page
```

**GET handler:** Look up ParentEmail by `unsubscribeToken`. If not found, show "Link invalid or expired" page. If already unsubscribed, show "Already unsubscribed" page. Otherwise, show confirmation page with a form that POSTs to the same URL.

**POST handler:** Look up ParentEmail by `unsubscribeToken`. Set `unsubscribed = true`. Show "Successfully unsubscribed" page.

**HTML responses:** Return `reply.type("text/html").send(html)` with minimal, self-contained HTML. No external CSS/JS dependencies. Keep it simple and accessible:

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:0 20px;text-align:center}
.btn{display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border:none;border-radius:6px;font-size:16px;cursor:pointer}
.btn:hover{background:#1d4ed8}</style></head>
<body>
<h1>Unsubscribe from Notifications</h1>
<p>You will stop receiving email notifications for {{studentName}} from {{centerName}}.</p>
<form method="POST"><button type="submit" class="btn">Confirm Unsubscribe</button></form>
</body></html>
```

**Look up center name and student name** for the confirmation page by joining through the ParentEmail → User → CenterMembership chain:
```typescript
const record = await prisma.parentEmail.findUnique({
  where: { unsubscribeToken: token },
  include: {
    user: {
      select: {
        name: true,
        memberships: { select: { center: { select: { name: true } } }, take: 1 },
      },
    },
  },
});
```

### Update getParentEmails() — Engagement Service

**File:** `apps/backend/src/modules/engagement/engagement.service.ts`

**BEFORE (current):**
```typescript
export function getParentEmails(user: { parentEmail: string | null }): string[] {
  return [user.parentEmail].filter(Boolean) as string[];
}
```

**AFTER (refactored):**
```typescript
import { PrismaClient } from "@prisma/client";

export async function getParentEmails(
  prisma: PrismaClient,
  studentId: string,
): Promise<Array<{ email: string; unsubscribeToken: string }>> {
  const records = await prisma.parentEmail.findMany({
    where: { userId: studentId, unsubscribed: false },
    select: { email: true, unsubscribeToken: true },
  });
  return records;
}
```

**CRITICAL BREAKING CHANGE:** The function signature changes from sync to async and takes different parameters. ALL callers must be updated:

1. **`engagement-notification.job.ts`** — Update `fetch-student` step to call `getParentEmails(prisma, studentId)` instead of using `user.parentEmail`. Remove `parentEmail` from the user select clause.
2. **Any future callers** — Use the new async signature.

**ParentEmail queries use raw prisma** (NOT tenanted). The function receives a raw `PrismaClient`, not a tenanted client.

### Update Engagement Notification Job

**File:** `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts`

Changes to the `fetch-student` step:
1. Remove `parentEmail` from the `select` clause (field no longer exists on User)
2. Call `getParentEmails(prisma, studentId)` to get parent emails with unsubscribe tokens
3. Return `{ ...user, parentEmails }` where `parentEmails` is `Array<{ email: string; unsubscribeToken: string }>`

Changes to the email sending loop:
1. Pass `unsubscribeToken` to the template builder
2. Each parent email now has its own unsubscribe token

```typescript
// In fetch-student step:
const parentEmails = await getParentEmails(prisma, studentId);
return { ...user, parentEmails };

// In send loop:
for (const parent of recipientData.parentEmails) {
  const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";
  const unsubscribeUrl = `${backendUrl}/api/v1/unsubscribe/${parent.unsubscribeToken}`;
  const { subject, html } = buildEngagementEmail({ ...params, unsubscribeUrl });
  // ... send to parent.email
}
```

### Update Engagement Email Template

**File:** `apps/backend/src/modules/engagement/emails/engagement-notification.template.ts`

Add optional `unsubscribeUrl` parameter:

```typescript
interface EngagementEmailParams {
  // ... existing params ...
  unsubscribeUrl?: string; // Optional — only included for parent emails, not student emails
}
```

Add to footer (only when `unsubscribeUrl` is provided):

```html
<!-- After existing footer text -->
${params.unsubscribeUrl ? `
<p style="margin:8px 0 0;font-size:12px;color:#a1a1aa;text-align:center;">
  <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#a1a1aa;text-decoration:underline;">
    ${locale === "vi" ? "Huy dang ky nhan thong bao" : "Unsubscribe from these notifications"}
  </a>
</p>` : ""}
```

**Student emails do NOT get the unsubscribe link** — students manage preferences via their profile page (Story 7.2). Only parent emails get the link because parents don't have ClassLite accounts.

### Update Intervention Flow

**File:** `apps/backend/src/modules/student-health/student-health.service.ts`

Update `getEmailPreview()` method:

**BEFORE:**
```typescript
const user = membership.user;
return { recipientEmail: user.parentEmail ?? null, ... };
```

**AFTER:**
```typescript
// Fetch parent emails from new model (use raw prisma — ParentEmail is NOT tenanted)
const parentEmails = await this.prisma.parentEmail.findMany({
  where: { userId: studentId, unsubscribed: false },
  select: { email: true },
  orderBy: { createdAt: "asc" },
});
const recipientEmail = parentEmails[0]?.email ?? null;
return { recipientEmail, ... };
```

Remove `parentEmail: true` from the user `select` clause in `getEmailPreview()` (field no longer exists).

**File:** `apps/backend/src/modules/student-health/jobs/intervention-email.job.ts`

Add optional unsubscribe link lookup:
```typescript
// After fetching intervention log data, look up ParentEmail record
const parentEmailRecord = await prisma.parentEmail.findFirst({
  where: { userId: intervention.studentId, email: intervention.recipientEmail },
  select: { unsubscribeToken: true },
});
const unsubscribeUrl = parentEmailRecord
  ? `${process.env.BACKEND_URL || "http://localhost:4000"}/api/v1/unsubscribe/${parentEmailRecord.unsubscribeToken}`
  : undefined;
```

Pass `unsubscribeUrl` to the intervention template builder.

**File:** `apps/backend/src/modules/student-health/emails/intervention.template.ts`

Add optional `unsubscribeUrl` parameter (same pattern as engagement template). Only show the unsubscribe link when the URL is provided.

### Frontend — ParentEmailSection Component

**File:** `apps/webapp/src/features/users/components/ParentEmailSection.tsx`

**When to render:** Only when OWNER/ADMIN is viewing a STUDENT's profile. Check:
1. Viewer's role is OWNER or ADMIN (from auth context)
2. Viewed user's role is STUDENT
3. Viewer is NOT viewing their own profile

**Component structure:**
```
── Parent/Guardian Emails ──────────────────────
  parent1@example.com                    [Remove]
  parent2@example.com  (Unsubscribed)    [Remove]

  [Email input field]  [Add]
  (Up to 3 parent emails per student)
────────────────────────────────────────────────
```

**API calls:** Use `openapi-fetch` with the generated types:
- Fetch: `GET /api/v1/users/{userId}/parent-emails`
- Add: `POST /api/v1/users/{userId}/parent-emails` with `{ email }`
- Remove: `DELETE /api/v1/users/{userId}/parent-emails/{parentEmailId}`

**UX details:**
- Email input with validation (HTML5 email type + simple regex)
- "Add" button disabled when input is empty or 3 emails already exist
- Remove with confirmation (window.confirm or small inline confirm)
- Show unsubscribed badge in muted text for unsubscribed emails
- Show error toast on API failure (duplicate, max limit, validation)
- Use TanStack Query for data fetching + mutation (follow existing patterns)

**File:** `apps/webapp/src/features/users/profile-page.tsx`

Add the ParentEmailSection below the profile info section:

```tsx
{/* Only show for OWNER/ADMIN viewing a STUDENT */}
{(currentUser?.role === "OWNER" || currentUser?.role === "ADMIN") &&
  profileUser?.role === "STUDENT" &&
  currentUser?.id !== profileUser?.id && (
    <ParentEmailSection userId={profileUser.id} />
  )}
```

### Environment Variable

**New env var: `BACKEND_URL`**

Required for constructing unsubscribe links in emails. Value is the public-facing URL of the backend API.

| Environment | Value |
|---|---|
| Development | `http://localhost:4000` (default fallback) |
| Staging | `https://api-staging.classlite.app` (or Railway URL) |
| Production | `https://api.classlite.app` (or Railway URL) |

Add to `.env.example` if it exists. The code should fall back to `http://localhost:4000` if not set.

### Existing Infrastructure — DO NOT Rebuild

| Component | Location | Notes |
|---|---|---|
| Inngest client | `apps/backend/src/modules/inngest/client.ts` | `id: "classlite"` |
| Inngest registry | `apps/backend/src/modules/inngest/functions.ts` | Add welcome email job |
| createPrisma | `apps/backend/src/plugins/create-prisma.ts` | For PrismaClient in Inngest jobs |
| EmailLog model | `packages/db/prisma/schema.prisma` | Use `type: "parent-welcome"` |
| escapeHtml + format utils | `apps/backend/src/modules/logistics/emails/format-utils.ts` | Import, do NOT duplicate |
| Engagement job | `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts` | Modify, don't replace |
| Engagement template | `apps/backend/src/modules/engagement/emails/engagement-notification.template.ts` | Add unsubscribe param |
| Intervention template | `apps/backend/src/modules/student-health/emails/intervention.template.ts` | Add unsubscribe param |
| Intervention job | `apps/backend/src/modules/student-health/jobs/intervention-email.job.ts` | Add unsubscribe lookup |
| Student health service | `apps/backend/src/modules/student-health/student-health.service.ts` | Update getEmailPreview |
| ProfilePage | `apps/webapp/src/features/users/profile-page.tsx` | Add ParentEmailSection |
| Switch/Form components | `@workspace/ui` | Already available |
| TanStack Query | `apps/webapp` | For data fetching |
| Resend | Used directly via `new Resend()` in Inngest jobs | NOT via fastify plugin |

### Key Implementation Warnings

1. **DO NOT add `ParentEmail` to `TENANTED_MODELS`** — ParentEmail belongs to User (global), not to a center. Use raw `prisma` for all ParentEmail queries.
2. **DO NOT use `getTenantedClient()` for ParentEmail queries** — Only use it for tenanted models (EmailLog, CenterMembership, etc.).
3. **DO NOT keep `User.parentEmail` field** — Remove it completely. All consumers are updated in this story. Keeping it creates dual source of truth.
4. **EDIT the migration SQL manually** — Prisma generates CREATE TABLE + DROP COLUMN separately. You must add the INSERT INTO data migration between them. If you forget, existing parent emails are lost.
5. **DO NOT add unsubscribe link to student emails** — Students manage preferences via their profile (Story 7.2). Only parent emails get the unsubscribe link.
6. **Normalize email to lowercase + trim** — Before saving to ParentEmail. The `@@unique([userId, email])` constraint is case-sensitive; normalizing prevents `Parent@Email.com` and `parent@email.com` being stored as duplicates.
7. **Unsubscribe routes must be PUBLIC** — No auth middleware. Check how the Fastify app registers auth-protected vs public routes and register unsubscribe outside the auth scope.
8. **`BACKEND_URL` env var** — Required in staging/production for unsubscribe links. Falls back to `http://localhost:4000` in development. Add to Railway environment config.
9. **DO NOT create a `parentEmail` property on UserProfileSchema** — Parent emails are managed via separate endpoints, not the profile update API.
10. **Run `pnpm --filter=db db:migrate:dev --name parent-email-model`** — NOT `db:push`. Follow migration workflow per `project-context.md`.
11. **Run `pnpm --filter=webapp sync-schema-dev` after backend route changes** — New parent email endpoints need type definitions.
12. **Import `escapeHtml` correctly** — From `users/emails/`, the path is `../../logistics/emails/format-utils.js` (up to `modules/`, then into `logistics/emails/`).
13. **Engagement job tests** — The engagement job test file (`engagement-notification.job.test.ts`) has 5 tests for preference enforcement (from Story 7.2). These will need updating since `parentEmail` is no longer on the User model.
14. **Student health route tests** — `student-health.routes.integration.test.ts` references `parentEmail` in test data. Update to use the new ParentEmail model.

### Previous Story Intelligence

**From Story 7.2 (Notification Preferences):**
- All 871 backend tests pass as of Story 7.2 completion
- `emailEngagementNotifications` and `emailNotificationsPaused` preferences are already enforced in the engagement job — parent emails respect student's preference (if student disables engagement notifications, parents don't get them either)
- The `disabled` prop pattern on Switch components is accessible (keyboard + screen reader safe)
- Profile page has both view-mode and edit-mode sections — ParentEmailSection should work in both modes (always interactive for admins)

**From Story 7.1 (Engagement Email Notifications):**
- `getParentEmails()` was explicitly designed for this refactor — the helper encapsulates parent email extraction
- `sendAndLogEmail()` shared helper in engagement job handles both student and parent emails
- Engagement job already loops over parent emails array — multi-parent is structurally ready
- `recipientId` in EmailLog = student ID (not parent's) — consistent for all parent-facing emails
- Template tests use snapshots — update expected HTML to include unsubscribe footer
- `escapeHtml` import path from `engagement/emails/` is `../../logistics/emails/format-utils.js`

**From Story 6.3 (Email Intervention Loop):**
- Intervention emails use `recipientEmail` passed from the compose modal (admin can type any email)
- `InterventionComposeModal` pre-fills "To" with `preview.recipientEmail` — this field now comes from ParentEmail model
- Intervention template uses `wrapPlainTextInEmailHtml()` for custom body text

### Git Intelligence

Recent commits:
- `52eb0b8 feat: Story 7.2 — Notification preferences with code review fixes` — Latest, direct predecessor
- `7d3d608 feat: Story 7.1 — Engagement email notifications with code review fixes`
- Commit pattern: `feat: Story X.Y — Description with code review fixes`
- Both stories modified engagement job file — this story modifies it again (ensure no merge conflicts if rebasing)

### Project Structure Notes

**New files (9):**
```
apps/backend/src/modules/users/parent-email.service.ts
apps/backend/src/modules/users/parent-email.service.test.ts
apps/backend/src/modules/users/parent-email.routes.ts
apps/backend/src/modules/users/unsubscribe.routes.ts
apps/backend/src/modules/users/emails/parent-welcome.template.ts
apps/backend/src/modules/users/emails/parent-welcome.template.test.ts
apps/backend/src/modules/users/jobs/parent-welcome-email.job.ts
apps/webapp/src/features/users/components/ParentEmailSection.tsx
packages/db/prisma/migrations/XXXX_parent_email_model/migration.sql
```

**Modified files (11):**
```
packages/db/prisma/schema.prisma                                          — Add ParentEmail model, remove User.parentEmail
packages/types/src/user.ts                                                — Add ParentEmail + AddParentEmail schemas
apps/backend/src/modules/engagement/engagement.service.ts                 — Refactor getParentEmails()
apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts   — Use new getParentEmails, add unsubscribe URL
apps/backend/src/modules/engagement/emails/engagement-notification.template.ts — Add unsubscribe footer param
apps/backend/src/modules/student-health/student-health.service.ts         — Update getEmailPreview() to use ParentEmail model
apps/backend/src/modules/student-health/jobs/intervention-email.job.ts    — Add unsubscribe lookup
apps/backend/src/modules/student-health/emails/intervention.template.ts   — Add unsubscribe footer param
apps/backend/src/modules/inngest/functions.ts                             — Register parentWelcomeEmailJob
apps/webapp/src/features/users/profile-page.tsx                           — Add ParentEmailSection
apps/webapp/src/schema/schema.d.ts                                        — Auto-regenerated
```

### References

- [Source: project-context.md#Critical Implementation Rules] — Multi-tenancy (ParentEmail NOT tenanted), migration workflow
- [Source: epics.md#Epic 7, Story 7.3] — AC1-AC5 acceptance criteria
- [Source: prd.md#FR29-FR31] — Parent notification requirements
- [Source: 7-1-engagement-email-notifications.md] — getParentEmails() helper, sendAndLogEmail pattern, engagement job architecture
- [Source: 7-2-notification-preferences.md] — Preference enforcement in engagement job, profile page patterns
- [Source: 6-3-email-intervention-loop.md] — Intervention email flow, InterventionComposeModal pre-fill pattern
- [Source: engagement-notification.template.ts] — Email template pattern (inline CSS, locale, escapeHtml)
- [Source: engagement.service.ts:110-114] — Current getParentEmails() implementation
- [Source: student-health.service.ts] — getEmailPreview() method using user.parentEmail
- [Source: users.service.ts] — User service patterns, parentEmail NOT in profile endpoints
- [Source: ProfileEditForm.tsx] — Profile form schema (no parentEmail field)
- [Source: profile-page.tsx] — View/edit mode structure, role-based rendering
- [Source: users.routes.ts] — Route registration pattern, auth guards
- [Source: tenanted-client.ts] — TENANTED_MODELS array (ParentEmail should NOT be added)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- ParentEmail model is NOT tenanted — uses raw `prisma` for ParentEmail queries, `getTenantedClient` only for membership verification
- Migration includes data migration (INSERT INTO from old `parent_email` column before DROP COLUMN)
- Unsubscribe routes are public (no auth) — registered separately in app.ts
- Engagement and intervention jobs updated to loop over ParentEmail model with per-parent unsubscribe tokens

### File List

**New files:**
- `apps/backend/src/modules/users/parent-email.service.ts` — ParentEmailService (list/add/remove)
- `apps/backend/src/modules/users/parent-email.service.test.ts` — 10 unit tests
- `apps/backend/src/modules/users/parent-email.routes.ts` — GET/POST/DELETE routes
- `apps/backend/src/modules/users/parent-email.integration.test.ts` — 6 integration tests
- `apps/backend/src/modules/users/unsubscribe.routes.ts` — Public GET/POST unsubscribe pages
- `apps/backend/src/modules/users/unsubscribe.integration.test.ts` — 5 integration tests
- `apps/backend/src/modules/users/jobs/parent-welcome-email.job.ts` — Inngest welcome email job
- `apps/backend/src/modules/users/emails/parent-welcome.template.ts` — Welcome email template (en/vi)
- `apps/backend/src/modules/users/emails/parent-welcome.template.test.ts` — 12 template tests
- `apps/webapp/src/features/users/components/ParentEmailSection.tsx` — Frontend component
- `packages/db/prisma/migrations/20260226114549_parent_email_model/migration.sql` — Migration
- `_bmad-output/implementation-artifacts/7-3-parent-email-registration.md` — Story file

**Modified files:**
- `apps/backend/src/app.ts` — Register unsubscribe routes (public)
- `apps/backend/src/modules/users/users.routes.ts` — Register parent email routes (auth-protected)
- `apps/backend/src/modules/inngest/functions.ts` — Register parentWelcomeEmailJob
- `apps/backend/src/modules/engagement/engagement.service.ts` — Refactor getParentEmails to async ParentEmail model query
- `apps/backend/src/modules/engagement/engagement.service.test.ts` — Tests for getParentEmails
- `apps/backend/src/modules/engagement/jobs/engagement-notification.job.ts` — Parent email loop (Step 6+)
- `apps/backend/src/modules/engagement/jobs/engagement-notification.job.test.ts` — Updated fixtures
- `apps/backend/src/modules/engagement/emails/engagement-notification.template.ts` — Add unsubscribeUrl param
- `apps/backend/src/modules/student-health/student-health.service.ts` — Use ParentEmail model for getEmailPreview
- `apps/backend/src/modules/student-health/student-health.service.test.ts` — Mock parentEmail.findMany
- `apps/backend/src/modules/student-health/emails/intervention.template.ts` — Add unsubscribeUrl param
- `apps/backend/src/modules/student-health/jobs/intervention-email.job.ts` — Unsubscribe lookup step
- `apps/backend/src/modules/student-health/student-health.routes.integration.test.ts` — Update mocks
- `apps/webapp/src/features/users/profile-page.tsx` — Render ParentEmailSection
- `apps/webapp/src/features/users/users.api.ts` — Parent email API hooks
- `apps/webapp/src/schema/schema.d.ts` — Auto-generated schema update
- `packages/db/prisma/schema.prisma` — ParentEmail model, remove old parentEmail field
- `packages/types/src/user.ts` — ParentEmailSchema, AddParentEmailSchema
