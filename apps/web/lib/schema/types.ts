import { components } from "./schema";

export type UserRole = components["schemas"]["UserRole"];
export type Center = components["schemas"]["Center"];
export type User = components["schemas"]["User"];
export type Class = components["schemas"]["Class"];
export type Exercise = components["schemas"]["Exercise"];
export type ExerciseType = components["schemas"]["ExerciseType"];
export type Assignment = components["schemas"]["Assignment"];
export type Submission = components["schemas"]["Submission"];

export type SubmissionContent = components["schemas"]["SubmissionContent"];
export type ReadingSubmissionContent =
  components["schemas"]["ReadingSubmissionContent"];
export type WritingSubmissionContent =
  components["schemas"]["WritingSubmissionContent"];
export type ListeningSubmissionContent =
  components["schemas"]["ListeningSubmissionContent"];

export type SubmissionGrade = components["schemas"]["SubmissionGradeSchema"];
export type ReadingSubmissionGrade =
  components["schemas"]["ReadingSubmissionGrade"];
export type ListeningSubmissionGrade =
  components["schemas"]["ListeningSubmissionGrade"];
export type WritingSubmissionGrade =
  components["schemas"]["WritingSubmissionGrade"];

export type WritingComment = components["schemas"]["WritingComment"];

export type SubmissionFeedback = components["schemas"]["SubmissionFeedback"];
export type WritingSubmissionFeedback =
  components["schemas"]["WritingSubmissionFeedback"];
export type ReadingSubmissionFeedback =
  components["schemas"]["ReadingSubmissionFeedback"];
export type ListeningSubmissionFeedback =
  components["schemas"]["ListeningSubmissionFeedback"];

export type ReadingExercise = components["schemas"]["ReadingExercise"];
export type ReadingExerciseType = ReadingExercise["tasks"][0]["type"];
export type ReadingMultipleChoiceTask =
  components["schemas"]["ReadingMultipleChoiceTask"];
export type ReadingTFNGTask = components["schemas"]["ReadingTFNGTask"];
export type ReadingSentenceCompletionTask =
  components["schemas"]["ReadingSentenceCompletionTask"];
export type ReadingYNNGTask = components["schemas"]["ReadingYNNGTask"];
export type ReadingSummaryCompletionTask =
  components["schemas"]["ReadingSummaryCompletionTask"];
export type ReadingTask =
  | ReadingMultipleChoiceTask
  | ReadingTFNGTask
  | ReadingYNNGTask;

export type ListeningExercise = components["schemas"]["ListeningExercise"];
export type ListeningExerciseType = ListeningExercise["tasks"][0]["type"];
export type ListeningMultipleChoiceTask =
  components["schemas"]["ListeningMultipleChoiceTask"];
export type ListeningTask = ListeningMultipleChoiceTask;

export type WritingExercise = components["schemas"]["WritingExercise"];
export type WritingExerciseType = components["schemas"]["WritingExerciseType"];

export type RegisterCenterInput = components["schemas"]["RegisterCenterInput"];
export type GetCenterClassListInput =
  components["schemas"]["GetClassListInput"];
export type UpdateClassInput = components["schemas"]["UpdateClassInput"];
export type GetExerciseListInput =
  components["schemas"]["GetExerciseListInput"];
export type CreateExerciseInput = components["schemas"]["CreateExerciseInput"];
export type UpdateExerciseInput = components["schemas"]["UpdateExerciseInput"];
export type UploadListeningFileInput =
  components["schemas"]["UploadListeningFileInput"];
export type DeleteListeningFileInput =
  components["schemas"]["DeleteListeningFileInput"];
export type UploadWritingImageInput =
  components["schemas"]["UploadWritingImageInput"];
export type DeleteWritingImageInput =
  components["schemas"]["DeleteWritingImageInput"];
export type CreateAssignmentsInput =
  components["schemas"]["CreateAssignmentsInput"];
export type GetAssignmentsByUserInput =
  components["schemas"]["GetAssignmentByUserInput"];
export type CreateSubmissionInput =
  components["schemas"]["CreateSubmissionInput"];
export type GetClassListByUserInput =
  components["schemas"]["GetClassListByUserInput"];
export type GetClassMemberInput = components["schemas"]["GetClassMemberInput"];
export type UpdateSubmissionInput =
  components["schemas"]["UpdateSubmissionInput"];

export type CreateExerciseResponse =
  components["schemas"]["CreateExerciseResponseSchema"];
export type CreateAssignmentsResponse =
  components["schemas"]["CreateAssignmentsResponse"];
export type GetAssignmentsByExerciseResponse =
  components["schemas"]["GetAssignmentsByExerciseResponse"];
