import { PrismaClient } from "@prisma/client";
import { CreateAssignmentsInput } from "./dto/create_assignments.input";
import { DeleteAssignmentsInput } from "./dto/delete_assignments.input";
import { GetAssignmentInput } from "./dto/get_assignment.input";
import { GetAssignmentsByExerciseInput } from "./dto/get_assignments_by_exercise.input";
import { GetAssignmentsByUserInput } from "./dto/get_assignments_by_user.input";
import { UpdateAssignmentInput } from "./dto/update_assignments.input";

class AssignmentService {
  constructor(private readonly db: PrismaClient) {}

  async getAssignmentsByExercise(input: GetAssignmentsByExerciseInput) {
    const assignments = await this.db.assignment.findMany({
      where: {
        exerciseId: input.exerciseId,
      },
      include: {
        classMember: {
          include: {
            user: true,
            class: true,
          },
        },
      },
    });

    return assignments;
  }

  async getAssignmentsByUser(input: GetAssignmentsByUserInput) {
    const assignments = await this.db.assignment.findMany({
      take: input.take,
      skip: input.cursor ? 1 : undefined,
      cursor: input.cursor
        ? {
            id: input.cursor,
          }
        : undefined,
      where: {
        classMemberUserId: input.userId,
      },
      include: {
        classMember: {
          include: {
            class: true,
          },
        },
        exercise: true,
      },
    });

    return assignments;
  }

  async getAssignment(input: GetAssignmentInput) {
    const assignment = await this.db.assignment.findUnique({
      where: {
        id: input.id,
      },
      include: {
        exercise: true,
        submission: true,
      },
    });

    return assignment;
  }

  async createAssigments(input: CreateAssignmentsInput) {
    return await this.db.assignment.createManyAndReturn({
      data: input.students.map((e) => {
        return {
          title: input.title,
          dueDate: input.dueDate,
          exerciseId: input.exerciseId,
          classMemberClassId: e.classId,
          classMemberUserId: e.userId,
        };
      }),
    });
  }

  async updateAssignment(input: UpdateAssignmentInput) {
    const updated = await this.db.assignment.update({
      where: {
        id: input.id,
      },
      data: {
        dueDate: input.dueDate,
        title: input.title,
        status: input.status,
      },
    });

    return updated;
  }

  async deleteAssignment(input: DeleteAssignmentsInput) {
    await this.db.assignment.delete({
      where: {
        id: input.id,
      },
    });
  }
}

export default AssignmentService;
