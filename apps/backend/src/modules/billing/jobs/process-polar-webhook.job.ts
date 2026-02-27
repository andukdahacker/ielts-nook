import { inngest } from "../../inngest/client.js";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { BillingService } from "../billing.service.js";

const SUBSCRIPTION_EVENTS = [
  "subscription.created",
  "subscription.active",
  "subscription.updated",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
  "subscription.past_due",
];

export const processPolarWebhookJob = inngest.createFunction(
  {
    id: "process-polar-webhook",
    retries: 5,
  },
  { event: "billing/polar.webhook.received" },
  async ({ event, step }) => {
    const { eventType, payload } = event.data;

    if (SUBSCRIPTION_EVENTS.includes(eventType)) {
      await step.run("process-subscription-event", async () => {
        const prisma = createPrisma();
        try {
          const service = new BillingService(prisma);
          await service.handleSubscriptionEvent(eventType, payload);
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    if (eventType === "order.paid") {
      await step.run("process-order-paid", async () => {
        const prisma = createPrisma();
        try {
          const service = new BillingService(prisma);
          await service.handleOrderPaidEvent(payload);
        } finally {
          await prisma.$disconnect();
        }
      });
    }

    return { status: "processed", eventType };
  },
);
