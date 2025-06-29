import { PrismaClient } from "@prisma/client";
import { CreateExerciseInput } from "./dto/create_exercise.input";
import { DeleteExerciseInput } from "./dto/delete_exercise.input";
import { GetExerciseInput } from "./dto/get_exercise.input";
import { GetExerciseListInput } from "./dto/get_exercise_list.input";
import { UpdateExerciseInput } from "./dto/update_exercise.input";

class ExerciseService {
  constructor(private readonly db: PrismaClient) {}

  async createExercise(input: CreateExerciseInput, centerId: string) {
    const { name, content, type } = input;
    const exercise = await this.db.exercise.create({
      data: {
        name,
        content,
        type,
        center: {
          connect: {
            id: centerId,
          },
        },
      },
    });

    return exercise;
  }

  async updateExercise(input: UpdateExerciseInput) {
    const { id, content, name } = input;
    const exercise = await this.db.exercise.update({
      where: {
        id,
      },
      data: {
        name,
        content,
      },
    });

    return exercise;
  }

  async deleteExercise(input: DeleteExerciseInput) {
    await this.db.exercise.delete({ where: { id: input.id } });
  }

  async getExercise(input: GetExerciseInput) {
    const exercise = await this.db.exercise.findUnique({
      where: {
        id: input.id,
      },
    });

    return exercise;
  }

  async getExerciseList(input: GetExerciseListInput, centerId: string) {
    const { cursor, take, type, isPublic, searchString } = input;

    const exercises = await this.db.exercise.findMany({
      take,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      where: {
        centerId: isPublic ? undefined : centerId,
        type,
        name: {
          contains: searchString,
          mode: "insensitive",
        },
      },
    });

    return exercises;
  }
}

export default ExerciseService;
