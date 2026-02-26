import { z } from "zod";
import { createResponseSchema } from "./response.js";

// Pagination params schema
export const PaginationParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

// User list query params
export const UserListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.enum(["OWNER", "ADMIN", "TEACHER", "STUDENT"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "INVITED"]).optional(),
});

export type UserListQuery = z.infer<typeof UserListQuerySchema>;

// User item in list
export const UserListItemSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["OWNER", "ADMIN", "TEACHER", "STUDENT"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "INVITED"]),
  membershipId: z.string(),
  createdAt: z.string(),
  lastActiveAt: z.string().nullable(),
});

export type UserListItem = z.infer<typeof UserListItemSchema>;

// Paginated user list response
export const UserListResponseSchema = z.object({
  data: z.object({
    items: z.array(UserListItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
  }),
  message: z.string(),
});

export type UserListResponse = z.infer<typeof UserListResponseSchema>;

// Role change request
export const ChangeRoleRequestSchema = z.object({
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
});

export type ChangeRoleRequest = z.infer<typeof ChangeRoleRequestSchema>;

// Role change response
export const ChangeRoleResponseSchema = createResponseSchema(
  z.object({
    id: z.string(),
    role: z.string(),
  })
);

export type ChangeRoleResponse = z.infer<typeof ChangeRoleResponseSchema>;

// Deactivate/Reactivate response
export const UserStatusResponseSchema = createResponseSchema(
  z.object({
    id: z.string(),
    status: z.string(),
  })
);

export type UserStatusResponse = z.infer<typeof UserStatusResponseSchema>;

// Bulk action request
export const BulkUserActionRequestSchema = z.object({
  userIds: z.array(z.string()).min(1),
});

export type BulkUserActionRequest = z.infer<typeof BulkUserActionRequestSchema>;

// Bulk action response
export const BulkActionResponseSchema = z.object({
  data: z.object({
    processed: z.number(),
    failed: z.number(),
  }),
  message: z.string(),
});

export type BulkActionResponse = z.infer<typeof BulkActionResponseSchema>;

// Invitation list query
export const InvitationListQuerySchema = z.object({
  status: z.enum(["INVITED", "ACTIVE", "ALL"]).optional().default("INVITED"),
});

export type InvitationListQuery = z.infer<typeof InvitationListQuerySchema>;

// Invitation list item
export const InvitationListItemSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  role: z.enum(["OWNER", "ADMIN", "TEACHER", "STUDENT"]),
  status: z.enum(["INVITED", "ACTIVE", "SUSPENDED"]),
  createdAt: z.string(),
  userId: z.string(),
});

export type InvitationListItem = z.infer<typeof InvitationListItemSchema>;

// Invitation list response
export const InvitationListResponseSchema = z.object({
  data: z.array(InvitationListItemSchema),
  message: z.string(),
});

export type InvitationListResponse = z.infer<typeof InvitationListResponseSchema>;

// Enhanced invitation request with optional message
export const CreateInvitationWithMessageSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]),
  personalMessage: z.string().max(500).optional(),
});

export type CreateInvitationWithMessage = z.infer<
  typeof CreateInvitationWithMessageSchema
>;

// Single user profile response
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  preferredLanguage: z.string(),
  deletionRequestedAt: z.string().nullable(),
  emailScheduleNotifications: z.boolean(),
  emailEngagementNotifications: z.boolean(),
  emailNotificationsPaused: z.boolean(),
  role: z.enum(["OWNER", "ADMIN", "TEACHER", "STUDENT"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "INVITED"]),
  createdAt: z.string(),
  lastActiveAt: z.string().nullable(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserProfileResponseSchema = z.object({
  data: UserProfileSchema,
  message: z.string(),
});

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;

// Update profile request
export const UpdateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  phoneNumber: z.string().max(20).optional().nullable(),
  preferredLanguage: z.enum(["en", "vi"]).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  emailScheduleNotifications: z.boolean().optional(),
  emailEngagementNotifications: z.boolean().optional(),
  emailNotificationsPaused: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdateProfileResponseSchema = z.object({
  data: UserProfileSchema,
  message: z.string(),
});

export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;

// Change password request
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const ChangePasswordResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
  message: z.string(),
});

export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;

// Request deletion
export const RequestDeletionResponseSchema = z.object({
  data: z.object({
    deletionRequestedAt: z.string(),
    deletionScheduledFor: z.string(),
  }),
  message: z.string(),
});

export type RequestDeletionResponse = z.infer<typeof RequestDeletionResponseSchema>;

// Cancel deletion
export const CancelDeletionResponseSchema = z.object({
  data: z.object({
    success: z.boolean(),
  }),
  message: z.string(),
});

export type CancelDeletionResponse = z.infer<typeof CancelDeletionResponseSchema>;
