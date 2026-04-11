import { Prisma, PrismaClient, getTenantedClient } from "@workspace/db";
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
  AutosaveExerciseInput,
  Exercise,
} from "@workspace/types";
import type { Storage } from "firebase-admin/storage";
import { AppError } from "../../errors/app-error.js";
import { ModerationService } from "../moderation/moderation.service.js";

const EXERCISE_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  sections: {
    orderBy: { orderIndex: "asc" as const },
    include: {
      questions: { orderBy: { orderIndex: "asc" as const } },
    },
  },
  tagAssignments: {
    select: { tag: { select: { id: true, name: true } } },
  },
};

export class ExercisesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly firebaseStorage?: Storage,
    private readonly bucketName?: string,
  ) {}

  private async verifyDraftExercise(
    db: ReturnType<typeof getTenantedClient>,
    id: string,
    errorMessage: string,
  ) {
    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) {
      throw AppError.notFound("Exercise not found");
    }
    if (exercise.status !== "DRAFT") {
      throw AppError.badRequest(errorMessage);
    }
    return exercise;
  }

  /**
   * Check if an exercise is editable: DRAFT, or PUBLISHED with zero submissions.
   */
  async isExerciseEditable(
    centerId: string,
    exerciseId: string,
  ): Promise<boolean> {
    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await db.exercise.findUnique({ where: { id: exerciseId } });
    if (!exercise) throw AppError.notFound("Exercise not found");
    if (exercise.status === "DRAFT") return true;
    if (exercise.status === "PUBLISHED") {
      return !(await this.hasExerciseSubmissions(centerId, exerciseId));
    }
    return false;
  }

  private async verifyEditable(
    db: ReturnType<typeof getTenantedClient>,
    centerId: string,
    id: string,
    errorMessage: string,
  ) {
    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw AppError.notFound("Exercise not found");
    if (exercise.status === "DRAFT") return exercise;
    if (exercise.status === "PUBLISHED") {
      const hasSubs = await this.hasExerciseSubmissions(centerId, id);
      if (!hasSubs) return exercise;
    }
    throw AppError.badRequest(errorMessage);
  }

  async listExercises(
    centerId: string,
    filters?: {
      skill?: string;
      status?: string;
      bandLevel?: string;
      tagIds?: string[];
      questionType?: string;
      excludeArchived?: boolean;
    },
  ): Promise<Exercise[]> {
    const db = getTenantedClient(this.prisma, centerId);

    const where: Record<string, unknown> = {};
    if (filters?.skill) where.skill = filters.skill;
    if (filters?.status) where.status = filters.status;
    if (filters?.bandLevel) where.bandLevel = filters.bandLevel;
    if (filters?.tagIds?.length) {
      where.tagAssignments = { some: { tagId: { in: filters.tagIds } } };
    }
    if (filters?.questionType) {
      where.sections = { some: { sectionType: filters.questionType } };
    }
    if (filters?.excludeArchived && !filters?.status) {
      where.status = { not: "ARCHIVED" };
    }

    return await db.exercise.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { questions: true } },
          },
        },
        tagAssignments: {
          select: { tag: { select: { id: true, name: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getExercise(centerId: string, id: string): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);

    const exercise = await db.exercise.findUnique({
      where: { id },
      include: EXERCISE_INCLUDE,
    });

    if (!exercise) {
      throw AppError.notFound("Exercise not found");
    }

    return exercise;
  }

  async createExercise(
    centerId: string,
    input: CreateExerciseInput,
    firebaseUid: string,
  ): Promise<Exercise> {
    // Resolve Firebase UID to Prisma User ID via AuthAccount
    const authAccount = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: "FIREBASE",
          providerUserId: firebaseUid,
        },
      },
    });
    if (!authAccount) {
      throw AppError.notFound("User account not found");
    }

    const db = getTenantedClient(this.prisma, centerId);

    return await db.exercise.create({
      data: {
        centerId,
        title: input.title,
        instructions: input.instructions ?? null,
        skill: input.skill,
        passageContent: input.passageContent ?? null,
        passageFormat: input.passageFormat ?? null,
        caseSensitive: input.caseSensitive,
        partialCredit: input.partialCredit,
        playbackMode: input.playbackMode ?? null,
        showTranscriptAfterSubmit: input.showTranscriptAfterSubmit ?? false,
        writingPrompt: input.writingPrompt ?? null,
        letterTone: input.letterTone ?? null,
        wordCountMin: input.wordCountMin ?? null,
        wordCountMax: input.wordCountMax ?? null,
        wordCountMode: input.wordCountMode ?? null,
        sampleResponse: input.sampleResponse ?? null,
        showSampleAfterGrading: input.showSampleAfterGrading ?? false,
        speakingPrepTime: input.speakingPrepTime ?? null,
        speakingTime: input.speakingTime ?? null,
        maxRecordingDuration: input.maxRecordingDuration ?? null,
        enableTranscription: input.enableTranscription ?? false,
        timeLimit: input.timeLimit ?? null,
        timerPosition: input.timerPosition ?? null,
        warningAlerts: input.warningAlerts ?? Prisma.DbNull,
        autoSubmitOnExpiry: input.autoSubmitOnExpiry ?? true,
        gracePeriodSeconds: input.gracePeriodSeconds ?? null,
        enablePause: input.enablePause ?? false,
        bandLevel: input.bandLevel ?? null,
        createdById: authAccount.userId,
      },
      include: EXERCISE_INCLUDE,
    });
  }

  async hasExerciseSubmissions(
    centerId: string,
    exerciseId: string,
  ): Promise<boolean> {
    const db = getTenantedClient(this.prisma, centerId);
    const count = await db.submission.count({
      where: { assignment: { exerciseId } },
    });
    return count > 0;
  }

  private async applyExerciseUpdate(
    db: ReturnType<typeof getTenantedClient>,
    id: string,
    input: UpdateExerciseInput | AutosaveExerciseInput,
    exercise: { wordCountMin: number | null; wordCountMax: number | null },
  ): Promise<Exercise> {
    // Cross-field validation: wordCountMax >= wordCountMin after merging with DB state
    const effectiveMin =
      "wordCountMin" in input && input.wordCountMin !== undefined
        ? input.wordCountMin
        : exercise.wordCountMin;
    const effectiveMax =
      "wordCountMax" in input && input.wordCountMax !== undefined
        ? input.wordCountMax
        : exercise.wordCountMax;
    if (
      effectiveMin != null &&
      effectiveMax != null &&
      effectiveMax < effectiveMin
    ) {
      throw AppError.badRequest("wordCountMax must be >= wordCountMin");
    }

    return await db.exercise.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.instructions !== undefined && {
          instructions: input.instructions,
        }),
        ...(input.passageContent !== undefined && {
          passageContent: input.passageContent,
        }),
        ...(input.passageFormat !== undefined && {
          passageFormat: input.passageFormat,
        }),
        ...("caseSensitive" in input &&
          input.caseSensitive !== undefined && {
            caseSensitive: input.caseSensitive,
          }),
        ...("partialCredit" in input &&
          input.partialCredit !== undefined && {
            partialCredit: input.partialCredit,
          }),
        ...("audioDuration" in input &&
          input.audioDuration !== undefined && {
            audioDuration: input.audioDuration,
          }),
        ...("playbackMode" in input &&
          input.playbackMode !== undefined && {
            playbackMode: input.playbackMode,
          }),
        ...("audioSections" in input &&
          input.audioSections !== undefined && {
            audioSections:
              input.audioSections === null
                ? Prisma.DbNull
                : (input.audioSections as Prisma.InputJsonValue),
          }),
        ...("showTranscriptAfterSubmit" in input &&
          input.showTranscriptAfterSubmit !== undefined && {
            showTranscriptAfterSubmit: input.showTranscriptAfterSubmit,
          }),
        ...("writingPrompt" in input &&
          input.writingPrompt !== undefined && {
            writingPrompt: input.writingPrompt,
          }),
        ...("letterTone" in input &&
          input.letterTone !== undefined && {
            letterTone: input.letterTone,
          }),
        ...("wordCountMin" in input &&
          input.wordCountMin !== undefined && {
            wordCountMin: input.wordCountMin,
          }),
        ...("wordCountMax" in input &&
          input.wordCountMax !== undefined && {
            wordCountMax: input.wordCountMax,
          }),
        ...("wordCountMode" in input &&
          input.wordCountMode !== undefined && {
            wordCountMode: input.wordCountMode,
          }),
        ...("sampleResponse" in input &&
          input.sampleResponse !== undefined && {
            sampleResponse: input.sampleResponse,
          }),
        ...("showSampleAfterGrading" in input &&
          input.showSampleAfterGrading !== undefined && {
            showSampleAfterGrading: input.showSampleAfterGrading,
          }),
        ...("speakingPrepTime" in input &&
          input.speakingPrepTime !== undefined && {
            speakingPrepTime: input.speakingPrepTime,
          }),
        ...("speakingTime" in input &&
          input.speakingTime !== undefined && {
            speakingTime: input.speakingTime,
          }),
        ...("maxRecordingDuration" in input &&
          input.maxRecordingDuration !== undefined && {
            maxRecordingDuration: input.maxRecordingDuration,
          }),
        ...("enableTranscription" in input &&
          input.enableTranscription !== undefined && {
            enableTranscription: input.enableTranscription,
          }),
        ...("timeLimit" in input &&
          input.timeLimit !== undefined && {
            timeLimit: input.timeLimit,
          }),
        ...("timerPosition" in input &&
          input.timerPosition !== undefined && {
            timerPosition: input.timerPosition,
          }),
        ...("warningAlerts" in input &&
          input.warningAlerts !== undefined && {
            warningAlerts:
              input.warningAlerts === null
                ? Prisma.DbNull
                : (input.warningAlerts as Prisma.InputJsonValue),
          }),
        ...("autoSubmitOnExpiry" in input &&
          input.autoSubmitOnExpiry !== undefined && {
            autoSubmitOnExpiry: input.autoSubmitOnExpiry,
          }),
        ...("gracePeriodSeconds" in input &&
          input.gracePeriodSeconds !== undefined && {
            gracePeriodSeconds: input.gracePeriodSeconds,
          }),
        ...("enablePause" in input &&
          input.enablePause !== undefined && {
            enablePause: input.enablePause,
          }),
        ...("bandLevel" in input &&
          input.bandLevel !== undefined && {
            bandLevel: input.bandLevel,
          }),
      },
      include: EXERCISE_INCLUDE,
    });
  }

  private async updateDraftExercise(
    centerId: string,
    id: string,
    input: UpdateExerciseInput | AutosaveExerciseInput,
    errorMessage: string,
  ): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await this.verifyDraftExercise(db, id, errorMessage);
    return this.applyExerciseUpdate(db, id, input, exercise);
  }

  async updateExercise(
    centerId: string,
    id: string,
    input: UpdateExerciseInput,
  ): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw AppError.notFound("Exercise not found");

    if (exercise.status === "ARCHIVED") {
      throw AppError.badRequest("Archived exercises cannot be updated");
    }

    if (exercise.status === "PUBLISHED") {
      // Use transaction to prevent TOCTOU race between submission check and update
      return await db.$transaction(async (tx) => {
        const subCount = await tx.submission.count({
          where: { assignment: { exerciseId: id } },
        });
        if (subCount > 0) {
          const allowedKeys = ["title", "bandLevel"];
          const inputKeys = Object.keys(input).filter(
            (k) => input[k as keyof typeof input] !== undefined,
          );
          const disallowed = inputKeys.filter((k) => !allowedKeys.includes(k));
          if (disallowed.length > 0) {
            throw AppError.badRequest(
              `Published exercises with submissions only allow updating: ${allowedKeys.join(", ")}. ` +
              `Disallowed fields: ${disallowed.join(", ")}`,
            );
          }
          return await tx.exercise.update({
            where: { id },
            data: { title: input.title, bandLevel: input.bandLevel },
            include: EXERCISE_INCLUDE,
          });
        }
        // No submissions yet — allow full edit like DRAFT
        return await this.applyExerciseUpdate(tx as unknown as ReturnType<typeof getTenantedClient>, id, input, exercise);
      });
    }

    return this.updateDraftExercise(
      centerId,
      id,
      input,
      "Only draft exercises can be fully edited",
    );
  }

  async autosaveExercise(
    centerId: string,
    id: string,
    input: AutosaveExerciseInput,
  ): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw AppError.notFound("Exercise not found");

    if (exercise.status === "PUBLISHED") {
      // Use transaction to prevent TOCTOU race between submission check and update
      return await db.$transaction(async (tx) => {
        const subCount = await tx.submission.count({
          where: { assignment: { exerciseId: id } },
        });
        if (subCount > 0) {
          throw AppError.badRequest(
            "Cannot autosave: exercise has student submissions",
          );
        }
        return await this.applyExerciseUpdate(tx as unknown as ReturnType<typeof getTenantedClient>, id, input, exercise);
      });
    }

    return this.updateDraftExercise(
      centerId,
      id,
      input,
      "Only draft exercises can be auto-saved",
    );
  }

  async duplicateExercise(centerId: string, id: string, firebaseUid: string): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);

    const authAccount = await db.authAccount.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
    });

    const source = await db.exercise.findUnique({
      where: { id },
      include: {
        ...EXERCISE_INCLUDE,
        tagAssignments: { select: { tagId: true } },
      },
    });
    if (!source) throw AppError.notFound("Exercise not found");

    const duplicatedId = await db.$transaction(async (tx) => {
      // NOTE: Copy ALL exercise fields explicitly. If new fields are added to the Exercise model, update this list.
      const newExercise = await tx.exercise.create({
        data: {
          centerId,
          title: `Copy of ${source.title}`,
          instructions: source.instructions,
          skill: source.skill,
          status: "DRAFT",
          passageContent: source.passageContent,
          passageFormat: source.passageFormat,
          passageSourceType: source.passageSourceType,
          passageSourceUrl: source.passageSourceUrl,
          caseSensitive: source.caseSensitive,
          partialCredit: source.partialCredit,
          audioUrl: source.audioUrl,
          audioDuration: source.audioDuration,
          playbackMode: source.playbackMode,
          audioSections: source.audioSections ?? Prisma.DbNull,
          showTranscriptAfterSubmit: source.showTranscriptAfterSubmit,
          stimulusImageUrl: source.stimulusImageUrl,
          writingPrompt: source.writingPrompt,
          letterTone: source.letterTone,
          wordCountMin: source.wordCountMin,
          wordCountMax: source.wordCountMax,
          wordCountMode: source.wordCountMode,
          sampleResponse: source.sampleResponse,
          showSampleAfterGrading: source.showSampleAfterGrading,
          speakingPrepTime: source.speakingPrepTime,
          speakingTime: source.speakingTime,
          maxRecordingDuration: source.maxRecordingDuration,
          enableTranscription: source.enableTranscription,
          timeLimit: source.timeLimit,
          timerPosition: source.timerPosition,
          warningAlerts: source.warningAlerts ?? Prisma.DbNull,
          autoSubmitOnExpiry: source.autoSubmitOnExpiry,
          gracePeriodSeconds: source.gracePeriodSeconds,
          enablePause: source.enablePause,
          bandLevel: source.bandLevel,
          createdById: authAccount.userId,
        },
      });

      for (const section of source.sections ?? []) {
        const newSection = await tx.questionSection.create({
          data: {
            centerId,
            exerciseId: newExercise.id,
            sectionType: section.sectionType,
            instructions: section.instructions,
            orderIndex: section.orderIndex,
            audioSectionIndex: section.audioSectionIndex,
            sectionTimeLimit: section.sectionTimeLimit,
          },
        });
        for (const question of section.questions ?? []) {
          await tx.question.create({
            data: {
              centerId,
              sectionId: newSection.id,
              questionText: question.questionText,
              questionType: question.questionType,
              options: question.options ?? Prisma.DbNull,
              correctAnswer: question.correctAnswer ?? Prisma.DbNull,
              orderIndex: question.orderIndex,
              wordLimit: question.wordLimit,
            },
          });
        }
      }

      const tagIds = (source.tagAssignments ?? []).map((ta: { tagId: string }) => ta.tagId);
      if (tagIds.length > 0) {
        await tx.exerciseTagAssignment.createMany({
          data: tagIds.map((tagId: string) => ({
            exerciseId: newExercise.id,
            tagId,
            centerId,
          })),
        });
      }

      return newExercise.id;
    });

    // Refetch with includes outside the transaction — findUniqueOrThrow
    // inside db.$transaction is rewritten by getTenantedClient to use the
    // base (non-transactional) Prisma client, which can't see uncommitted data.
    const duplicated = await db.exercise.findFirst({
      where: { id: duplicatedId },
      include: EXERCISE_INCLUDE,
    });
    if (!duplicated) throw new Error("Exercise not found after duplication");
    return duplicated;
  }

  async deleteExercise(centerId: string, id: string): Promise<void> {
    const db = getTenantedClient(this.prisma, centerId);

    await this.verifyDraftExercise(
      db,
      id,
      "Only draft exercises can be deleted",
    );

    await db.exercise.delete({ where: { id } });
  }

  async publishExercise(centerId: string, id: string): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);

    await this.verifyDraftExercise(
      db,
      id,
      "Only draft exercises can be published",
    );

    // Content moderation scan before publish (synchronous, blocking)
    const exerciseWithContent = await db.exercise.findUnique({
      where: { id },
      include: { sections: { include: { questions: true } } },
    });
    if (exerciseWithContent) {
      const textParts = [
        exerciseWithContent.title,
        exerciseWithContent.passageContent ?? "",
        exerciseWithContent.instructions ?? "",
        exerciseWithContent.writingPrompt ?? "",
        ...exerciseWithContent.sections.flatMap((s) => [
          s.instructions ?? "",
          ...s.questions.map((q) => q.questionText ?? ""),
        ]),
      ];
      const fullText = textParts.filter(Boolean).join(" ");
      if (fullText.length > 0) {
        const moderationService = new ModerationService(this.prisma);
        const scanResult = await moderationService.scanContent(fullText, centerId);
        if (scanResult.matches.length > 0) {
          // Check for existing pending flag to avoid duplicates on repeated publish attempts
          const existingFlag = await db.contentModerationFlag.findFirst({
            where: { contentId: id, contentType: "EXERCISE", status: "PENDING" },
          });
          let flag = existingFlag;
          if (!existingFlag) {
            flag = await moderationService.flagContent({
              centerId,
              contentType: "EXERCISE",
              contentId: exerciseWithContent.id,
              flaggedText: fullText,
              matchedTerms: scanResult.matches,
            });
          }
          throw AppError.conflict(
            `Content flagged for compliance review. Publishing blocked. Matched terms: ${scanResult.matches.join(", ")}. Flag ID: ${flag?.id ?? "unknown"}`,
          );
        }
      }
    }

    return await db.exercise.update({
      where: { id },
      data: { status: "PUBLISHED" },
      include: EXERCISE_INCLUDE,
    });
  }

  async archiveExercise(centerId: string, id: string): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);

    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) {
      throw AppError.notFound("Exercise not found");
    }
    if (exercise.status === "ARCHIVED") {
      throw AppError.badRequest("Exercise is already archived");
    }

    return await db.exercise.update({
      where: { id },
      data: { status: "ARCHIVED" },
      include: EXERCISE_INCLUDE,
    });
  }

  async bulkArchive(centerId: string, exerciseIds: string[]): Promise<number> {
    const db = getTenantedClient(this.prisma, centerId);
    const result = await db.exercise.updateMany({
      where: { id: { in: exerciseIds }, status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    });
    return result.count;
  }

  async bulkDuplicate(centerId: string, exerciseIds: string[], firebaseUid: string): Promise<Exercise[]> {
    const results: Exercise[] = [];
    for (const id of exerciseIds) {
      const copy = await this.duplicateExercise(centerId, id, firebaseUid);
      results.push(copy);
    }
    return results;
  }

  async bulkTag(centerId: string, exerciseIds: string[], tagIds: string[]): Promise<number> {
    const db = getTenantedClient(this.prisma, centerId);
    let addedCount = 0;
    for (const exerciseId of exerciseIds) {
      for (const tagId of tagIds) {
        try {
          await db.exerciseTagAssignment.create({
            data: { exerciseId, tagId, centerId },
          });
          addedCount++;
        } catch (error) {
          // Ignore P2002 unique constraint violation (tag already assigned), rethrow others
          const code = (error as { code?: string })?.code;
          if (code !== "P2002") throw error;
        }
      }
    }
    return addedCount;
  }

  async restoreExercise(centerId: string, id: string): Promise<Exercise> {
    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await db.exercise.findUnique({ where: { id } });
    if (!exercise) throw AppError.notFound("Exercise not found");
    if (exercise.status !== "ARCHIVED") {
      throw AppError.badRequest("Only archived exercises can be restored");
    }
    return await db.exercise.update({
      where: { id },
      data: { status: "DRAFT" },
      include: EXERCISE_INCLUDE,
    });
  }

  async uploadAudio(
    centerId: string,
    exerciseId: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<{ audioUrl: string }> {
    if (!this.firebaseStorage || !this.bucketName) {
      throw new Error("Storage not configured");
    }

    const db = getTenantedClient(this.prisma, centerId);
    await this.verifyEditable(
      db,
      centerId,
      exerciseId,
      "Only editable exercises can have audio uploaded",
    );

    const mimeToExt: Record<string, string> = {
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/mp4": "m4a",
      "audio/x-m4a": "m4a",
    };
    const ext = mimeToExt[contentType] ?? "mp3";
    const bucket = this.firebaseStorage.bucket(this.bucketName);
    const filePath = `exercises/${centerId}/${exerciseId}/audio/${Date.now()}.${ext}`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    await file.makePublic();

    const audioUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    await db.exercise.update({
      where: { id: exerciseId },
      data: { audioUrl },
    });

    return { audioUrl };
  }

  async deleteAudio(centerId: string, exerciseId: string): Promise<void> {
    if (!this.firebaseStorage || !this.bucketName) {
      throw new Error("Storage not configured");
    }

    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await this.verifyEditable(
      db,
      centerId,
      exerciseId,
      "Only editable exercises can have audio removed",
    );

    if (exercise.audioUrl) {
      const bucket = this.firebaseStorage.bucket(this.bucketName);
      const prefix = `https://storage.googleapis.com/${bucket.name}/`;
      if (exercise.audioUrl.startsWith(prefix)) {
        const storagePath = exercise.audioUrl.slice(prefix.length);
        try {
          await bucket.file(storagePath).delete();
        } catch {
          // File may already be deleted — continue
        }
      }
    }

    await db.exercise.update({
      where: { id: exerciseId },
      data: {
        audioUrl: null,
        audioDuration: null,
        audioSections: Prisma.DbNull,
      },
    });

    // Clear audioSectionIndex on all related question sections
    await db.questionSection.updateMany({
      where: { exerciseId },
      data: { audioSectionIndex: null },
    });
  }

  async uploadStimulusImage(
    centerId: string,
    exerciseId: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<{ stimulusImageUrl: string }> {
    if (!this.firebaseStorage || !this.bucketName) {
      throw new Error("Storage not configured");
    }

    const db = getTenantedClient(this.prisma, centerId);
    await this.verifyEditable(
      db,
      centerId,
      exerciseId,
      "Only editable exercises can have stimulus images uploaded",
    );

    const mimeToExt: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/svg+xml": "svg",
    };
    const ext = mimeToExt[contentType] ?? "png";
    const bucket = this.firebaseStorage.bucket(this.bucketName);
    const filePath = `exercises/${centerId}/${exerciseId}/stimulus-image/${Date.now()}.${ext}`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    await file.makePublic();

    const stimulusImageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    await db.exercise.update({
      where: { id: exerciseId },
      data: { stimulusImageUrl },
    });

    return { stimulusImageUrl };
  }

  async deleteStimulusImage(
    centerId: string,
    exerciseId: string,
  ): Promise<void> {
    if (!this.firebaseStorage || !this.bucketName) {
      throw new Error("Storage not configured");
    }

    const db = getTenantedClient(this.prisma, centerId);
    const exercise = await this.verifyEditable(
      db,
      centerId,
      exerciseId,
      "Only editable exercises can have stimulus images removed",
    );

    if (exercise.stimulusImageUrl) {
      const bucket = this.firebaseStorage.bucket(this.bucketName);
      const prefix = `https://storage.googleapis.com/${bucket.name}/`;
      if (exercise.stimulusImageUrl.startsWith(prefix)) {
        const storagePath = exercise.stimulusImageUrl.slice(prefix.length);
        try {
          await bucket.file(storagePath).delete();
        } catch {
          // File may already be deleted — continue
        }
      }
    }

    await db.exercise.update({
      where: { id: exerciseId },
      data: { stimulusImageUrl: null },
    });
  }

  async uploadDiagram(
    centerId: string,
    exerciseId: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.firebaseStorage || !this.bucketName) {
      throw new Error("Storage not configured");
    }

    const ext = contentType.split("/")[1]?.replace("svg+xml", "svg") ?? "png";
    const bucket = this.firebaseStorage.bucket(this.bucketName);
    const filePath = `exercises/${centerId}/${exerciseId}/diagrams/${Date.now()}.${ext}`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    await file.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  }

  async uploadDocument(
    centerId: string,
    exerciseId: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.firebaseStorage || !this.bucketName) {
      throw new Error("Storage not configured");
    }

    const db = getTenantedClient(this.prisma, centerId);
    await this.verifyEditable(
      db,
      centerId,
      exerciseId,
      "Only editable exercises can have documents uploaded",
    );

    const ext = contentType.includes("pdf") ? "pdf" : "docx";
    const bucket = this.firebaseStorage.bucket(this.bucketName);
    const filePath = `exercises/${centerId}/${exerciseId}/documents/${Date.now()}.${ext}`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    await file.makePublic();

    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  }

  async updatePassageFromDocument(
    centerId: string,
    exerciseId: string,
    extractedText: string,
    sourceType: string,
    sourceUrl: string | null,
  ): Promise<void> {
    const db = getTenantedClient(this.prisma, centerId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.exercise as any).update({
      where: { id: exerciseId },
      data: {
        passageContent: extractedText,
        passageSourceType: sourceType,
        passageSourceUrl: sourceUrl,
      },
    });
  }
}
