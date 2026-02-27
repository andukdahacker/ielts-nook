import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BillingService } from "./billing.service.js";
import { BillingController } from "./billing.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import {
  BillingOverviewSchema,
  PaymentHistorySchema,
  UsageHistorySchema,
  CheckoutRequestSchema,
  CheckoutResponseSchema,
  ErrorResponseSchema,
} from "@workspace/types";

export async function billingRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  // Group-level auth
  api.addHook("preHandler", authMiddleware);

  // Instantiate service → controller
  const service = new BillingService(fastify.prisma);
  const controller = new BillingController(service);

  // GET /api/v1/billing — Billing overview
  api.get(
    "/",
    {
      schema: {
        response: {
          200: z.object({
            data: BillingOverviewSchema,
            message: z.string(),
          }),
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const payload = request.jwtPayload!;
      if (!payload.centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const result = await controller.getBillingOverview(payload.centerId);
      return reply.send(result);
    },
  );

  // GET /api/v1/billing/payments — Payment history
  api.get(
    "/payments",
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(50).default(10),
        }),
        response: {
          200: z.object({
            data: PaymentHistorySchema,
            message: z.string(),
          }),
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const payload = request.jwtPayload!;
      if (!payload.centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const { page, limit } = request.query;
      const result = await controller.getPaymentHistory(payload.centerId, page, limit);
      return reply.send(result);
    },
  );

  // GET /api/v1/billing/usage — Usage chart data
  api.get(
    "/usage",
    {
      schema: {
        response: {
          200: z.object({
            data: UsageHistorySchema,
            message: z.string(),
          }),
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const payload = request.jwtPayload!;
      if (!payload.centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const result = await controller.getUsageHistory(payload.centerId);
      return reply.send(result);
    },
  );

  // POST /api/v1/billing/checkout — Create Polar.sh checkout session
  api.post(
    "/checkout",
    {
      schema: {
        body: CheckoutRequestSchema,
        response: {
          200: z.object({
            data: CheckoutResponseSchema,
            message: z.string(),
          }),
          400: ErrorResponseSchema,
        },
      },
      preHandler: [requireRole(["OWNER"])],
    },
    async (request, reply) => {
      const payload = request.jwtPayload!;
      if (!payload.centerId) {
        return reply.status(400).send({ message: "No center associated" });
      }
      const { tier } = request.body;
      const result = await controller.createCheckout(
        payload.centerId,
        payload.email,
        tier,
      );
      return reply.send(result);
    },
  );
}
