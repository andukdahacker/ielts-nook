import {
  CreateInvitationRequest,
  CreateInvitationRequestSchema,
  ErrorResponseSchema,
  InvitationResponseSchema,
} from "@workspace/types";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import Env from "../../env.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { InvitationController } from "./invitation.controller.js";
import { InvitationService } from "./invitation.service.js";
import { BillingService } from "../billing/billing.service.js";

export async function invitationRoutes(fastify: FastifyInstance) {
  const env = fastify.getEnvs<Env>();
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const invitationService = new InvitationService(
    fastify.prisma,
    fastify.resend,
    {
      emailFrom: env.EMAIL_FROM || "ClassLite <no-reply@notifications.classlite.app>",
      webappUrl:
        env.NODE_ENV === "production"
          ? "https://classlite.app"
          : "http://localhost:5173",
    },
  );
  const invitationController = new InvitationController(invitationService);

  api.post("/", {
    schema: {
      body: CreateInvitationRequestSchema,
      response: {
        201: InvitationResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [authMiddleware, requireRole(["OWNER", "ADMIN"])],
    handler: async (request: FastifyRequest<{ Body: CreateInvitationRequest }>, reply: FastifyReply) => {
      try {
        // Check enrollment restriction for STUDENT invites
        if (request.body.role === "STUDENT" && request.jwtPayload!.centerId) {
          const billingService = new BillingService(fastify.prisma);
          const { allowed, reason } = await billingService.checkEnrollmentAllowed(
            request.jwtPayload!.centerId,
          );
          if (!allowed) {
            return reply.status(403).send({ message: reason });
          }
        }

        const result = await invitationController.inviteUser(request.body, request.jwtPayload!);
        return reply.status(201).send(result);
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (
            error.message === "User is already a member of this center" ||
            error.message === "User does not belong to a center"
          ) {
            return reply.status(400).send({ message: error.message });
          }
        }
        throw error;
      }
    },
  });
}
