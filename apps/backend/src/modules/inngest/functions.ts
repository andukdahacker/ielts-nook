import { inngest } from "./client.js";
import { testHelloFunction } from "./test-function.js";
import { userDeletionJob } from "../users/jobs/user-deletion.job.js";
import { csvImportJob } from "../users/jobs/csv-import.job.js";
import {
  sessionEmailNotificationJob,
  sessionCancellationEmailJob,
  scheduleRecurrenceChangedEmailJob,
} from "../logistics/jobs/session-email-notification.job.js";
import { questionGenerationJob } from "../exercises/jobs/question-generation.job.js";
import { analyzeSubmissionJob } from "../grading/jobs/analyze-submission.job.js";
import { interventionEmailJob } from "../student-health/jobs/intervention-email.job.js";
import { engagementNotificationJob } from "../engagement/jobs/engagement-notification.job.js";
import { parentWelcomeEmailJob } from "../users/jobs/parent-welcome-email.job.js";
import { snapshotStudentCountJob } from "../billing/jobs/snapshot-student-count.job.js";
import { processPolarWebhookJob } from "../billing/jobs/process-polar-webhook.job.js";
import { billingReminderJob } from "../billing/jobs/billing-reminder.job.js";
import { enforceGracePeriodJob } from "../billing/jobs/enforce-grace-period.job.js";
import { scanExistingContentJob } from "../moderation/jobs/scan-existing-content.job.js";
import { rollingSessionGenerationJob } from "../logistics/jobs/rolling-session-generation.job.js";

// Export functions array - all Inngest functions must be registered here
export const functions: ReturnType<typeof inngest.createFunction>[] = [
  testHelloFunction,
  userDeletionJob,
  csvImportJob,
  sessionEmailNotificationJob,
  sessionCancellationEmailJob,
  questionGenerationJob,
  analyzeSubmissionJob,
  interventionEmailJob,
  engagementNotificationJob,
  parentWelcomeEmailJob,
  snapshotStudentCountJob,
  processPolarWebhookJob,
  billingReminderJob,
  enforceGracePeriodJob,
  scanExistingContentJob,
  rollingSessionGenerationJob,
  scheduleRecurrenceChangedEmailJob,
];
