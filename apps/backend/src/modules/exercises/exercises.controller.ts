import type {
  AutosaveExerciseInput,
  CreateExerciseInput,
  Exercise,
  ExerciseListResponse,
  ExerciseResponse,
  UpdateExerciseInput,
} from "@workspace/types";
import { JwtPayload } from "jsonwebtoken";
import { AppError } from "../../errors/app-error.js";
import { ExercisesService } from "./exercises.service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenTags(exercise: any) {
  const { tagAssignments, ...rest } = exercise;
  return {
    ...rest,
    tags:
      tagAssignments?.map(
        (a: { tag: { id: string; name: string } }) => a.tag,
      ) ?? [],
  };
}

export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  async listExercises(
    user: JwtPayload,
    filters?: {
      skill?: string;
      status?: string;
      bandLevel?: string;
      tagIds?: string[];
      questionType?: string;
      excludeArchived?: boolean;
    },
  ): Promise<ExerciseListResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercises = await this.exercisesService.listExercises(
      centerId,
      filters,
    );
    return {
      data: exercises.map(flattenTags),
      message: "Exercises retrieved successfully",
    };
  }

  async getExercise(id: string, user: JwtPayload): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.getExercise(centerId, id);
    return {
      data: flattenTags(exercise),
      message: "Exercise retrieved successfully",
    };
  }

  async createExercise(
    input: CreateExerciseInput,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.createExercise(
      centerId,
      input,
      user.uid,
    );
    return {
      data: flattenTags(exercise),
      message: "Exercise created successfully",
    };
  }

  async updateExercise(
    id: string,
    input: UpdateExerciseInput,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.updateExercise(
      centerId,
      id,
      input,
    );
    return {
      data: flattenTags(exercise),
      message: "Exercise updated successfully",
    };
  }

  async autosaveExercise(
    id: string,
    input: AutosaveExerciseInput,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.autosaveExercise(
      centerId,
      id,
      input,
    );
    return {
      data: flattenTags(exercise),
      message: "Exercise auto-saved successfully",
    };
  }

  async deleteExercise(
    id: string,
    user: JwtPayload,
  ): Promise<{ message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    await this.exercisesService.deleteExercise(centerId, id);
    return {
      message: "Exercise deleted successfully",
    };
  }

  async publishExercise(
    id: string,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.publishExercise(centerId, id);
    return {
      data: flattenTags(exercise),
      message: "Exercise published successfully",
    };
  }

  async uploadAudio(
    exerciseId: string,
    fileBuffer: Buffer,
    contentType: string,
    user: JwtPayload,
  ): Promise<{ data: { audioUrl: string }; message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const result = await this.exercisesService.uploadAudio(
      centerId,
      exerciseId,
      fileBuffer,
      contentType,
    );
    return {
      data: result,
      message: "Audio uploaded successfully",
    };
  }

  async deleteAudio(
    exerciseId: string,
    user: JwtPayload,
  ): Promise<{ message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    await this.exercisesService.deleteAudio(centerId, exerciseId);
    return {
      message: "Audio removed successfully",
    };
  }

  async uploadStimulusImage(
    exerciseId: string,
    fileBuffer: Buffer,
    contentType: string,
    user: JwtPayload,
  ): Promise<{ data: { stimulusImageUrl: string }; message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const result = await this.exercisesService.uploadStimulusImage(
      centerId,
      exerciseId,
      fileBuffer,
      contentType,
    );
    return {
      data: result,
      message: "Stimulus image uploaded successfully",
    };
  }

  async deleteStimulusImage(
    exerciseId: string,
    user: JwtPayload,
  ): Promise<{ message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    await this.exercisesService.deleteStimulusImage(centerId, exerciseId);
    return {
      message: "Stimulus image removed successfully",
    };
  }

  async hasSubmissions(
    exerciseId: string,
    user: JwtPayload,
  ): Promise<{ data: boolean }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const result = await this.exercisesService.hasExerciseSubmissions(
      centerId,
      exerciseId,
    );
    return { data: result };
  }

  async archiveExercise(
    id: string,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.archiveExercise(centerId, id);
    return {
      data: flattenTags(exercise),
      message: "Exercise archived successfully",
    };
  }

  async duplicateExercise(
    id: string,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.duplicateExercise(centerId, id, user.uid);
    return {
      data: flattenTags(exercise),
      message: "Exercise duplicated successfully",
    };
  }

  async restoreExercise(
    id: string,
    user: JwtPayload,
  ): Promise<ExerciseResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercise = await this.exercisesService.restoreExercise(centerId, id);
    return {
      data: flattenTags(exercise),
      message: "Exercise restored to draft",
    };
  }

  async bulkArchive(
    exerciseIds: string[],
    user: JwtPayload,
  ): Promise<{ data: { count: number }; message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const count = await this.exercisesService.bulkArchive(centerId, exerciseIds);
    return { data: { count }, message: `${count} exercises archived` };
  }

  async bulkDuplicate(
    exerciseIds: string[],
    user: JwtPayload,
  ): Promise<{ data: Exercise[]; message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const exercises = await this.exercisesService.bulkDuplicate(centerId, exerciseIds, user.uid);
    return { data: exercises.map(flattenTags), message: `${exercises.length} exercises duplicated` };
  }

  async bulkTag(
    exerciseIds: string[],
    tagIds: string[],
    user: JwtPayload,
  ): Promise<{ data: { count: number }; message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const count = await this.exercisesService.bulkTag(centerId, exerciseIds, tagIds);
    return { data: { count }, message: `${count} tag assignments added` };
  }
}
