import { describe, it, expect, beforeEach, vi } from "vitest";
import { UsersService } from "./users.service";
import type { PrismaClient } from "@workspace/db";

// Mock Firebase Auth
vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    getUser: vi.fn().mockResolvedValue({
      providerData: [{ providerId: "password" }],
    }),
    updateUser: vi.fn().mockResolvedValue({}),
    revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Inngest
vi.mock("../inngest/client.js", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({ ids: ["test-event-id"] }),
  },
}));

describe("Profile Service Tests", () => {
  let usersService: UsersService;
  let mockPrisma: {
    user: {
      update: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    };
    authAccount: {
      findFirst: ReturnType<typeof vi.fn>;
    };
    centerMembership: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPrisma = {
      user: {
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      authAccount: {
        findFirst: vi.fn(),
      },
      centerMembership: {
        findFirst: vi.fn(),
      },
    };

    usersService = new UsersService(mockPrisma as unknown as PrismaClient);
  });

  describe("updateProfile", () => {
    it("updates user profile with valid data", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Updated Name",
        avatarUrl: null,
        phoneNumber: "+84123456789",
        preferredLanguage: "vi",
        deletionRequestedAt: null,
        emailScheduleNotifications: true,
        emailEngagementNotifications: false,
        emailNotificationsPaused: true,
        updatedAt: new Date(),
        memberships: [
          {
            id: "membership-1",
            role: "TEACHER",
            status: "ACTIVE",
            createdAt: new Date(),
          },
        ],
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);

      const result = await usersService.updateProfile("user-1", {
        name: "Updated Name",
        phoneNumber: "+84123456789",
        preferredLanguage: "vi",
        emailEngagementNotifications: false,
        emailNotificationsPaused: true,
      });

      expect(result.name).toBe("Updated Name");
      expect(result.phoneNumber).toBe("+84123456789");
      expect(result.preferredLanguage).toBe("vi");
      expect(result.emailScheduleNotifications).toBe(true);
      expect(result.emailEngagementNotifications).toBe(false);
      expect(result.emailNotificationsPaused).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            emailEngagementNotifications: false,
            emailNotificationsPaused: true,
          }),
        }),
      );
    });

    it("throws error when user has no membership", async () => {
      const mockUser = {
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        avatarUrl: null,
        phoneNumber: null,
        preferredLanguage: "en",
        deletionRequestedAt: null,
        updatedAt: new Date(),
        memberships: [],
      };

      mockPrisma.user.update.mockResolvedValue(mockUser);

      await expect(
        usersService.updateProfile("user-1", { name: "New Name" })
      ).rejects.toThrow("User has no membership");
    });
  });

  describe("changePassword", () => {
    const mockFirebaseApiKey = "test-api-key";

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it("changes password successfully with valid current password", async () => {
      mockPrisma.authAccount.findFirst.mockResolvedValue({
        id: "auth-1",
        userId: "user-1",
        provider: "FIREBASE",
        providerUserId: "firebase-uid-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        avatarUrl: null,
        phoneNumber: null,
        preferredLanguage: "en",
        deletionRequestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock successful Firebase password verification
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await usersService.changePassword(
        "user-1",
        "oldPassword123",
        "NewPassword1",
        mockFirebaseApiKey
      );

      expect(result.success).toBe(true);
    });

    it("throws error when current password is incorrect", async () => {
      mockPrisma.authAccount.findFirst.mockResolvedValue({
        id: "auth-1",
        userId: "user-1",
        provider: "FIREBASE",
        providerUserId: "firebase-uid-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        avatarUrl: null,
        phoneNumber: null,
        preferredLanguage: "en",
        deletionRequestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock failed Firebase password verification
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "INVALID_PASSWORD" } }),
      } as Response);

      await expect(
        usersService.changePassword(
          "user-1",
          "wrongPassword",
          "NewPassword1",
          mockFirebaseApiKey
        )
      ).rejects.toThrow("Current password is incorrect");
    });

    it("throws error when no Firebase account linked", async () => {
      mockPrisma.authAccount.findFirst.mockResolvedValue(null);

      await expect(
        usersService.changePassword(
          "user-1",
          "oldPassword",
          "NewPassword1",
          mockFirebaseApiKey
        )
      ).rejects.toThrow("No Firebase account linked");
    });
  });

  describe("hasPasswordProvider", () => {
    it("returns true when user has password provider", async () => {
      mockPrisma.authAccount.findFirst.mockResolvedValue({
        id: "auth-1",
        userId: "user-1",
        provider: "FIREBASE",
        providerUserId: "firebase-uid-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usersService.hasPasswordProvider("user-1");

      expect(result).toBe(true);
    });

    it("returns false when user has no Firebase account", async () => {
      mockPrisma.authAccount.findFirst.mockResolvedValue(null);

      const result = await usersService.hasPasswordProvider("user-1");

      expect(result).toBe(false);
    });
  });

  describe("cancelDeletion", () => {
    it("cancels pending deletion request", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        avatarUrl: null,
        phoneNumber: null,
        preferredLanguage: "en",
        deletionRequestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        avatarUrl: null,
        phoneNumber: null,
        preferredLanguage: "en",
        deletionRequestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await usersService.cancelDeletion("user-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { deletionRequestedAt: null },
      });
    });

    it("throws error when no deletion request exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        avatarUrl: null,
        phoneNumber: null,
        preferredLanguage: "en",
        deletionRequestedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(usersService.cancelDeletion("user-1")).rejects.toThrow(
        "No deletion request found"
      );
    });

    it("throws error when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(usersService.cancelDeletion("unknown-user")).rejects.toThrow(
        "User not found"
      );
    });
  });
});
