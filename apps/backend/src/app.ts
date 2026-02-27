import fastifyCookie from "@fastify/cookie";
import fastifyEnv from "@fastify/env";
import { FastifyInstance } from "fastify";
import {
  ZodTypeProvider,
  validatorCompiler,
  serializerCompiler,
  jsonSchemaTransform,
} from "fastify-type-provider-zod";
import { Server, IncomingMessage, ServerResponse } from "http";
import Env from "./env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { tenantRoutes } from "./modules/tenants/tenant.routes.js";
import { invitationRoutes } from "./modules/tenants/invitation.routes.js";
import { coursesRoutes } from "./modules/logistics/courses.routes.js";
import { classesRoutes } from "./modules/logistics/classes.routes.js";
import { schedulesRoutes } from "./modules/logistics/schedules.routes.js";
import { sessionsRoutes } from "./modules/logistics/sessions.routes.js";
import { attendanceRoutes } from "./modules/logistics/attendance.routes.js";
import { roomsRoutes } from "./modules/logistics/rooms.routes.js";
import { exercisesRoutes } from "./modules/exercises/exercises.routes.js";
import { sectionsRoutes } from "./modules/exercises/sections.routes.js";
import { tagsRoutes } from "./modules/exercises/tags.routes.js";
import { aiGenerationRoutes } from "./modules/exercises/ai-generation.routes.js";
import { mockTestRoutes } from "./modules/mock-tests/mock-tests.routes.js";
import { assignmentsRoutes } from "./modules/assignments/assignments.routes.js";
import { studentAssignmentsRoutes } from "./modules/assignments/student-assignments.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { unsubscribeRoutes } from "./modules/users/unsubscribe.routes.js";
import { submissionsRoutes } from "./modules/submissions/submissions.routes.js";
import { gradingRoutes } from "./modules/grading/grading.routes.js";
import { studentHealthRoutes } from "./modules/student-health/index.js";
import { inngestRoutes } from "./modules/inngest/inngest.routes.js";
import { billingRoutes } from "./modules/billing/billing.routes.js";
import { billingWebhookRoutes } from "./modules/billing/billing.webhook.routes.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import firebasePlugin from "./plugins/firebase.plugin.js";
import prismaPlugin from "./plugins/prisma.plugin.js";
import resendPlugin from "./plugins/resend.plugin.js";
import rawBody from "fastify-raw-body";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify from "fastify";

export const buildApp = async () => {
  const app: FastifyInstance<Server, IncomingMessage, ServerResponse> = Fastify(
    {
      logger: true,
    },
  ).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(fastifyEnv, {
    dotenv: true,
    schema: {
      type: "object",
      required: [
        "PORT",
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "PLATFORM_ADMIN_API_KEY",
      ],
      properties: {
        NODE_ENV: {
          type: "string",
        },
        PORT: {
          type: "number",
        },
        DATABASE_URL: {
          type: "string",
        },
        JWT_SECRET: {
          type: "string",
        },
        FIREBASE_PROJECT_ID: {
          type: "string",
        },
        FIREBASE_CLIENT_EMAIL: {
          type: "string",
        },
        FIREBASE_PRIVATE_KEY: {
          type: "string",
        },
        FIREBASE_API_KEY: {
          type: "string",
        },
        RESEND_API_KEY: {
          type: "string",
        },
        PLATFORM_ADMIN_API_KEY: {
          type: "string",
        },
        FIREBASE_STORAGE_BUCKET: {
          type: "string",
        },
        EMAIL_FROM: {
          type: "string",
        },
        GEMINI_API_KEY: {
          type: "string",
        },
        GEMINI_MODEL: {
          type: "string",
        },
        POLAR_ACCESS_TOKEN: {
          type: "string",
        },
        POLAR_WEBHOOK_SECRET: {
          type: "string",
        },
        POLAR_PRODUCT_ID_STARTER: {
          type: "string",
        },
        POLAR_PRODUCT_ID_GROWTH: {
          type: "string",
        },
        POLAR_PRODUCT_ID_ENTERPRISE: {
          type: "string",
        },
        POLAR_MODE: {
          type: "string",
        },
        FRONTEND_URL: {
          type: "string",
        },
      },
    },
  });

  const env = app.getEnvs<Env>();

  app.register(cors, {
    origin:
      env.NODE_ENV == "production"
        ? ["https://my.classlite.app", "https://my-staging.classlite.app"]
        : [
            "https://my-staging.classlite.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4321",
            "http://127.0.0.1:4321",
          ],
    credentials: true,
    maxAge: 86400,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Platform-Admin-Key",
    ],
  });

  app.register(helmet, {
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  await app.register(rateLimit, {
    max: env.NODE_ENV === "production" ? 100 : 10000,
    timeWindow: "1 minute",
    allowList: (request: { method: string }) => request.method === "OPTIONS",
  });

  app.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "ClassLite API",
        description: "ClassLite API",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local server",
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "apiKey",
            in: "header",
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  app.register(firebasePlugin, {
    credential: {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY
        ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined,
    },
  });

  app.register(prismaPlugin);

  app.register(resendPlugin, {
    apiKey: env.RESEND_API_KEY,
  });

  app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB — matches photo upload limit
    },
  });

  await app.register(fastifyCookie);

  // Raw body support for webhook signature verification (global: false = per-route opt-in)
  await app.register(rawBody, { global: false, runFirst: true });

  // Health check (no auth required)
  await app.register(healthRoutes, { prefix: "/api/v1" });

  // Register routes
  await app.register(tenantRoutes, { prefix: "/api/v1/tenants" });
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(invitationRoutes, { prefix: "/api/v1/invitations" });
  await app.register(coursesRoutes, { prefix: "/api/v1/logistics/courses" });
  await app.register(classesRoutes, { prefix: "/api/v1/logistics/classes" });
  await app.register(schedulesRoutes, { prefix: "/api/v1/logistics/schedules" });
  await app.register(sessionsRoutes, { prefix: "/api/v1/logistics/sessions" });
  await app.register(attendanceRoutes, { prefix: "/api/v1/logistics" });
  await app.register(roomsRoutes, { prefix: "/api/v1/logistics/rooms" });
  await app.register(exercisesRoutes, { prefix: "/api/v1/exercises" });
  await app.register(sectionsRoutes, { prefix: "/api/v1/exercises" });
  await app.register(aiGenerationRoutes, { prefix: "/api/v1/exercises" });
  await app.register(tagsRoutes, { prefix: "/api/v1/tags" });
  await app.register(mockTestRoutes, { prefix: "/api/v1/mock-tests" });
  await app.register(assignmentsRoutes, { prefix: "/api/v1/assignments" });
  await app.register(studentAssignmentsRoutes, { prefix: "/api/v1/student/assignments" });
  await app.register(submissionsRoutes, { prefix: "/api/v1/student/submissions" });
  await app.register(gradingRoutes, { prefix: "/api/v1/grading" });
  await app.register(studentHealthRoutes, { prefix: "/api/v1/student-health" });
  await app.register(notificationsRoutes, { prefix: "/api/v1/notifications" });
  await app.register(usersRoutes, { prefix: "/api/v1/users" });
  await app.register(billingRoutes, { prefix: "/api/v1/billing" });

  // Public unsubscribe routes (no auth required)
  await app.register(unsubscribeRoutes, { prefix: "/api/v1/unsubscribe" });

  // Public webhook routes (no auth — Polar.sh verifies via webhook signature)
  await app.register(billingWebhookRoutes, { prefix: "/api/v1/billing/webhooks/polar" });

  // Inngest background job routes (no prefix - uses /api/inngest)
  await app.register(inngestRoutes);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    return reply.status(500).send({
      message: "Internal server error",
    });
  });

  return app;
};
