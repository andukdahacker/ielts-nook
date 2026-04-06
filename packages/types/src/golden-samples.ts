import { z } from "zod";

export const SkillTypeSchema = z.enum(["WRITING", "SPEAKING"]);
export type SkillType = z.infer<typeof SkillTypeSchema>;

export const GoldenSampleSchema = z.object({
  id: z.string(),
  centerId: z.string(),
  title: z.string(),
  skillType: SkillTypeSchema,
  studentWork: z.string(),
  teacherFeedback: z.string(),
  isActive: z.boolean(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GoldenSample = z.infer<typeof GoldenSampleSchema>;

export const GoldenSampleListSchema = z.array(GoldenSampleSchema);

export const CreateGoldenSampleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  skillType: SkillTypeSchema,
  studentWork: z.string().min(50, "Student work must be at least 50 characters").max(5000, "Student work must be at most 5000 characters"),
  teacherFeedback: z.string().min(50, "Teacher feedback must be at least 50 characters").max(5000, "Teacher feedback must be at most 5000 characters"),
});
export type CreateGoldenSample = z.infer<typeof CreateGoldenSampleSchema>;

export const UpdateGoldenSampleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  studentWork: z.string().min(50).max(5000).optional(),
  teacherFeedback: z.string().min(50).max(5000).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateGoldenSample = z.infer<typeof UpdateGoldenSampleSchema>;

export const ReorderGoldenSamplesSchema = z.object({
  ids: z.array(z.string()).min(1),
});
export type ReorderGoldenSamples = z.infer<typeof ReorderGoldenSamplesSchema>;

// Response wrappers for routes
export const GoldenSampleResponseSchema = z.object({
  data: GoldenSampleSchema,
  message: z.string(),
});

export const GoldenSampleListResponseSchema = z.object({
  data: GoldenSampleListSchema,
  message: z.string(),
});

export const GoldenSampleNullResponseSchema = z.object({
  data: z.null(),
  message: z.string(),
});
