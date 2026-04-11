import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { PrismaClient } from "@workspace/db";
import { ModerationService } from "./moderation.service.js";
import { ModerationController } from "./moderation.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import {
  ErrorResponseSchema,
  ListFlagsQuerySchema,
  ScanContentSchema,
  FlagResponseSchema,
  FlagListResponseSchema,
  TermsResponseSchema,
  ScanResponseSchema,
} from "@workspace/types";
import type { ModerationFlagStatus, ModerationContentType } from "@workspace/db";

async function resolveMembershipId(
  prisma: PrismaClient,
  firebaseUid: string,
  centerId: string,
): Promise<string> {
  const account = await prisma.authAccount.findUnique({
    where: { provider_providerUserId: { provider: "FIREBASE", providerUserId: firebaseUid } },
  });
  if (!account) throw new Error("User not found");
  const membership = await prisma.centerMembership.findUnique({
    where: { centerId_userId: { centerId, userId: account.userId } },
  });
  if (!membership) throw new Error("Membership not found");
  return membership.id;
}

export async function moderationRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  api.addHook("preHandler", authMiddleware);

  const service = new ModerationService(fastify.prisma);
  const controller = new ModerationController(service);

  // GET /api/v1/moderation/flags — List flags (paginated, filterable)
  api.get(
    "/flags",
    {
      schema: {
        querystring: ListFlagsQuerySchema,
        response: {
          200: FlagListResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["ADMIN", "OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const result = await controller.getFlags(centerId, {
        status: request.query.status as ModerationFlagStatus | undefined,
        contentType: request.query.contentType as ModerationContentType | undefined,
        contentId: request.query.contentId,
        page: request.query.page,
        limit: request.query.limit,
      });
      return reply.send(result);
    },
  );

  // GET /api/v1/moderation/flags/:id — Get flag detail
  api.get(
    "/flags/:id",
    {
      schema: {
        params: z.object({ id: z.string() }),
        response: {
          200: FlagResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["ADMIN", "OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const result = await controller.getFlagById(centerId, request.params.id);
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error && error.message === "Moderation flag not found") {
          return reply.status(404).send({ message: "Moderation flag not found" });
        }
        throw error;
      }
    },
  );

  // PATCH /api/v1/moderation/flags/:id/resolve — Resolve flag
  api.patch(
    "/flags/:id/resolve",
    {
      schema: {
        params: z.object({ id: z.string() }),
        body: z.object({
          action: z.enum(["APPROVED", "REDACTED", "DELETED"]),
          redactedText: z.string().optional(),
        }),
        response: {
          200: FlagResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["ADMIN", "OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const membershipId = await resolveMembershipId(fastify.prisma, request.jwtPayload!.uid, centerId);
        const result = await controller.resolveFlag(
          centerId,
          request.params.id,
          request.body.action,
          membershipId,
          request.body.redactedText,
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "Moderation flag not found") {
            return reply.status(404).send({ message: "Moderation flag not found" });
          }
          if (error.message === "Flag has already been resolved") {
            return reply.status(400).send({ message: error.message });
          }
          if (error.message.includes("redactedText is required")) {
            return reply.status(400).send({ message: error.message });
          }
        }
        throw error;
      }
    },
  );

  // GET /api/v1/moderation/terms — Get center's term list
  api.get(
    "/terms",
    {
      schema: {
        response: {
          200: TermsResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["ADMIN", "OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const result = await controller.getTermList(centerId);
      return reply.send(result);
    },
  );

  // PUT /api/v1/moderation/terms — Replace center's term list (OWNER only)
  api.put(
    "/terms",
    {
      schema: {
        body: z.object({
          terms: z
            .array(z.string().max(100, "Each term must be at most 100 characters"))
            .max(500, "Maximum 500 terms per center"),
        }),
        response: {
          200: TermsResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      try {
        const membershipId = await resolveMembershipId(fastify.prisma, request.jwtPayload!.uid, centerId);
        const result = await controller.updateTerms(centerId, request.body.terms, membershipId);
        return reply.send(result);
      } catch (error) {
        return reply.status(400).send({
          message: error instanceof Error ? error.message : "Failed to update term list",
        });
      }
    },
  );

  // POST /api/v1/moderation/terms/reset — Reset to default term list (OWNER only)
  api.post(
    "/terms/reset",
    {
      schema: {
        response: {
          200: TermsResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const membershipId = await resolveMembershipId(fastify.prisma, request.jwtPayload!.uid, centerId);
      const result = await controller.resetToDefaults(centerId, membershipId);
      return reply.send(result);
    },
  );

  // POST /api/v1/moderation/scan — Manual scan trigger
  api.post(
    "/scan",
    {
      schema: {
        body: ScanContentSchema,
        response: {
          200: ScanResponseSchema,
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["ADMIN", "OWNER"])],
    },
    async (request, reply) => {
      const centerId = request.jwtPayload!.centerId;
      if (!centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const result = await controller.scanContent(centerId, request.body.text);
      return reply.send(result);
    },
  );
}
