import {
  CreateAttendanceInputSchema,
  CreateAttendanceInput,
  BulkAttendanceInputSchema,
  BulkAttendanceInput,
  SessionAttendanceDataResponseSchema,
  AttendanceResponseSchema,
  BulkAttendanceResponseSchema,
  AttendanceStatsResponseSchema,
  AttendanceHistoryResponseSchema,
  ErrorResponseSchema,
} from "@workspace/types";
import { getTenantedClient } from "@workspace/db";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { AttendanceController } from "./attendance.controller.js";
import { AttendanceService } from "./attendance.service.js";
import z from "zod";

/**
 * RBAC middleware for checking teacher access to a session.
 * - OWNER/ADMIN: always allowed
 * - TEACHER: only if assigned to the class
 * - STUDENT: forbidden
 */
async function checkTeacherSessionAccess(
  request: FastifyRequest<{ Params: { sessionId: string } }>,
  reply: FastifyReply,
) {
  const { sessionId } = request.params;
  const { centerId, uid, role } = request.jwtPayload!;

  // OWNER and ADMIN have full access
  if (role === "OWNER" || role === "ADMIN") {
    return;
  }

  // STUDENT cannot access attendance marking
  if (role === "STUDENT") {
    return reply.status(403).send({
      error: { code: "FORBIDDEN", message: "Students cannot access attendance" },
    });
  }

  // TEACHER can only access sessions for classes they teach
  if (role === "TEACHER") {
    if (!centerId) {
      return reply.status(400).send({
        error: { code: "BAD_REQUEST", message: "Center ID missing from token" },
      });
    }

    const db = getTenantedClient(request.server.prisma, centerId);
    const session = await db.classSession.findUnique({
      where: { id: sessionId },
      include: { class: { select: { teacherId: true } } },
    });

    if (!session) {
      return reply.status(404).send({
        error: { code: "NOT_FOUND", message: "Session not found" },
      });
    }

    if (session.class.teacherId !== uid) {
      return reply.status(403).send({
        error: { code: "FORBIDDEN", message: "Access denied - not assigned to this class" },
      });
    }
  }
}

export async function attendanceRoutes(fastify: FastifyInstance) {
  const api = fastify.withTypeProvider<ZodTypeProvider>();

  const attendanceService = new AttendanceService(fastify.prisma);
  const attendanceController = new AttendanceController(attendanceService);

  // All attendance routes require authentication
  fastify.addHook("preHandler", authMiddleware);

  // === Session-based attendance routes ===

  // GET /sessions/:sessionId/attendance - Get attendance for a session
  api.get("/sessions/:sessionId/attendance", {
    schema: {
      params: z.object({
        sessionId: z.string(),
      }),
      response: {
        200: SessionAttendanceDataResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"]), checkTeacherSessionAccess],
    handler: async (
      request: FastifyRequest<{ Params: { sessionId: string } }>,
      reply,
    ) => {
      const result = await attendanceController.getSessionAttendance(
        request.params.sessionId,
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });

  // POST /sessions/:sessionId/attendance - Mark attendance for a single student
  api.post("/sessions/:sessionId/attendance", {
    schema: {
      params: z.object({
        sessionId: z.string(),
      }),
      body: CreateAttendanceInputSchema,
      response: {
        200: AttendanceResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"]), checkTeacherSessionAccess],
    handler: async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: CreateAttendanceInput;
      }>,
      reply,
    ) => {
      const result = await attendanceController.markAttendance(
        request.params.sessionId,
        request.body,
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });

  // POST /sessions/:sessionId/attendance/bulk - Bulk mark attendance for all enrolled students
  api.post("/sessions/:sessionId/attendance/bulk", {
    schema: {
      params: z.object({
        sessionId: z.string(),
      }),
      body: BulkAttendanceInputSchema,
      response: {
        200: BulkAttendanceResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"]), checkTeacherSessionAccess],
    handler: async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: BulkAttendanceInput;
      }>,
      reply,
    ) => {
      const result = await attendanceController.markBulkAttendance(
        request.params.sessionId,
        request.body,
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });

  // === Student-based attendance routes (for Health Dashboard) ===

  // GET /students/:studentId/attendance-stats - Get attendance statistics for a student
  api.get("/students/:studentId/attendance-stats", {
    schema: {
      params: z.object({
        studentId: z.string(),
      }),
      querystring: z.object({
        startDate: z.string().datetime({ offset: true }).optional(),
        endDate: z.string().datetime({ offset: true }).optional(),
      }),
      response: {
        200: AttendanceStatsResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{
        Params: { studentId: string };
        Querystring: { startDate?: string; endDate?: string };
      }>,
      reply,
    ) => {
      const result = await attendanceController.getStudentAttendanceStats(
        request.params.studentId,
        request.jwtPayload!,
        request.query.startDate,
        request.query.endDate,
      );
      return reply.send(result);
    },
  });

  // GET /students/:studentId/attendance - Get attendance history for a student
  api.get("/students/:studentId/attendance", {
    schema: {
      params: z.object({
        studentId: z.string(),
      }),
      querystring: z.object({
        startDate: z.string().datetime({ offset: true }).optional(),
        endDate: z.string().datetime({ offset: true }).optional(),
      }),
      response: {
        200: AttendanceHistoryResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{
        Params: { studentId: string };
        Querystring: { startDate?: string; endDate?: string };
      }>,
      reply,
    ) => {
      const result = await attendanceController.getStudentAttendanceHistory(
        request.params.studentId,
        request.jwtPayload!,
        request.query.startDate,
        request.query.endDate,
      );
      return reply.send(result);
    },
  });

  // === Class-based attendance routes ===

  // GET /classes/:classId/attendance/stats - Get aggregate attendance stats for a class
  api.get("/classes/:classId/attendance/stats", {
    schema: {
      params: z.object({
        classId: z.string(),
      }),
      response: {
        200: z.object({
          data: z.object({
            totalStudents: z.number(),
            totalSessions: z.number(),
            averageAttendancePercentage: z.number(),
          }),
          message: z.string(),
        }),
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
    },
    preHandler: [requireRole(["OWNER", "ADMIN", "TEACHER"])],
    handler: async (
      request: FastifyRequest<{ Params: { classId: string } }>,
      reply,
    ) => {
      const result = await attendanceController.getClassAttendanceStats(
        request.params.classId,
        request.jwtPayload!,
      );
      return reply.send(result);
    },
  });
}
