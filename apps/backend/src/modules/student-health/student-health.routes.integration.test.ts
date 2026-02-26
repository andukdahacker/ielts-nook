import Fastify, { FastifyInstance } from "fastify";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { studentHealthRoutes } from "./student-health.routes.js";

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}));
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

describe("Student Health Routes Integration", () => {
  let app: FastifyInstance;

  const mockDb = {
    centerMembership: { findMany: vi.fn().mockResolvedValue([]) },
    classStudent: { findMany: vi.fn().mockResolvedValue([]) },
    classSession: { findMany: vi.fn().mockResolvedValue([]) },
    attendance: { findMany: vi.fn().mockResolvedValue([]) },
    assignment: { findMany: vi.fn().mockResolvedValue([]) },
    assignmentStudent: { findMany: vi.fn().mockResolvedValue([]) },
    studentFlag: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  };

  const mockPrisma = {
    $extends: vi.fn(),
    submission: { findMany: vi.fn().mockResolvedValue([]) },
    authAccount: {
      findUnique: vi.fn().mockResolvedValue({ userId: "resolved-user-1" }),
    },
  };

  const mockFirebaseAuth = {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: "firebase-owner-1",
      email: "owner@test.com",
      role: "OWNER",
      center_id: "center-1",
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma.$extends.mockReturnValue(mockDb);

    app = Fastify();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).prisma = mockPrisma;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).firebaseAuth = mockFirebaseAuth;

    await app.register(studentHealthRoutes, {
      prefix: "/api/v1/student-health",
    });
    await app.ready();
  });

  it("should return 200 with correct shape", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/dashboard",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveProperty("students");
    expect(body.data).toHaveProperty("summary");
    expect(body.data.summary).toEqual({
      total: 0,
      atRisk: 0,
      warning: 0,
      onTrack: 0,
    });
    expect(body.message).toBe("Student health dashboard loaded");
  });

  it("should accept classId filter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/dashboard?classId=class-1",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("should return 200 for Teacher role with scoped dashboard", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-teacher-1",
      email: "teacher@test.com",
      role: "TEACHER",
      center_id: "center-1",
    });

    // Teacher scoping: mock class query
    mockDb.class = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/dashboard",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.students).toEqual([]);
  });

  it("should return 401 without auth header", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/dashboard",
    });

    expect(response.statusCode).toBe(401);
  });

  // --- Profile endpoint tests ---

  it("GET /profile/:studentId should return 200 with correct shape", async () => {
    mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
      id: "membership-1",
      centerId: "center-1",
      userId: "student-1",
      role: "STUDENT",
      status: "ACTIVE",
      user: {
        id: "student-1",
        name: "Alice",
        email: "alice@test.com",
        avatarUrl: null,
      },
    });
    mockDb.classStudent.findMany.mockResolvedValue([]);
    mockDb.classSession.findMany.mockResolvedValue([]);
    mockDb.attendance.findMany.mockResolvedValue([]);
    mockDb.assignment.findMany.mockResolvedValue([]);
    mockDb.assignmentStudent.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/profile/student-1",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveProperty("student");
    expect(body.data).toHaveProperty("attendanceHistory");
    expect(body.data).toHaveProperty("assignmentHistory");
    expect(body.data).toHaveProperty("weeklyTrends");
    expect(body.message).toBe("Student profile loaded");
  });

  it("GET /profile/:studentId should return 404 for unknown student", async () => {
    mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/profile/unknown-id",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Student not found");
  });

  it("GET /profile/:studentId should return 200 for Teacher with access", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-teacher-1",
      email: "teacher@test.com",
      role: "TEACHER",
      center_id: "center-1",
    });

    // Teacher has access to student's class
    mockDb.classStudent.findFirst = vi.fn().mockResolvedValue({
      classId: "c1",
      studentId: "student-1",
    });
    mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
      id: "membership-1",
      centerId: "center-1",
      userId: "student-1",
      role: "STUDENT",
      status: "ACTIVE",
      user: {
        id: "student-1",
        name: "Alice",
        email: "alice@test.com",
        avatarUrl: null,
      },
    });
    mockDb.classStudent.findMany.mockResolvedValue([]);
    mockDb.classSession.findMany.mockResolvedValue([]);
    mockDb.attendance.findMany.mockResolvedValue([]);
    mockDb.assignment.findMany.mockResolvedValue([]);
    mockDb.assignmentStudent.findMany.mockResolvedValue([]);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/profile/student-1",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
  });

  it("GET /profile/:studentId should return 403 for Teacher without access", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-teacher-1",
      email: "teacher@test.com",
      role: "TEACHER",
      center_id: "center-1",
    });

    // Teacher does NOT have access
    mockDb.classStudent.findFirst = vi.fn().mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/profile/student-1",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(403);
  });

  it("GET /profile/:studentId should return 401 without auth", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/profile/student-1",
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 400 when centerId is null", async () => {
    mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
      uid: "firebase-owner-1",
      email: "owner@test.com",
      role: "OWNER",
      center_id: null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/student-health/dashboard",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Center ID required");
  });

  // --- Intervention route tests ---

  describe("POST /interventions", () => {
    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId: "center-1",
        userId: "student-1",
        role: "STUDENT",
        status: "ACTIVE",
      });
      mockDb.interventionLog = {
        create: vi.fn().mockResolvedValue({ id: "il-1" }),
        findMany: vi.fn().mockResolvedValue([]),
      };
      mockPrisma.center = {
        findUnique: vi.fn().mockResolvedValue({ name: "Test Center" }),
      };
    });

    it("should return 201 with valid payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/student-health/interventions",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          studentId: "student-1",
          recipientEmail: "parent@test.com",
          subject: "Concern about Alice",
          body: "Email body here",
          templateUsed: "concern-attendance",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        data: { interventionId: "il-1", status: "pending" },
        message: "Intervention email queued",
      });
    });

    it("should return 404 for unknown student", async () => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/student-health/interventions",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          studentId: "unknown",
          recipientEmail: "parent@test.com",
          subject: "Test",
          body: "Test body",
          templateUsed: "concern-general",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("Student not found");
    });

    it("should return 403 for Teacher role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/student-health/interventions",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          studentId: "student-1",
          recipientEmail: "parent@test.com",
          subject: "Test",
          body: "Test body",
          templateUsed: "concern-general",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /interventions/:studentId", () => {
    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId: "center-1",
        userId: "student-1",
        role: "STUDENT",
        status: "ACTIVE",
      });
      mockDb.interventionLog = {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      };
    });

    it("should return 200 with intervention history", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/student-health/interventions/student-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        data: [],
        message: "ok",
      });
    });
  });

  describe("GET /dashboard/teacher-widget", () => {
    it("should return 200 for TEACHER role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      mockDb.class = {
        findMany: vi.fn().mockResolvedValue([]),
      };

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/student-health/dashboard/teacher-widget",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        data: {
          students: [],
          summary: { total: 0, atRisk: 0, warning: 0, onTrack: 0 },
          classBreakdown: [],
        },
        message: "ok",
      });
    });

    it("should return 403 for OWNER role (teacher-only)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/student-health/dashboard/teacher-widget",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("POST /flags", () => {
    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId: "center-1",
        userId: "student-1",
        role: "STUDENT",
        status: "ACTIVE",
        user: { name: "Alice" },
      });
      mockDb.studentFlag = {
        create: vi.fn().mockResolvedValue({ id: "flag-1" }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        update: vi.fn(),
      };
      mockDb.notification = {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      };
      mockPrisma.user = {
        findUnique: vi.fn().mockResolvedValue({ name: "Teacher" }),
      };
    });

    it("should return 201 for TEACHER role with access to student", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      // Teacher has access to the student's class
      mockDb.classStudent.findFirst = vi.fn().mockResolvedValue({
        classId: "c1",
        studentId: "student-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/student-health/flags",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          studentId: "student-1",
          note: "This student needs admin attention urgently",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        data: { flagId: "flag-1", status: "OPEN" },
        message: "Student flagged for admin review",
      });
    });

    it("should return 403 for TEACHER without access to student", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      // Teacher does NOT have access to the student
      mockDb.classStudent.findFirst = vi.fn().mockResolvedValue(null);

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/student-health/flags",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          studentId: "student-1",
          note: "This student needs admin attention urgently",
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toBe("You can only flag students in your classes");
    });

    it("should return 403 for STUDENT role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-student-1",
        email: "student@test.com",
        role: "STUDENT",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/v1/student-health/flags",
        headers: { authorization: "Bearer valid-token" },
        payload: {
          studentId: "student-1",
          note: "This student needs admin attention urgently",
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /flags/:studentId", () => {
    it("should return 200 with flags list", async () => {
      mockDb.studentFlag = {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      };

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/student-health/flags/student-1",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        data: [],
        message: "ok",
      });
    });
  });

  describe("PATCH /flags/:flagId/resolve", () => {
    beforeEach(() => {
      mockDb.studentFlag = {
        findFirst: vi.fn().mockResolvedValue({ id: "flag-1" }),
        update: vi.fn().mockResolvedValue({
          id: "flag-1",
          status: "RESOLVED",
        }),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      };
    });

    it("should return 200 for OWNER role", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/student-health/flags/flag-1/resolve",
        headers: { authorization: "Bearer valid-token" },
        payload: { resolvedNote: "Issue addressed" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        data: { flagId: "flag-1", status: "RESOLVED" },
        message: "Flag resolved",
      });
    });

    it("should return 403 for TEACHER role", async () => {
      mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
        uid: "firebase-teacher-1",
        email: "teacher@test.com",
        role: "TEACHER",
        center_id: "center-1",
      });

      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/student-health/flags/flag-1/resolve",
        headers: { authorization: "Bearer valid-token" },
        payload: {},
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("GET /interventions/:studentId/preview", () => {
    beforeEach(() => {
      mockDb.centerMembership.findFirst = vi.fn().mockResolvedValue({
        id: "membership-s1",
        centerId: "center-1",
        userId: "student-1",
        role: "STUDENT",
        status: "ACTIVE",
        user: {
          id: "student-1",
          name: "Alice",
          email: "alice@test.com",
          avatarUrl: null,
          preferredLanguage: "en",
        },
      });
      mockDb.classStudent.findMany.mockResolvedValue([]);
      mockDb.classSession.findMany.mockResolvedValue([]);
      mockDb.attendance.findMany.mockResolvedValue([]);
      mockDb.assignment.findMany.mockResolvedValue([]);
      mockDb.assignmentStudent.findMany.mockResolvedValue([]);
      mockPrisma.center = {
        findUnique: vi.fn().mockResolvedValue({ name: "Test Center" }),
      };
      mockPrisma.parentEmail = {
        findMany: vi.fn().mockResolvedValue([{ email: "parent@test.com" }]),
      };
    });

    it("should return 200 with email preview", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/student-health/interventions/student-1/preview",
        headers: { authorization: "Bearer valid-token" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveProperty("recipientEmail");
      expect(body.data).toHaveProperty("subject");
      expect(body.data).toHaveProperty("body");
      expect(body.data).toHaveProperty("templateUsed");
      expect(body.message).toBe("ok");
    });

    it("should return 401 without auth", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/student-health/interventions/student-1/preview",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
