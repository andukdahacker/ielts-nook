import type { Page } from "@playwright/test";
import {
  TEST_USERS,
  test as baseTest,
  loginAs,
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

/** IDs returned from grading test data creation for cleanup */
export interface GradingTestIds {
  exerciseId: string;
  assignmentId: string;
  submissionId: string;
  sectionId: string;
  questionId: string;
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
 * Get an auth token directly from the Firebase Auth emulator REST API.
 * Bypasses UI login entirely — much faster for fixture setup.
 */
export async function getTokenViaEmulator(
  email: string,
  password: string
): Promise<string> {
  const emulatorHost =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const res = await fetch(
    `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Firebase emulator signIn failed for ${email}: ${res.status} ${body}`
    );
  }
  const data = await res.json();
  return data.idToken;
}

/**
 * Submit a WRITING answer as STUDENT via API.
 * Starts a submission, fills the answer, and submits it.
 * Returns the submissionId.
 */
export async function submitWritingAnswerViaAPI(
  page: Page,
  assignmentId: string,
  answerText: string
): Promise<{ submissionId: string }> {
  const token = await getAuthToken(page);
  const backendUrl = getBackendUrl();

  // 1. Start the submission
  const startRes = await page.request.post(
    `${backendUrl}/api/v1/student/submissions/`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { assignmentId },
    }
  );
  if (!startRes.ok()) {
    const body = await startRes.text();
    throw new Error(`Failed to start submission: ${startRes.status()} ${body}`);
  }
  const startBody = await startRes.json();
  const submission = startBody.data ?? startBody;
  const submissionId = submission.id;

  // 2. Get the assignment detail to find the question ID
  const detailRes = await page.request.get(
    `${backendUrl}/api/v1/student/submissions/assignment/${assignmentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!detailRes.ok()) {
    throw new Error(`Failed to get assignment detail: ${detailRes.status()}`);
  }
  const detailBody = await detailRes.json();
  const detail = detailBody.data ?? detailBody;
  // Navigate the exercise structure to find the first question
  const sections = detail.exercise?.sections ?? detail.sections ?? [];
  const firstSection = sections[0];
  const questions = firstSection?.questions ?? [];
  const questionId = questions[0]?.id ?? questions[0]?.questionId;

  // 3. Save the answer
  if (questionId) {
    await page.request.patch(
      `${backendUrl}/api/v1/student/submissions/${submissionId}/answers`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          answers: [{ questionId, answer: { text: answerText } }],
        },
      }
    );
  }

  // 4. Submit the submission
  const submitRes = await page.request.post(
    `${backendUrl}/api/v1/student/submissions/${submissionId}/submit`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    }
  );
  if (!submitRes.ok()) {
    const body = await submitRes.text();
    throw new Error(`Failed to submit submission: ${submitRes.status()} ${body}`);
  }

  return { submissionId };
}

/**
 * Submit a WRITING answer using a pre-obtained auth token.
 * Uses the page's request context but overrides the Authorization header.
 * This avoids needing a separate browser context for the student.
 */
async function submitWritingAnswerWithToken(
  page: Page,
  assignmentId: string,
  answerText: string,
  token: string
): Promise<{ submissionId: string }> {
  const backendUrl = getBackendUrl();
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Start the submission
  const startRes = await page.request.post(
    `${backendUrl}/api/v1/student/submissions/`,
    { headers, data: { assignmentId } }
  );
  if (!startRes.ok()) {
    const body = await startRes.text();
    throw new Error(`Failed to start submission: ${startRes.status()} ${body}`);
  }
  const startBody = await startRes.json();
  const submission = startBody.data ?? startBody;
  const submissionId = submission.id;

  // 2. Get the assignment detail to find the question ID
  const detailRes = await page.request.get(
    `${backendUrl}/api/v1/student/submissions/assignment/${assignmentId}`,
    { headers }
  );
  if (!detailRes.ok()) {
    throw new Error(`Failed to get assignment detail: ${detailRes.status()}`);
  }
  const detailBody = await detailRes.json();
  const detail = detailBody.data ?? detailBody;
  const sections = detail.exercise?.sections ?? detail.sections ?? [];
  const firstSection = sections[0];
  const questions = firstSection?.questions ?? [];
  const questionId = questions[0]?.id ?? questions[0]?.questionId;

  // 3. Save the answer
  if (questionId) {
    await page.request.patch(
      `${backendUrl}/api/v1/student/submissions/${submissionId}/answers`,
      {
        headers,
        data: { answers: [{ questionId, answer: { text: answerText } }] },
      }
    );
  }

  // 4. Submit the submission
  const submitRes = await page.request.post(
    `${backendUrl}/api/v1/student/submissions/${submissionId}/submit`,
    { headers, data: {} }
  );
  if (!submitRes.ok()) {
    const body = await submitRes.text();
    throw new Error(`Failed to submit submission: ${submitRes.status()} ${body}`);
  }

  return { submissionId };
}

/**
 * Trigger AI analysis and poll until ready or failed.
 * Returns the final analysis status ("ready" | "failed" | "analyzing").
 */
export async function triggerAndWaitForAnalysis(
  page: Page,
  submissionId: string,
  timeoutMs = 30000
): Promise<string> {
  const token = await getAuthToken(page);
  const backendUrl = getBackendUrl();

  // Trigger analysis
  const triggerRes = await page.request.post(
    `${backendUrl}/api/v1/grading/submissions/${submissionId}/analyze`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!triggerRes.ok()) {
    // AI might not be available — return the status
    return "failed";
  }

  // Poll until analysis is ready or failed
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const detailRes = await page.request.get(
      `${backendUrl}/api/v1/grading/submissions/${submissionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (detailRes.ok()) {
      const body = await detailRes.json();
      const data = body.data ?? body;
      const status = data.analysisStatus;
      if (status === "ready" || status === "failed") {
        return status;
      }
    }
    await page.waitForTimeout(2000);
  }

  return "analyzing"; // Timed out
}

/**
 * Create full grading test data pipeline:
 * WRITING exercise -> section + freetext question -> publish -> assignment -> submit as student -> trigger analysis.
 */
export async function createGradingTestData(
  page: Page
): Promise<GradingTestIds> {
  const backendUrl = getBackendUrl();
  const token = await getAuthToken(page);

  // 1. Create a WRITING exercise
  const title = uniqueName("E2E Grading");
  const createRes = await page.request.post(
    `${backendUrl}/api/v1/exercises`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { title, skill: "WRITING" },
    }
  );
  if (!createRes.ok()) {
    const body = await createRes.text();
    throw new Error(`Failed to create exercise: ${createRes.status()} ${body}`);
  }
  const createBody = await createRes.json();
  const exerciseId = (createBody.data ?? createBody).id;

  // 2. Add a WRITING section (W3_TASK2_ESSAY or similar)
  const sectionRes = await page.request.post(
    `${backendUrl}/api/v1/exercises/${exerciseId}/sections`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        sectionType: "W3_TASK2_ESSAY",
        orderIndex: 0,
        instructions:
          "Write an essay about the importance of education. Minimum 150 words.",
      },
    }
  );
  if (!sectionRes.ok()) {
    const body = await sectionRes.text();
    throw new Error(`Failed to create section: ${sectionRes.status()} ${body}`);
  }
  const sectionBody = await sectionRes.json();
  const sectionId = (sectionBody.data ?? sectionBody).id;

  // 3. Add a freetext question
  const questionRes = await page.request.post(
    `${backendUrl}/api/v1/exercises/${exerciseId}/sections/${sectionId}/questions`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        questionText:
          "Write an essay discussing the role of technology in modern education.",
        questionType: "W3_TASK2_ESSAY",
        orderIndex: 0,
        wordLimit: null,
      },
    }
  );
  if (!questionRes.ok()) {
    const body = await questionRes.text();
    throw new Error(`Failed to create question: ${questionRes.status()} ${body}`);
  }
  const questionBody = await questionRes.json();
  const questionId = (questionBody.data ?? questionBody).id;

  // 4. Publish the exercise
  await publishExerciseViaAPI(page, exerciseId);

  // 5. Create assignment targeting e2e-test-class
  // createAssignmentViaAPI returns { id, exerciseId } but the backend returns an
  // array of assignments (one per class). Handle both shapes.
  const assignmentResult = await createAssignmentViaAPI(page, {
    exerciseId,
    classIds: ["e2e-test-class"],
  });

  // If the assignment id came back undefined, re-fetch from the raw API response
  let assignmentId = assignmentResult.id;
  if (!assignmentId) {
    // The backend returns { data: [{id, ...}] } — extract from array
    const aToken = await getAuthToken(page);
    const aRes = await page.request.get(
      `${getBackendUrl()}/api/v1/assignments?exerciseId=${exerciseId}`,
      { headers: { Authorization: `Bearer ${aToken}` } }
    );
    if (aRes.ok()) {
      const aBody = await aRes.json();
      const items = aBody.data?.items ?? aBody.data ?? aBody;
      const list = Array.isArray(items) ? items : [];
      assignmentId = list[0]?.id;
    }
  }

  if (!assignmentId) {
    throw new Error("Failed to get assignment ID after creation");
  }

  // 6. Submit a writing answer as STUDENT via direct API (no UI login needed).
  // Use Firebase Auth emulator REST API to get student token directly —
  // this avoids creating a new browser context + UI login, saving ~30-60s.
  const studentToken = await getTokenViaEmulator(
    TEST_USERS.STUDENT.email,
    TEST_USERS.STUDENT.password
  );

  const sampleAnswer = `Technology has fundamentally transformed modern education in numerous ways.
From interactive whiteboards to online learning platforms, digital tools have made education more
accessible and engaging than ever before. Students can now access vast libraries of information
from anywhere in the world, collaborate with peers across borders, and learn at their own pace.

One of the most significant changes is the rise of personalized learning. Adaptive software can
identify a student's strengths and weaknesses, tailoring content to their individual needs. This
approach helps ensure that no student is left behind while also challenging those who are ready
to advance. Furthermore, technology has made education more inclusive, providing tools for students
with disabilities to participate fully in classroom activities.

However, it is important to recognize the challenges that come with technology in education. Not
all students have equal access to digital devices and reliable internet connections, creating a
digital divide. Additionally, excessive screen time can affect students' physical and mental health.
Teachers must be properly trained to integrate technology effectively into their lessons.

In conclusion, while technology offers tremendous benefits for education, it must be implemented
thoughtfully and equitably to truly enhance learning outcomes for all students.`;

  const { submissionId } = await submitWritingAnswerWithToken(
    page,
    assignmentId,
    sampleAnswer,
    studentToken
  );

  // 7. Back as teacher — trigger analysis (non-blocking, tests will check status)
  await triggerAndWaitForAnalysis(page, submissionId, 5000).catch(() => {
    // AI may not be available — that's OK, tests handle this
  });

  return {
    exerciseId,
    assignmentId,
    submissionId,
    sectionId,
    questionId,
  };
}

/**
 * Clean up grading test data. Silently ignores errors.
 */
export async function cleanupGradingTestData(
  page: Page,
  ids: GradingTestIds
): Promise<void> {
  await cleanupAssignment(page, ids.assignmentId);
  await cleanupExercise(page, ids.exerciseId);
}

/**
 * Finalize grading for a submission via API.
 */
export async function finalizeGradingViaAPI(
  page: Page,
  submissionId: string,
  score?: number
): Promise<void> {
  const token = await getAuthToken(page);
  const response = await page.request.post(
    `${getBackendUrl()}/api/v1/grading/submissions/${submissionId}/finalize`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        teacherFinalScore: score ?? null,
        teacherCriteriaScores: null,
        teacherGeneralFeedback: null,
      },
    }
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to finalize grading: ${response.status()} ${body}`);
  }
}

/**
 * Create a teacher comment on a submission via API.
 */
export async function createCommentViaAPI(
  page: Page,
  submissionId: string,
  content: string,
  opts?: {
    visibility?: "private" | "student_facing";
    startOffset?: number;
    endOffset?: number;
    originalContextSnippet?: string;
  }
): Promise<{ commentId: string }> {
  const token = await getAuthToken(page);
  const response = await page.request.post(
    `${getBackendUrl()}/api/v1/grading/submissions/${submissionId}/comments`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        content,
        visibility: opts?.visibility ?? "student_facing",
        startOffset: opts?.startOffset ?? null,
        endOffset: opts?.endOffset ?? null,
        originalContextSnippet: opts?.originalContextSnippet ?? null,
      },
    }
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to create comment: ${response.status()} ${body}`);
  }
  const body = await response.json();
  const data = body.data ?? body;
  return { commentId: data.id };
}

/**
 * Approve all pending feedback items via bulk API.
 */
export async function bulkApproveFeedbackViaAPI(
  page: Page,
  submissionId: string
): Promise<void> {
  const token = await getAuthToken(page);
  const response = await page.request.patch(
    `${getBackendUrl()}/api/v1/grading/submissions/${submissionId}/feedback/items/bulk`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { action: "approve_remaining" },
    }
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Failed to bulk approve: ${response.status()} ${body}`);
  }
}

/**
 * Playwright test fixture with automatic grading test data setup/teardown.
 * Handles login failures gracefully — tests receive empty IDs and can skip.
 */
/**
 * Inject an auth token into the page's localStorage without UI login.
 * Intercepts the sign-in page to return a blank HTML page — this prevents
 * the app's onAuthStateChanged from running and clearing the token.
 */
export async function injectAuthToken(page: Page, token: string): Promise<void> {
  const appUrl = process.env.E2E_BASE_URL || "http://localhost:5173";
  // Return a blank page on the app origin to avoid loading app JS
  // (which would trigger onAuthStateChanged and clear localStorage)
  await page.route("**/sign-in", (route) =>
    route.fulfill({ body: "<html></html>", contentType: "text/html" })
  );
  await page.goto(`${appUrl}/sign-in`);
  await page.evaluate((t) => localStorage.setItem("token", t), token);
  await page.unroute("**/sign-in");
}

async function authenticateSetupPage(page: Page): Promise<void> {
  try {
    const token = await getTokenViaEmulator(TEST_USERS.TEACHER.email, TEST_USERS.TEACHER.password);
    await injectAuthToken(page, token);
  } catch {
    await loginAs(page, TEST_USERS.TEACHER);
  }
}

export const gradingTest = baseTest.extend<{}, { gradingIds: GradingTestIds }>({
  gradingIds: [async ({ browser }, use) => {
    let ids: GradingTestIds | null = null;

    // Retry fixture setup up to 3 times to handle transient backend load.
    // Worker-scoped: data is created once per worker and shared across all
    // tests in the serial suite, reducing API calls from ~30 to ~3.
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const setupContext = await browser.newContext();
        const setupPage = await setupContext.newPage();
        await authenticateSetupPage(setupPage);
        ids = await createGradingTestData(setupPage);
        await setupContext.close();
        break;
      } catch {
        if (attempt < 3) {
          // Wait before retrying (longer backoff for later attempts)
          await new Promise((r) => setTimeout(r, 3000 * attempt));
        }
      }
    }

    await use(ids ?? { exerciseId: "", assignmentId: "", submissionId: "", sectionId: "", questionId: "" });

    if (ids) {
      try {
        const cleanupContext = await browser.newContext();
        const cleanupPage = await cleanupContext.newPage();
        await authenticateSetupPage(cleanupPage);
        await cleanupGradingTestData(cleanupPage, ids);
        await cleanupContext.close();
      } catch {
        // Cleanup failures are non-critical
      }
    }
  }, { scope: "worker" }],
});
