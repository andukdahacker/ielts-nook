import {
  CreateTenantInput,
  TenantData,
  UpdateCenterInput,
} from "@workspace/types";
import {
  CenterRole,
  MembershipStatus,
  PrismaClient,
  getTenantedClient,
} from "@workspace/db";
import type { Auth } from "firebase-admin/auth";
import type { Storage } from "firebase-admin/storage";
import type { Resend } from "resend";
import { escapeHtml } from "../../utils/html.js";
import { AppError } from "../../errors/app-error.js";

export class TenantService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly firebaseAuth: Auth,
    private readonly firebaseStorage: Storage,
    private readonly resend: Resend | null,
    private readonly options: { emailFrom: string; bucketName: string },
  ) {}

  async getTenant(centerId: string): Promise<TenantData> {
    const db = getTenantedClient(this.prisma, centerId);
    const center = await db.center.findUniqueOrThrow({
      where: { id: centerId },
    });

    const ownerMembership = await db.centerMembership.findFirstOrThrow({
      where: {
        centerId: center.id,
        role: CenterRole.OWNER,
      },
      include: {
        user: true,
      },
    });

    return {
      center: {
        id: center.id,
        name: center.name,
        slug: center.slug,
        logoUrl: center.logoUrl,
        timezone: center.timezone,
        brandColor: center.brandColor,
        createdAt: center.createdAt,
        updatedAt: center.updatedAt,
      },
      owner: {
        id: ownerMembership.user.id,
        email: ownerMembership.user.email,
        name: ownerMembership.user.name,
        role: "OWNER",
      },
    };
  }

  async uploadLogo(
    centerId: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const bucket = this.firebaseStorage.bucket(this.options.bucketName);
    const filePath = `tenants/${centerId}/branding/logo.png`;
    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
      metadata: {
        contentType,
        cacheControl: "public, max-age=31536000",
      },
    });

    // Make the file public
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    const db = getTenantedClient(this.prisma, centerId);
    await db.center.update({
      where: { id: centerId },
      data: { logoUrl: publicUrl },
    });

    return publicUrl;
  }

  async updateTenant(
    centerId: string,
    input: UpdateCenterInput,
  ): Promise<TenantData> {
    const db = getTenantedClient(this.prisma, centerId);
    const center = await db.center.update({
      where: { id: centerId },
      data: {
        name: input.name,
        logoUrl: input.logoUrl,
        timezone: input.timezone,
        brandColor: input.brandColor,
      },
    });

    const ownerMembership = await db.centerMembership.findFirstOrThrow({
      where: {
        centerId: center.id,
        role: CenterRole.OWNER,
      },
      include: {
        user: true,
      },
    });

    return {
      center: {
        id: center.id,
        name: center.name,
        slug: center.slug,
        logoUrl: center.logoUrl,
        timezone: center.timezone,
        brandColor: center.brandColor,
        createdAt: center.createdAt,
        updatedAt: center.updatedAt,
      },
      owner: {
        id: ownerMembership.user.id,
        email: ownerMembership.user.email,
        name: ownerMembership.user.name,
        role: "OWNER",
      },
    };
  }

  async createTenant(input: CreateTenantInput): Promise<TenantData> {
    const { name, slug, ownerEmail, ownerName } = input;

    // 1. Check for existing user (AC 3)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: ownerEmail },
    });

    if (existingUser) {
      throw AppError.conflict("Email already registered in database");
    }

    // Check slug uniqueness before proceeding with Firebase user creation
    const existingCenter = await this.prisma.center.findUnique({
      where: { slug },
    });
    if (existingCenter) {
      throw AppError.conflict("Center slug already exists");
    }

    try {
      await this.firebaseAuth.getUserByEmail(ownerEmail);
      throw AppError.conflict("Email already registered in Firebase");
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code !== "auth/user-not-found"
      ) {
        throw error;
      }
    }

    // 2. Create Firebase User
    const firebaseUser = await this.firebaseAuth.createUser({
      email: ownerEmail,
      displayName: ownerName,
      emailVerified: true,
    });
    const firebaseUid = firebaseUser.uid;

    try {
      // 3. Perform DB Transaction
      // Intentionally uses raw prisma (not tenanted client) because the center
      // doesn't exist yet — centerId is explicitly set in each create call.
      const result = await this.prisma.$transaction(async (tx) => {
        // 3a. Create User
        const user = await tx.user.create({
          data: {
            email: ownerEmail,
            name: ownerName,
          },
        });

        // 3b. Link AuthAccount
        await tx.authAccount.create({
          data: {
            userId: user.id,
            provider: "FIREBASE",
            providerUserId: firebaseUid,
            email: ownerEmail,
          },
        });

        // 3c. Create Center
        const center = await tx.center.create({
          data: {
            name,
            slug,
          },
        });

        // 3d. Create Membership
        await tx.centerMembership.create({
          data: {
            centerId: center.id,
            userId: user.id,
            role: CenterRole.OWNER,
            status: MembershipStatus.ACTIVE,
          },
        });

        return { center, user };
      });

      // 4. Set Custom Claims
      await this.firebaseAuth.setCustomUserClaims(firebaseUid, {
        center_id: result.center.id,
        role: "OWNER",
      });

      // 5. Send Welcome Email (with Password Reset Link)
      const resetLink =
        await this.firebaseAuth.generatePasswordResetLink(ownerEmail);

      if (this.resend) {
        await this.resend.emails.send({
          from: this.options.emailFrom,
          to: ownerEmail,
          subject: "Welcome to ClassLite",
          html: `
          <h1>Welcome to ClassLite, ${escapeHtml(ownerName)}!</h1>
          <p>Your center <strong>${escapeHtml(name)}</strong> has been successfully provisioned.</p>
          <p>Please click the link below to set your password and access your account:</p>
          <a href="${resetLink}">Set Password & Login</a>
          <p>If you already have an account, you can just login.</p>
        `,
        });
      }

      return {
        center: {
          id: result.center.id,
          name: result.center.name,
          slug: result.center.slug,
          logoUrl: result.center.logoUrl,
          timezone: result.center.timezone,
          brandColor: result.center.brandColor,
          createdAt: result.center.createdAt,
          updatedAt: result.center.updatedAt,
        },
        owner: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: "OWNER",
        },
      };
    } catch (error) {
      // Cleanup Firebase user if DB transaction or subsequent steps fail
      await this.firebaseAuth.deleteUser(firebaseUid).catch(() => {});
      throw error;
    }
  }
}
