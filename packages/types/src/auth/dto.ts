import { z } from "zod";
import { createResponseSchema } from "../response.js";

export const UserRoleSchema = z.enum(["OWNER", "ADMIN", "TEACHER", "STUDENT"]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  preferredLanguage: z.string().optional(),
  deletionRequestedAt: z.string().nullable().optional(),
  emailScheduleNotifications: z.boolean().optional(),
  emailEngagementNotifications: z.boolean().optional(),
  emailNotificationsPaused: z.boolean().optional(),
  role: UserRoleSchema,
  centerId: z.string().nullable(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginRequestSchema = z.object({
  idToken: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthResponseDataSchema = z.object({
  user: AuthUserSchema,
});

export type AuthResponseData = z.infer<typeof AuthResponseDataSchema>;

export const AuthResponseSchema = createResponseSchema(AuthResponseDataSchema);

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const CenterSignupRequestSchema = z.object({
  centerName: z.string().min(1, "Center name is required"),
  centerSlug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and dashes",
    ),
  ownerEmail: z.email("Invalid email address"),
  ownerName: z.string().min(1, "Owner name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CenterSignupRequest = z.infer<typeof CenterSignupRequestSchema>;

export const CenterSignupWithGoogleRequestSchema = z.object({
  idToken: z.string(),
  centerName: z.string().min(1, "Center name is required"),
  centerSlug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must contain only lowercase letters, numbers, and dashes",
    ),
});

export type CenterSignupWithGoogleRequest = z.infer<
  typeof CenterSignupWithGoogleRequestSchema
>;

// --- Login Attempt Tracking (Account Lockout) ---

export const LoginAttemptCheckResponseDataSchema = z.object({
  locked: z.boolean(),
  retryAfterMinutes: z.number().optional(),
  attemptsRemaining: z.number().optional(),
});

export type LoginAttemptCheckResponseData = z.infer<
  typeof LoginAttemptCheckResponseDataSchema
>;

export const LoginAttemptCheckResponseSchema = createResponseSchema(
  LoginAttemptCheckResponseDataSchema
);

export const RecordLoginAttemptRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type RecordLoginAttemptRequest = z.infer<
  typeof RecordLoginAttemptRequestSchema
>;

export const RecordLoginAttemptResponseDataSchema = z.object({
  locked: z.boolean(),
  retryAfterMinutes: z.number().optional(),
});

export type RecordLoginAttemptResponseData = z.infer<
  typeof RecordLoginAttemptResponseDataSchema
>;

export const RecordLoginAttemptResponseSchema = createResponseSchema(
  RecordLoginAttemptResponseDataSchema
);
