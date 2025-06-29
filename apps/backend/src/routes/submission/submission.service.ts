import { PrismaClient } from "@prisma/client";
import { CreateSubmissionInput } from "./dto/create_submission.input";
import { GetSubmissionInput } from "./dto/get_submission.input";
import { GetSubmissionListInput } from "./dto/get_submission_list.input";
import { UpdateSubmissionInput } from "./dto/update_submission.input";
import { ListeningSubmissionGrade } from "./schema/listening_submission_grade.schema";
import { ReadingSubmissionGrade } from "./schema/reading_submission_grade.schema";

class SubmissionService {
  constructor(private readonly db: PrismaClient) {}

  async createSubmission(
    input: CreateSubmissionInput,
    grade?: ReadingSubmissionGrade | ListeningSubmissionGrade | null,
  ) {
    const submission = await this.db.submission.create({
      data: {
        assignmentId: input.assignmentId,
        content: input.content,
        grade: grade ?? undefined,
      },
    });

    return submission;
  }

  async getSubmissions(input: GetSubmissionListInput, classIds: string[]) {
    const submissions = await this.db.submission.findMany({
      take: input.take,
      skip: input.cursor ? 1 : undefined,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      where: {
        assignment: {
          OR: classIds.map((e) => ({
            classMemberClassId: e,
          })),
        },
      },
    });

    return submissions;
  }

  async getSubmission(input: GetSubmissionInput) {
    const submission = await this.db.submission.findUnique({
      where: {
        id: input.id,
      },
      include: {
        assignment: {
          include: {
            exercise: true,
          },
        },
      },
    });

    return submission;
  }

  async updateSubmission(input: UpdateSubmissionInput) {
    const submission = await this.db.submission.update({
      where: {
        id: input.id,
      },
      data: {
        feedback: input.feedback,
        grade: input.grade,
        content: input.content,
      },
      include: {
        assignment: {
          include: {
            exercise: true,
          },
        },
      },
    });

    return submission;
  }
}

export default SubmissionService;
