import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies before imports
vi.mock("../../inngest/client.js", () => ({
  inngest: {
    createFunction: vi.fn().mockReturnValue(vi.fn()),
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../../plugins/create-prisma.js", () => ({
  createPrisma: vi.fn(),
}));

vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    models = {
      generateContent: vi.fn(),
    };
  }
  return { GoogleGenAI: MockGoogleGenAI };
});

vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(),
}));

import { createPrisma } from "../../../plugins/create-prisma.js";
import { getTenantedClient } from "@workspace/db";
import { getGradingPromptAndSchema } from "../ai-grading-prompts.js";
import { classifyError } from "./analyze-submission.job.js";

describe("analyze-submission.job", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      submission: {
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      gradingJob: {
        update: vi.fn(),
      },
      submissionFeedback: {
        create: vi.fn().mockResolvedValue({ id: "fb-1" }),
        deleteMany: vi.fn(),
      },
      aIFeedbackItem: {
        create: vi.fn(),
        createMany: vi.fn(),
      },
    };

    mockPrisma = {
      $disconnect: vi.fn(),
      gradingJob: { update: vi.fn() },
      submission: { update: vi.fn() },
    };

    vi.mocked(createPrisma).mockReturnValue(mockPrisma);
    vi.mocked(getTenantedClient).mockReturnValue(mockDb);
  });

  describe("getGradingPromptAndSchema", () => {
    it("should return writing prompt with correct criteria", () => {
      const config = getGradingPromptAndSchema(
        "WRITING",
        "This is a test essay about technology.",
        "Discuss technology impact.",
      );

      expect(config.systemPrompt).toContain("Task Achievement");
      expect(config.systemPrompt).toContain("Coherence and Cohesion");
      expect(config.systemPrompt).toContain("Lexical Resource");
      expect(config.systemPrompt).toContain("Grammatical Range");
      expect(config.systemPrompt).toContain("test essay about technology");
      expect(config.schema).toBeDefined();
    });

    it("should return speaking prompt with pronunciation caveat", () => {
      const config = getGradingPromptAndSchema(
        "SPEAKING",
        "I believe that education is important.",
      );

      expect(config.systemPrompt).toContain("Fluency and Coherence");
      expect(config.systemPrompt).toContain("Pronunciation");
      expect(config.systemPrompt).toContain("limited accuracy");
      expect(config.schema).toBeDefined();
    });

    it("should include golden samples in prompt when provided", () => {
      const samples = [
        { studentWork: "Essay about technology.", teacherFeedback: "Good analysis, add examples." },
      ];
      const config = getGradingPromptAndSchema(
        "WRITING",
        "Test text.",
        undefined,
        samples,
      );

      expect(config.systemPrompt).toContain("STYLE REFERENCE");
      expect(config.systemPrompt).toContain("Essay about technology.");
      expect(config.systemPrompt).toContain("Good analysis, add examples.");
    });

    it("should not include style reference when no samples provided", () => {
      const config = getGradingPromptAndSchema(
        "WRITING",
        "Test text.",
      );

      expect(config.systemPrompt).not.toContain("STYLE REFERENCE");
    });

    it("should complete correctly when golden sample loading returns empty", () => {
      const config = getGradingPromptAndSchema(
        "WRITING",
        "Test text.",
        undefined,
        [],
      );

      expect(config.systemPrompt).not.toContain("STYLE REFERENCE");
      expect(config.systemPrompt).toContain("IELTS examiner");
    });
  });

  describe("golden sample loading step", () => {
    it("should create prisma client and query active samples by skill type", async () => {
      const goldenSamples = [
        { studentWork: "work1", teacherFeedback: "feedback1" },
      ];
      mockDb.goldenSample = {
        findMany: vi.fn().mockResolvedValue(goldenSamples),
      };

      // Simulate the load-golden-samples step logic
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, "center-1");
        const result = await db.goldenSample.findMany({
          where: { skillType: "WRITING", isActive: true },
          orderBy: { order: "asc" },
          select: { studentWork: true, teacherFeedback: true },
        });

        expect(result).toEqual(goldenSamples);
        expect(createPrisma).toHaveBeenCalled();
        expect(getTenantedClient).toHaveBeenCalledWith(prisma, "center-1");
      } finally {
        await prisma.$disconnect();
      }
    });
  });

  describe("classifyError", () => {
    it("should classify timeout errors as api_timeout", () => {
      expect(classifyError(new Error("Request timeout"))).toBe("api_timeout");
      expect(classifyError(new Error("DEADLINE_EXCEEDED"))).toBe("api_timeout");
    });

    it("should classify rate limit errors as rate_limit", () => {
      expect(classifyError(new Error("429 Too Many Requests"))).toBe("rate_limit");
      expect(classifyError(new Error("rate limit exceeded"))).toBe("rate_limit");
      expect(classifyError(new Error("quota exceeded"))).toBe("rate_limit");
    });

    it("should classify parse errors as invalid_response", () => {
      expect(classifyError(new Error("Failed to parse response"))).toBe("invalid_response");
      expect(classifyError(new Error("Unexpected token in JSON"))).toBe("invalid_response");
      expect(classifyError(new Error("schema mismatch"))).toBe("invalid_response");
    });

    it("should classify validation errors as validation_error", () => {
      expect(classifyError(new Error("zod validation failed"))).toBe("validation_error");
      expect(classifyError(new Error("invalid value"))).toBe("validation_error");
    });

    it("should classify unknown errors as other", () => {
      expect(classifyError(new Error("Something unexpected"))).toBe("other");
      expect(classifyError("string error")).toBe("other");
      expect(classifyError(null)).toBe("other");
    });
  });

  describe("job steps validation", () => {
    it("should correctly build AI response from schema", () => {
      const { schema } = getGradingPromptAndSchema("WRITING", "test text");

      const mockAIResponse = {
        overallScore: 6.5,
        criteriaScores: {
          taskAchievement: 6.0,
          coherence: 7.0,
          lexicalResource: 6.5,
          grammaticalRange: 6.5,
        },
        generalFeedback: "Well-structured essay.",
        highlights: [
          {
            type: "grammar",
            startOffset: 5,
            endOffset: 15,
            content: "Subject-verb agreement",
            suggestedFix: "are",
            severity: "error",
            confidence: 0.9,
            originalContextSnippet: "they is going",
          },
        ],
      };

      const parsed = schema.parse(mockAIResponse);
      expect(parsed).toBeTruthy();
    });

    it("should reject invalid AI response (score out of range)", () => {
      const { schema } = getGradingPromptAndSchema("WRITING", "test text");

      const invalidResponse = {
        overallScore: 15, // Invalid: > 9
        criteriaScores: { taskAchievement: 6.0, coherence: 7.0, lexicalResource: 6.5, grammaticalRange: 6.5 },
        generalFeedback: "test",
        highlights: [],
      };

      expect(() => schema.parse(invalidResponse)).toThrow();
    });
  });
});
