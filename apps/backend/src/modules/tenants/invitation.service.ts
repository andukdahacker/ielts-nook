import {
  CenterRole,
  MembershipStatus,
  PrismaClient,
  getTenantedClient,
} from "@workspace/db";
import { CreateInvitationRequest } from "@workspace/types";
import type { Resend } from "resend";

export class InvitationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly resend: Resend | null,
    private readonly options: { emailFrom: string; webappUrl: string },
  ) {}

  async inviteUser(centerId: string, input: CreateInvitationRequest) {
    const { email, role, personalMessage } = input;
    const db = getTenantedClient(this.prisma, centerId);

    // 1. Check if user already has a membership in this center
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      const existingMembership = await db.centerMembership.findUnique({
        where: {
          centerId_userId: {
            centerId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new Error("User is already a member of this center");
      }
    }

    // 2. Perform DB Transaction
    const result = await db.$transaction(async (tx) => {
      let targetUser = user;

      // 3. Create User if doesn't exist (AC 3 Scenario A)
      if (!targetUser) {
        targetUser = await tx.user.create({
          data: {
            email,
          },
        });
      }

      // 4. Create Membership with status INVITED (AC 3)
      const membership = await tx.centerMembership.create({
        data: {
          centerId,
          userId: targetUser!.id,
          role: role as CenterRole,
          status: MembershipStatus.INVITED,
        },
      });

      return membership;
    });

    // 5. Trigger Email (AC 4)
    const signupUrl = `${this.options.webappUrl}/sign-up?email=${encodeURIComponent(
      email,
    )}`;

    const personalMessageHtml = personalMessage
      ? `<p style="margin: 16px 0; padding: 12px; background: #f5f5f5; border-radius: 8px;"><em>"${personalMessage}"</em></p>`
      : "";

    if (this.resend) {
      await this.resend.emails.send({
        from: this.options.emailFrom,
        to: email,
        subject: "You've been invited to join ClassLite",
        html: `
          <h1>You've been invited!</h1>
          <p>You have been invited to join a center on ClassLite as a <strong>${role.toLowerCase()}</strong>.</p>
          ${personalMessageHtml}
          <p>Please click the link below to create your account and join:</p>
          <a href="${signupUrl}">Join Now</a>
        `,
      });
    }

    return result;
  }
}
