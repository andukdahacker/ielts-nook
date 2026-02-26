import type { Page } from "@playwright/test";
import {
  E2E_CENTER_ID,
  TEST_USERS,
  loginAs,
  getAppUrl,
  test as baseTest,
} from "./auth.fixture";
import {
  publishExerciseViaAPI,
  cleanupExercise,
  uniqueName,
} from "./exercise-fixtures";
import {
  createAssignmentViaAPI,
  cleanupAssignment,
} from "./assignment-fixtures";
import { closeAIAssistantDialog } from "../utils/close-ai-assistant";

/** IDs returned from test data creation for cleanup */
export interface SubmissionTestIds {
  exerciseId: string;
  assignmentId: string;
  exerciseTitle: string;
  sectionIds: string[];
  questionIds: string[];
}

function getBackendUrl(): string {
  return process.env.VITE_API_URL || "http://localhost:4000";
}

async function getAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  if (!token) throw new Error("No auth token found — is the user logged in?");
  return token;
}

/**
 * Add a section to a DRAFT exercise via backend API.
 */
export async function addSectionViaAPI(
  page: Page,
  exerciseId: string,
  sectionType: string,
  orderIndex: number,
  instructions?: string
): Promise<{ id: string }> {
  const token = await getAuthToken(page);
  const response = await page.request.post(
    `${getBackendUrl()}/api/v1/exercises/${exerciseId}/sections`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        sectionType,
        orderIndex,
        instructions: instructions ?? null,
      },
    }
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to create section: ${response.status()} ${body}`
    );
  }
  const body = await response.json();
  const data = body.data ?? body;
  return { id: data.id };
}

/**
 * Add a question to a section via backend API.
 */
export async function addQuestionViaAPI(
  page: Page,
  exerciseId: string,
  sectionId: string,
  question: {
    questionText: string;
    questionType: string;
    orderIndex: number;
    options?: unknown;
    correctAnswer?: unknown;
    wordLimit?: number | null;
  }
): Promise<{ id: string }> {
  const token = await getAuthToken(page);
  const response = await page.request.post(
    `${getBackendUrl()}/api/v1/exercises/${exerciseId}/sections/${sectionId}/questions`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: question,
    }
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `Failed to create question: ${response.status()} ${body}`
    );
  }
  const body = await response.json();
  const data = body.data ?? body;
  return { id: data.id };
}

/**
 * Create a complete submission test exercise with:
 * - 1 reading exercise
 * - Section 1: R1_MCQ_SINGLE with 1 MCQ question (4 options)
 * - Section 2: R6_SHORT_ANSWER with 1 short-answer question
 * - Published exercise
 * - Assignment targeting e2e-test-class
 *
 * Requires the page to be logged in as a role that can create exercises (OWNER/ADMIN/TEACHER).
 */
export async function createSubmissionTestData(
  page: Page
): Promise<SubmissionTestIds> {
  const sectionIds: string[] = [];
  const questionIds: string[] = [];

  // 1. Create a READING exercise with passage content (direct API call since
  //    createExerciseViaAPI doesn't forward passageContent)
  const title = uniqueName("E2E Submission");
  const token = await getAuthToken(page);
  const createRes = await page.request.post(
    `${getBackendUrl()}/api/v1/exercises`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        title,
        skill: "READING",
        passageContent:
          "Climate change is one of the most pressing issues of our time. Rising global temperatures are causing widespread environmental disruption, including melting ice caps, rising sea levels, and more frequent extreme weather events.",
      },
    }
  );
  if (!createRes.ok()) {
    const body = await createRes.text();
    throw new Error(
      `Failed to create exercise via API: ${createRes.status()} ${body}`
    );
  }
  const createBody = await createRes.json();
  const exercise = { id: (createBody.data ?? createBody).id };

  // 2. Add MCQ section (R1_MCQ_SINGLE)
  const mcqSection = await addSectionViaAPI(
    page,
    exercise.id,
    "R1_MCQ_SINGLE",
    0,
    "Choose the correct answer."
  );
  sectionIds.push(mcqSection.id);

  // 3. Add MCQ question
  const mcqQuestion = await addQuestionViaAPI(page, exercise.id, mcqSection.id, {
    questionText:
      "What is described as one of the most pressing issues of our time?",
    questionType: "R1_MCQ_SINGLE",
    orderIndex: 0,
    options: {
      items: [
        { label: "A", text: "Economic recession" },
        { label: "B", text: "Climate change" },
        { label: "C", text: "Political instability" },
        { label: "D", text: "Technological disruption" },
      ],
    },
    correctAnswer: { answer: "B" },
  });
  questionIds.push(mcqQuestion.id);

  // 4. Add short-answer section (R6_SHORT_ANSWER)
  const textSection = await addSectionViaAPI(
    page,
    exercise.id,
    "R6_SHORT_ANSWER",
    1,
    "Answer in no more than 3 words."
  );
  sectionIds.push(textSection.id);

  // 5. Add short-answer question
  const textQuestion = await addQuestionViaAPI(
    page,
    exercise.id,
    textSection.id,
    {
      questionText:
        "What are rising global temperatures causing to melt?",
      questionType: "R6_SHORT_ANSWER",
      orderIndex: 0,
      correctAnswer: { answer: "ice caps" },
      wordLimit: 3,
    }
  );
  questionIds.push(textQuestion.id);

  // 6. Publish the exercise
  await publishExerciseViaAPI(page, exercise.id);

  // 7. Create assignment targeting e2e-test-class
  const assignment = await createAssignmentViaAPI(page, {
    exerciseId: exercise.id,
    classIds: ["e2e-test-class"],
  });

  return {
    exerciseId: exercise.id,
    assignmentId: assignment.id,
    exerciseTitle: title,
    sectionIds,
    questionIds,
  };
}

/**
 * Clean up submission test data (assignment + exercise).
 * Silently ignores errors.
 */
export async function cleanupSubmissionTestData(
  page: Page,
  ids: SubmissionTestIds
): Promise<void> {
  await cleanupAssignment(page, ids.assignmentId);
  await cleanupExercise(page, ids.exerciseId);
}

/**
 * Login as STUDENT and navigate to the submission page for a given assignment.
 * Waits for the submission to initialize (questions to render).
 */
export async function startSubmissionAsStudent(
  page: Page,
  assignmentId: string
): Promise<void> {
  await loginAs(page, TEST_USERS.STUDENT);

  // Navigate directly to the submission page
  await page.goto(`/${E2E_CENTER_ID}/assignments/${assignmentId}/take`);
  await page.waitForLoadState("networkidle");

  // Wait for submission to initialize — question navigation renders after load
  await page.getByRole("button", { name: /Next|Submit/ }).first().waitFor({ timeout: 15000 });
}

/**
 * Wait for the startSubmission mutation to complete (sets submissionId on the page).
 * Auto-save and submit are disabled until submissionId is set.
 * Call this after startSubmissionAsStudent when your test needs save/submit functionality.
 *
 * Retries with page reload if the mutation doesn't complete — under parallel load
 * the POST /api/v1/student/submissions/ call can be slow or fail transiently.
 */
export async function waitForSubmissionReady(page: Page): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.locator("[data-submission-id]").waitFor({ timeout: 15000 });
      return;
    } catch {
      if (attempt < 3) {
        await page.reload();
        await page.waitForLoadState("networkidle");
        await page
          .getByRole("button", { name: /Next|Submit/ })
          .first()
          .waitFor({ timeout: 15000 });
      }
    }
  }
  // Final attempt with longer timeout
  await page.locator("[data-submission-id]").waitFor({ timeout: 30000 });
}

/**
 * Login as STUDENT, navigate to dashboard, find and click "Start" on the assignment card.
 * This tests the full user flow from dashboard → submission.
 */
export async function startSubmissionFromDashboard(
  page: Page,
  exerciseTitle?: string
): Promise<void> {
  await loginAs(page, TEST_USERS.STUDENT);
  await page.goto(getAppUrl("/dashboard"));
  await page.waitForLoadState("networkidle");
  await closeAIAssistantDialog(page);

  // Verify "Your Tasks" heading is visible
  await page.getByRole("heading", { name: "Your Tasks" }).waitFor({ timeout: 10000 });

  // Click the "Start" button on the correct assignment card
  if (exerciseTitle) {
    // The title text is inside a card. Use getByText to find the title, then find
    // the nearest ancestor that is a direct card container (not the whole page).
    // Assignment cards have a "Start" button as a sibling/descendant.
    const titleEl = page.getByText(exerciseTitle).first();
    // Navigate up to the card boundary and find its Start button
    const startBtn = titleEl.locator("xpath=ancestor::div[contains(@class,'rounded') or contains(@class,'card')][1]//button[contains(.,'Start')]").first();
    const hasTitleStartBtn = await startBtn.isVisible().catch(() => false);
    if (hasTitleStartBtn) {
      await startBtn.click();
    } else {
      // Fallback: click the first Start button on the page
      await page.getByRole("button", { name: /Start/ }).first().click();
    }
  } else {
    await page.getByRole("button", { name: /Start/ }).first().click();
  }

  // Wait for submission page to load
  await page.waitForURL(/.*\/assignments\/.*\/take/);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Next|Submit/ }).first().waitFor({ timeout: 15000 });
}

/**
 * Playwright test fixture with automatic submission test data setup/teardown.
 * Each test gets an isolated `testIds` via the fixture pattern — safe for parallel execution.
 */
export const submissionTest = baseTest.extend<{ testIds: SubmissionTestIds }>({
  testIds: async ({ browser }, use) => {
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    await loginAs(setupPage, TEST_USERS.TEACHER);
    const ids = await createSubmissionTestData(setupPage);
    await setupContext.close();

    await use(ids);

    const cleanupContext = await browser.newContext();
    const cleanupPage = await cleanupContext.newPage();
    await loginAs(cleanupPage, TEST_USERS.TEACHER);
    await cleanupSubmissionTestData(cleanupPage, ids);
    await cleanupContext.close();
  },
});
