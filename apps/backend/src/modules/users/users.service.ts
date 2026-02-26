import {
  CenterRole,
  MembershipStatus,
  PrismaClient,
  getTenantedClient,
} from "@workspace/db";
import { AppError } from "../../errors/app-error.js";
import type {
  BulkUserActionRequest,
  ChangeRoleRequest,
  UpdateProfileInput,
  UserListItem,
  UserListQuery,
  UserProfile,
} from "@workspace/types";
import { getAuth } from "firebase-admin/auth";
import { inngest } from "../inngest/client.js";
import type { UserDeletionScheduledEvent } from "./jobs/user-deletion.job.js";

export class UsersService {
  private readonly firebaseUidCache = new Map<string, string>();

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Resolve a Firebase UID to the database User ID via the AuthAccount table.
   * Results are cached in-memory since the mapping is permanent.
   */
  async resolveFirebaseUid(firebaseUid: string): Promise<string> {
    const cached = this.firebaseUidCache.get(firebaseUid);
    if (cached) return cached;

    const authAccount = await this.prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: "FIREBASE",
          providerUserId: firebaseUid,
        },
      },
    });
    if (!authAccount) {
      throw AppError.notFound("User not found");
    }
    this.firebaseUidCache.set(firebaseUid, authAccount.userId);
    return authAccount.userId;
  }

  async getUserById(
    centerId: string,
    userId: string,
  ): Promise<UserProfile | null> {
    const db = getTenantedClient(this.prisma, centerId);

    const membership = await db.centerMembership.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!membership) {
      return null;
    }

    return {
      id: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      avatarUrl: membership.user.avatarUrl,
      phoneNumber: membership.user.phoneNumber,
      preferredLanguage: membership.user.preferredLanguage,
      deletionRequestedAt:
        membership.user.deletionRequestedAt?.toISOString() ?? null,
      emailScheduleNotifications: membership.user.emailScheduleNotifications,
      emailEngagementNotifications:
        membership.user.emailEngagementNotifications,
      emailNotificationsPaused: membership.user.emailNotificationsPaused,
      role: membership.role as "OWNER" | "ADMIN" | "TEACHER" | "STUDENT",
      status: membership.status as "ACTIVE" | "SUSPENDED" | "INVITED",
      createdAt: membership.createdAt.toISOString(),
      lastActiveAt: membership.user.updatedAt?.toISOString() ?? null,
    };
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: input.name,
        phoneNumber: input.phoneNumber,
        preferredLanguage: input.preferredLanguage,
        avatarUrl: input.avatarUrl,
        emailScheduleNotifications: input.emailScheduleNotifications,
        emailEngagementNotifications: input.emailEngagementNotifications,
        emailNotificationsPaused: input.emailNotificationsPaused,
      },
      include: {
        memberships: true,
      },
    });

    const membership = user.memberships[0];
    if (!membership) {
      throw AppError.badRequest("User has no membership");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      phoneNumber: user.phoneNumber,
      preferredLanguage: user.preferredLanguage,
      deletionRequestedAt: user.deletionRequestedAt?.toISOString() ?? null,
      emailScheduleNotifications: user.emailScheduleNotifications,
      emailEngagementNotifications: user.emailEngagementNotifications,
      emailNotificationsPaused: user.emailNotificationsPaused,
      role: membership.role as "OWNER" | "ADMIN" | "TEACHER" | "STUDENT",
      status: membership.status as "ACTIVE" | "SUSPENDED" | "INVITED",
      createdAt: membership.createdAt.toISOString(),
      lastActiveAt: user.updatedAt?.toISOString() ?? null,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    firebaseApiKey: string,
  ): Promise<{ success: boolean }> {
    // Get user's Firebase UID
    const authAccount = await this.prisma.authAccount.findFirst({
      where: { userId, provider: "FIREBASE" },
    });

    if (!authAccount) {
      throw AppError.badRequest("No Firebase account linked");
    }

    // Get user email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.email) {
      throw AppError.badRequest("User email not found");
    }

    // Verify current password using Firebase REST API
    const verifyResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          password: currentPassword,
          returnSecureToken: false,
        }),
      },
    );

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json();
      if (
        errorData.error?.message === "INVALID_PASSWORD" ||
        errorData.error?.message === "INVALID_LOGIN_CREDENTIALS"
      ) {
        throw AppError.unauthorized("Current password is incorrect");
      }
      throw AppError.badRequest("Password verification failed");
    }

    // Update password via Firebase Admin SDK
    await getAuth().updateUser(authAccount.providerUserId, {
      password: newPassword,
    });

    // Revoke all refresh tokens (logs out other sessions)
    await getAuth().revokeRefreshTokens(authAccount.providerUserId);

    return { success: true };
  }

  async hasPasswordProvider(userId: string): Promise<boolean> {
    const authAccount = await this.prisma.authAccount.findFirst({
      where: { userId, provider: "FIREBASE" },
    });

    if (!authAccount) {
      return false;
    }

    try {
      const firebaseUser = await getAuth().getUser(authAccount.providerUserId);
      return firebaseUser.providerData.some(
        (provider) => provider.providerId === "password",
      );
    } catch {
      return false;
    }
  }

  async requestDeletion(
    centerId: string,
    userId: string,
  ): Promise<{ deletionRequestedAt: Date; deletionScheduledFor: Date }> {
    const db = getTenantedClient(this.prisma, centerId);

    // Check if user is an OWNER
    const membership = await db.centerMembership.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw AppError.notFound("User not found in this center");
    }

    if (membership.role === "OWNER") {
      throw AppError.forbidden("Owners cannot delete their account");
    }

    const deletionRequestedAt = new Date();
    const deletionScheduledFor = new Date(deletionRequestedAt);
    deletionScheduledFor.setDate(deletionScheduledFor.getDate() + 7);

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt },
    });

    // Schedule the deletion via Inngest
    await inngest.send({
      name: "user/deletion.scheduled",
      data: {
        userId,
        deletionRequestedAt: deletionRequestedAt.toISOString(),
      },
    } as UserDeletionScheduledEvent);

    return { deletionRequestedAt, deletionScheduledFor };
  }

  async cancelDeletion(userId: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound("User not found");
    }

    if (!user.deletionRequestedAt) {
      throw AppError.notFound("No deletion request found");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: null },
    });

    return { success: true };
  }

  async listUsers(
    centerId: string,
    query: UserListQuery,
  ): Promise<{ items: UserListItem[]; total: number }> {
    const db = getTenantedClient(this.prisma, centerId);
    const { page, limit, search, role, status } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [memberships, total] = await Promise.all([
      db.centerMembership.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.centerMembership.count({ where }),
    ]);

    const items: UserListItem[] = memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role as "OWNER" | "ADMIN" | "TEACHER" | "STUDENT",
      status: m.status as "ACTIVE" | "SUSPENDED" | "INVITED",
      membershipId: m.id,
      createdAt: m.createdAt.toISOString(),
      lastActiveAt: m.user.updatedAt?.toISOString() ?? null,
    }));

    return { items, total };
  }

  async changeRole(
    centerId: string,
    userId: string,
    input: ChangeRoleRequest,
  ): Promise<{ id: string; role: string }> {
    const db = getTenantedClient(this.prisma, centerId);

    const membership = await db.centerMembership.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw AppError.notFound("User not found in this center");
    }

    // Cannot change role of an OWNER
    if (membership.role === "OWNER") {
      throw AppError.forbidden("Cannot change role of an owner");
    }

    const updated = await db.centerMembership.update({
      where: { id: membership.id },
      data: { role: input.role as CenterRole },
    });

    return { id: userId, role: updated.role };
  }

  async deactivateUser(
    centerId: string,
    userId: string,
    requestingUserId: string,
  ): Promise<{ id: string; status: string }> {
    const db = getTenantedClient(this.prisma, centerId);

    // Cannot deactivate yourself
    if (userId === requestingUserId) {
      throw AppError.badRequest("Cannot deactivate yourself");
    }

    const membership = await db.centerMembership.findFirst({
      where: { userId },
      include: { user: true },
    });

    if (!membership) {
      throw AppError.notFound("User not found in this center");
    }

    // Cannot deactivate the last active OWNER
    if (membership.role === "OWNER") {
      const activeOwnerCount = await db.centerMembership.count({
        where: {
          role: "OWNER",
          status: "ACTIVE",
        },
      });

      if (activeOwnerCount <= 1) {
        throw AppError.badRequest("Cannot deactivate the last owner");
      }
    }

    // Update status to SUSPENDED
    const updated = await db.centerMembership.update({
      where: { id: membership.id },
      data: { status: MembershipStatus.SUSPENDED },
    });

    // Revoke Firebase sessions if user has auth account
    const authAccount = await this.prisma.authAccount.findFirst({
      where: { userId, provider: "FIREBASE" },
    });

    if (authAccount) {
      try {
        await getAuth().revokeRefreshTokens(authAccount.providerUserId);
      } catch {
        // Log but don't fail if Firebase revocation fails
      }
    }

    return { id: userId, status: updated.status };
  }

  async reactivateUser(
    centerId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const db = getTenantedClient(this.prisma, centerId);

    const membership = await db.centerMembership.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw AppError.notFound("User not found in this center");
    }

    const updated = await db.centerMembership.update({
      where: { id: membership.id },
      data: { status: MembershipStatus.ACTIVE },
    });

    return { id: userId, status: updated.status };
  }

  async bulkDeactivate(
    centerId: string,
    input: BulkUserActionRequest,
    requestingUserId: string,
  ): Promise<{ processed: number; failed: number }> {
    const db = getTenantedClient(this.prisma, centerId);
    let processed = 0;
    let failed = 0;

    for (const userId of input.userIds) {
      try {
        // Skip self
        if (userId === requestingUserId) {
          failed++;
          continue;
        }

        const membership = await db.centerMembership.findFirst({
          where: { userId },
        });

        // Skip owners
        if (!membership || membership.role === "OWNER") {
          failed++;
          continue;
        }

        await db.centerMembership.update({
          where: { id: membership.id },
          data: { status: MembershipStatus.SUSPENDED },
        });

        // Revoke Firebase sessions
        const authAccount = await this.prisma.authAccount.findFirst({
          where: { userId, provider: "FIREBASE" },
        });

        if (authAccount) {
          try {
            await getAuth().revokeRefreshTokens(authAccount.providerUserId);
          } catch {
            // Continue even if revocation fails
          }
        }

        processed++;
      } catch {
        failed++;
      }
    }

    return { processed, failed };
  }

  async bulkRemind(
    centerId: string,
    input: BulkUserActionRequest,
  ): Promise<{ processed: number; failed: number }> {
    // This would integrate with email service
    // For now, just count the users
    return { processed: input.userIds.length, failed: 0 };
  }

  async listInvitations(
    centerId: string,
    status?: string,
  ): Promise<
    Array<{
      id: string;
      email: string | null;
      role: string;
      status: string;
      createdAt: string;
      userId: string;
    }>
  > {
    const db = getTenantedClient(this.prisma, centerId);

    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    const memberships = await db.centerMembership.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return memberships.map((m) => ({
      id: m.id,
      email: m.user.email,
      role: m.role,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      userId: m.userId,
    }));
  }

  async resendInvitation(
    centerId: string,
    invitationId: string,
  ): Promise<{ id: string; status: string }> {
    const db = getTenantedClient(this.prisma, centerId);

    const membership = await db.centerMembership.findUnique({
      where: { id: invitationId },
      include: { user: true },
    });

    if (!membership) {
      throw AppError.notFound("Invitation not found");
    }

    if (membership.status !== "INVITED") {
      throw AppError.badRequest("User has already accepted the invitation");
    }

    // Would trigger email resend here
    // For now, just return the invitation

    return { id: invitationId, status: membership.status };
  }

  async revokeInvitation(
    centerId: string,
    invitationId: string,
  ): Promise<void> {
    const db = getTenantedClient(this.prisma, centerId);

    const membership = await db.centerMembership.findUnique({
      where: { id: invitationId },
    });

    if (!membership) {
      throw AppError.notFound("Invitation not found");
    }

    if (membership.status !== "INVITED") {
      throw AppError.badRequest(
        "Cannot revoke - user has already accepted the invitation",
      );
    }

    // Delete the membership (invitation)
    await db.centerMembership.delete({
      where: { id: invitationId },
    });
  }
}
