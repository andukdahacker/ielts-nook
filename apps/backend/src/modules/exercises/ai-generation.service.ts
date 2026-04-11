import { GoogleGenAI } from "@google/genai";
import { Prisma, PrismaClient, getTenantedClient } from "@workspace/db";
import type {
  AIGenerationJob,
  AIGenerationJobStatus,
  DifficultyLevel,
  QuestionTypeRequest,
} from "@workspace/types";
import { z } from "zod";
import { AppError } from "../../errors/app-error.js";
import { inngest } from "../inngest/client.js";
import type { GeneratedSection } from "./ai-prompts.js";
import { getPromptAndSchema, transformToExerciseFormat } from "./ai-prompts.js";

export interface AIGenerationConfig {
  geminiApiKey?: string;
  geminiModel?: string;
}

export class AIGenerationService {
  private genai: GoogleGenAI | null = null;
  private readonly geminiModel: string;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly config: AIGenerationConfig = {},
  ) {
    this.geminiModel = config.geminiModel || "gemini-2.0-flash";
  }

  private getGenAI(): GoogleGenAI {
    if (!this.genai) {
      const apiKey = this.config.geminiApiKey;
      if (!apiKey) {
        throw AppError.badRequest(
          "GEMINI_API_KEY is not configured. AI generation is unavailable.",
        );
      }
      this.genai = new GoogleGenAI({ apiKey });
    }
    return this.genai;
  }

  private toJob(row: {
    id: string;
    centerId: string;
    exerciseId: string;
    status: string;
    questionTypes: unknown;
    difficulty: string | null;
    error: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AIGenerationJob {
    return {
      id: row.id,
      centerId: row.centerId,
      exerciseId: row.exerciseId,
      status: row.status as AIGenerationJobStatus,
      questionTypes: row.questionTypes as QuestionTypeRequest[],
      difficulty: (row.difficulty as DifficultyLevel) ?? undefined,
      error: row.error,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async requestGeneration(
    centerId: string,
    exerciseId: string,
    questionTypes: QuestionTypeRequest[],
    difficulty: DifficultyLevel = "medium",
  ): Promise<AIGenerationJob> {
    const db = getTenantedClient(this.prisma, centerId);

    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });
    if (!exercise) throw AppError.notFound("Exercise not found");
    if (exercise.status !== "DRAFT")
      throw AppError.badRequest(
        "Can only generate questions for draft exercises",
      );
    if (exercise.skill !== "READING")
      throw AppError.badRequest(
        "AI generation currently only supports Reading exercises",
      );
    if (!exercise.passageContent)
      throw AppError.badRequest(
        "Exercise must have passage content before generating questions",
      );

    const job = await db.aIGenerationJob.create({
      data: {
        centerId,
        exerciseId,
        status: "pending",
        questionTypes: questionTypes as unknown as Prisma.InputJsonValue,
        difficulty,
      },
    });

    await inngest.send({
      name: "exercises/generate-questions",
      data: {
        jobId: job.id,
        exerciseId,
        centerId,
        passageText: exercise.passageContent,
        questionTypes: questionTypes.map((qt) => ({
          type: qt.type,
          count: qt.count,
        })),
        difficulty,
      },
    });

    return this.toJob(job);
  }

  async getJobStatus(centerId: string, jobId: string): Promise<AIGenerationJob> {
    const db = getTenantedClient(this.prisma, centerId);
    const job = await db.aIGenerationJob.findUnique({
      where: { id: jobId },
    });
    if (!job) throw AppError.notFound("Generation job not found");
    return this.toJob(job);
  }

  async getLatestJob(centerId: string, exerciseId: string): Promise<AIGenerationJob | null> {
    const db = getTenantedClient(this.prisma, centerId);
    const job = await db.aIGenerationJob.findFirst({
      where: { exerciseId },
      orderBy: { createdAt: "desc" },
    });
    return job ? this.toJob(job) : null;
  }

  async generateQuestionsForType(
    passageText: string,
    questionType: string,
    count: number,
    difficulty: string,
  ): Promise<GeneratedSection> {
    const { systemPrompt, schema } = getPromptAndSchema(
      questionType,
      count,
      difficulty,
    );

    const model = this.geminiModel;
    const response = await this.getGenAI().models.generateContent({
      model,
      contents: `${systemPrompt}\n\nREADING PASSAGE:\n\n${passageText}\n\nGenerate exactly ${count} questions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: z.toJSONSchema(schema) as Record<string, unknown>,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI generation returned no results");

    const parsed = schema.parse(JSON.parse(text)) as Record<string, unknown>;
    return transformToExerciseFormat(questionType, parsed);
  }

  async requestRegeneration(
    centerId: string,
    exerciseId: string,
    sectionId: string,
    difficulty?: DifficultyLevel,
  ): Promise<AIGenerationJob> {
    const db = getTenantedClient(this.prisma, centerId);

    const exercise = await db.exercise.findUnique({
      where: { id: exerciseId },
    });
    if (!exercise) throw AppError.notFound("Exercise not found");
    if (exercise.status !== "DRAFT")
      throw AppError.badRequest(
        "Can only regenerate questions for draft exercises",
      );
    if (!exercise.passageContent)
      throw AppError.badRequest(
        "Exercise must have passage content for regeneration",
      );

    const section = await db.questionSection.findUnique({
      where: { id: sectionId },
      include: { questions: true },
    });
    if (!section || section.exerciseId !== exerciseId)
      throw AppError.notFound("Section not found");

    const questionCount = section.questions?.length ?? 5;

    const job = await db.aIGenerationJob.create({
      data: {
        centerId,
        exerciseId,
        status: "pending",
        questionTypes: [
          { type: section.sectionType, count: questionCount },
        ] as unknown as Prisma.InputJsonValue,
        difficulty: difficulty ?? null,
      },
    });

    // Delete existing section and its questions before regeneration
    await db.questionSection.delete({ where: { id: sectionId } });

    await inngest.send({
      name: "exercises/generate-questions",
      data: {
        jobId: job.id,
        exerciseId,
        centerId,
        passageText: exercise.passageContent,
        questionTypes: [{ type: section.sectionType, count: questionCount }],
        difficulty: difficulty ?? "medium",
      },
    });

    return this.toJob(job);
  }
}
