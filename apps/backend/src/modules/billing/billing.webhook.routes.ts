import { FastifyInstance } from "fastify";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { inngest } from "../inngest/client.js";

export async function billingWebhookRoutes(fastify: FastifyInstance) {
  // NO authMiddleware — this is called by Polar.sh
  fastify.post(
    "/",
    { config: { rawBody: true } },
    async (request, reply) => {
      const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
      if (!webhookSecret) {
        request.log.error("POLAR_WEBHOOK_SECRET not configured");
        return reply.code(500).send({ message: "Webhook not configured" });
      }

      try {
        const event = validateEvent(
          request.rawBody as string,
          request.headers as Record<string, string>,
          webhookSecret,
        );

        // Offload to Inngest for reliable processing
        await inngest.send({
          name: "billing/polar.webhook.received",
          data: {
            eventType: event.type,
            payload: event.data,
          },
        });

        return reply.code(202).send("");
      } catch (error) {
        if (error instanceof WebhookVerificationError) {
          return reply.code(403).send({ message: "Invalid webhook signature" });
        }
        throw error;
      }
    },
  );
}
