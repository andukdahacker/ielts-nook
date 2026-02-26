import { PrismaClient, getTenantedClient } from "@workspace/db";
import type {
  HealthStatus,
  StudentHealthCard,
  StudentHealthDashboardResponse,
  StudentProfileResponse,
  InterventionLogRecord,
  InterventionEmailPreview,
  InterventionTemplate,
  TeacherAtRiskWidgetResponse,
  StudentFlagRecord,
} from "@workspace/types";
import { AppError } from "../../errors/app-error.js";
import { inngest } from "../inngest/client.js";
import {
  buildInterventionEmailSubject,
  buildInterventionEmailPreviewText,
  wrapPlainTextInEmailHtml,
} from "./emails/intervention.template.js";

const ATTENDANCE_THRESHOLDS = { AT_RISK: 80, WARNING: 90 } as const;
const COMPLETION_THRESHOLDS = { AT_RISK: 50, WARNING: 75 } as const;

const STATUS_PRIORITY: Record<HealthStatus, number> = {
  "at-risk": 0,
  warning: 1,
  "on-track": 2,
};

function computeAttendanceStatus(rate: number): HealthStatus {
  if (rate < ATTENDANCE_THRESHOLDS.AT_RISK) return "at-risk";
  if (rate < ATTENDANCE_THRESHOLDS.WARNING) return "warning";
  return "on-track";
}

function computeCompletionStatus(rate: number): HealthStatus {
  if (rate < COMPLETION_THRESHOLDS.AT_RISK) return "at-risk";
  if (rate < COMPLETION_THRESHOLDS.WARNING) return "warning";
  return "on-track";
}

function worstStatus(a: HealthStatus, b: HealthStatus): HealthStatus {
  return STATUS_PRIORITY[a] <= STATUS_PRIORITY[b] ? a : b;
}

export class StudentHealthService {
  constructor(private readonly prisma: PrismaClient) {}

  async getDashboard(
    centerId: string,
    filters: { classId?: string; search?: string },
    teacherUserId?: string,
  ): Promise<StudentHealthDashboardResponse> {
    const db = getTenantedClient(this.prisma, centerId);
    const now = new Date();

    // Teacher scoping: get teacher's class IDs first
    let teacherClassIds: string[] | undefined;
    if (teacherUserId) {
      const teacherClasses = await db.class.findMany({
        where: { teacherId: teacherUserId },
        select: { id: true },
      });
      teacherClassIds = teacherClasses.map((c) => c.id);
      if (teacherClassIds.length === 0) {
        return {
          students: [],
          summary: { total: 0, atRisk: 0, warning: 0, onTrack: 0 },
        };
      }
    }

    // Step A — Get all active students in center
    const memberships = await db.centerMembership.findMany({
      where: {
        role: "STUDENT",
        status: "ACTIVE",
        ...(filters.search
          ? { user: { name: { contains: filters.search, mode: "insensitive" } } }
          : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const studentIds = memberships.map((m) => m.user.id);
    if (studentIds.length === 0) {
      return {
        students: [],
        summary: { total: 0, atRisk: 0, warning: 0, onTrack: 0 },
      };
    }

    // Build class filter: intersection of teacher's classes + optional classId filter
    const classFilter = filters.classId
      ? teacherClassIds
        ? teacherClassIds.includes(filters.classId)
          ? [filters.classId]
          : [] // Teacher can only filter within their classes
        : [filters.classId]
      : teacherClassIds;

    // If teacher filtering resulted in empty class list, return empty
    if (classFilter && classFilter.length === 0) {
      return {
        students: [],
        summary: { total: 0, atRisk: 0, warning: 0, onTrack: 0 },
      };
    }

    // Step B — Get enrollment data
    const enrollments = await db.classStudent.findMany({
      where: {
        studentId: { in: studentIds },
        ...(classFilter ? { classId: { in: classFilter } } : {}),
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    });

    // Build enrollment map: studentId -> classes
    const enrollmentMap = new Map<string, Array<{ id: string; name: string }>>();
    for (const e of enrollments) {
      const classes = enrollmentMap.get(e.studentId) ?? [];
      classes.push({ id: e.class.id, name: e.class.name });
      enrollmentMap.set(e.studentId, classes);
    }

    // If classId or teacher filter, only include students enrolled in those classes
    const filteredStudentIds = classFilter
      ? studentIds.filter((id) => enrollmentMap.has(id))
      : studentIds;

    if (filteredStudentIds.length === 0) {
      return {
        students: [],
        summary: { total: 0, atRisk: 0, warning: 0, onTrack: 0 },
      };
    }

    // Step C — Compute attendance metrics (batched)
    const [sessions, attendanceRecords] = await Promise.all([
      db.classSession.findMany({
        where: { startTime: { lte: now }, status: { not: "CANCELLED" } },
        select: { id: true, classId: true },
      }),
      db.attendance.findMany({
        where: { studentId: { in: filteredStudentIds } },
        select: { studentId: true, sessionId: true, status: true },
      }),
    ]);

    // Build session-to-class map
    const sessionClassMap = new Map<string, string>();
    for (const s of sessions) {
      sessionClassMap.set(s.id, s.classId);
    }

    // Build attendance lookup: studentId -> Set of attended sessionIds
    const attendanceLookup = new Map<string, Set<string>>();
    for (const a of attendanceRecords) {
      if (a.status === "PRESENT" || a.status === "LATE" || a.status === "EXCUSED") {
        const set = attendanceLookup.get(a.studentId) ?? new Set();
        set.add(a.sessionId);
        attendanceLookup.set(a.studentId, set);
      }
    }

    // Step D — Compute assignment completion metrics (batched)
    const [assignments, assignmentStudents, submissions] = await Promise.all([
      db.assignment.findMany({
        where: { status: { in: ["OPEN", "CLOSED", "ARCHIVED"] } },
        select: { id: true, classId: true, dueDate: true },
      }),
      db.assignmentStudent.findMany({
        where: { studentId: { in: filteredStudentIds } },
        select: { assignmentId: true, studentId: true },
      }),
      // Submission is not in TENANTED_MODELS, so filter by centerId explicitly
      this.prisma.submission.findMany({
        where: {
          centerId,
          studentId: { in: filteredStudentIds },
          status: { in: ["SUBMITTED", "AI_PROCESSING", "GRADED"] },
        },
        select: { studentId: true, assignmentId: true },
      }),
    ]);

    // Build assignment-student direct entries map: studentId -> Set<assignmentId>
    const directAssignmentMap = new Map<string, Set<string>>();
    for (const as of assignmentStudents) {
      const set = directAssignmentMap.get(as.studentId) ?? new Set();
      set.add(as.assignmentId);
      directAssignmentMap.set(as.studentId, set);
    }

    // Build submission lookup: studentId -> Set<assignmentId>
    const submissionLookup = new Map<string, Set<string>>();
    for (const s of submissions) {
      const set = submissionLookup.get(s.studentId) ?? new Set();
      set.add(s.assignmentId);
      submissionLookup.set(s.studentId, set);
    }

    // Query open flags for all students (for admin badge display)
    const openFlags = await db.studentFlag.findMany({
      where: {
        studentId: { in: filteredStudentIds },
        status: "OPEN",
      },
      select: { studentId: true },
    });
    const flaggedStudentIds = new Set(openFlags.map((f) => f.studentId));

    // Build per-student data
    const membershipLookup = new Map(
      memberships
        .filter((m) => filteredStudentIds.includes(m.user.id))
        .map((m) => [m.user.id, m.user]),
    );

    const students: StudentHealthCard[] = [];

    for (const studentId of filteredStudentIds) {
      const user = membershipLookup.get(studentId);
      if (!user) continue;

      const studentClasses = enrollmentMap.get(studentId) ?? [];
      const studentClassIds = new Set(studentClasses.map((c) => c.id));

      // Attendance computation
      const expectedSessionIds = sessions
        .filter((s) => studentClassIds.has(s.classId))
        .map((s) => s.id);
      const attendedSet = attendanceLookup.get(studentId) ?? new Set();
      const attendedCount = expectedSessionIds.filter((sid) =>
        attendedSet.has(sid),
      ).length;
      const totalSessions = expectedSessionIds.length;
      const attendanceRate =
        totalSessions === 0
          ? 100
          : Math.round((attendedCount / totalSessions) * 1000) / 10;
      const attendanceStatus = computeAttendanceStatus(attendanceRate);

      // Assignment completion computation
      const studentDirectAssignments =
        directAssignmentMap.get(studentId) ?? new Set();
      const relevantAssignments = assignments.filter(
        (a) =>
          (a.classId && studentClassIds.has(a.classId)) ||
          studentDirectAssignments.has(a.id),
      );
      const totalAssignments = relevantAssignments.length;
      const submittedSet = submissionLookup.get(studentId) ?? new Set();
      const completedAssignments = relevantAssignments.filter((a) =>
        submittedSet.has(a.id),
      ).length;
      const overdueAssignments = relevantAssignments.filter(
        (a) => a.dueDate && a.dueDate < now && !submittedSet.has(a.id),
      ).length;
      const assignmentCompletionRate =
        totalAssignments === 0
          ? 100
          : Math.round((completedAssignments / totalAssignments) * 1000) / 10;
      const assignmentStatus = computeCompletionStatus(assignmentCompletionRate);

      // Overall health
      const healthStatus = worstStatus(attendanceStatus, assignmentStatus);

      students.push({
        id: studentId,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        healthStatus,
        metrics: {
          attendanceRate,
          attendanceStatus,
          totalSessions,
          attendedSessions: attendedCount,
          assignmentCompletionRate,
          assignmentStatus,
          totalAssignments,
          completedAssignments,
          overdueAssignments,
        },
        classes: studentClasses,
        hasOpenFlags: flaggedStudentIds.has(studentId),
      });
    }

    // Step F — Sort: at-risk first, then warning, then on-track; alphabetically within group
    students.sort((a, b) => {
      const statusDiff =
        STATUS_PRIORITY[a.healthStatus] - STATUS_PRIORITY[b.healthStatus];
      if (statusDiff !== 0) return statusDiff;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    const summary = {
      total: students.length,
      atRisk: students.filter((s) => s.healthStatus === "at-risk").length,
      warning: students.filter((s) => s.healthStatus === "warning").length,
      onTrack: students.filter((s) => s.healthStatus === "on-track").length,
    };

    return { students, summary };
  }

  async getStudentProfile(
    centerId: string,
    studentId: string,
    teacherUserId?: string,
  ): Promise<StudentProfileResponse> {
    const db = getTenantedClient(this.prisma, centerId);
    const now = new Date();

    // Teacher access check: verify student is in teacher's class
    if (teacherUserId) {
      const hasAccess = await db.classStudent.findFirst({
        where: {
          studentId,
          class: { teacherId: teacherUserId },
        },
      });
      if (!hasAccess) {
        throw AppError.forbidden(
          "You can only view students in your classes",
        );
      }
    }

    // Step A — Validate student exists and belongs to center
    const membership = await db.centerMembership.findFirst({
      where: {
        userId: studentId,
        role: "STUDENT",
        status: "ACTIVE",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
    if (!membership) {
      throw AppError.notFound("Student not found");
    }
    const user = membership.user;

    // Step B — Get enrollment data
    const enrollments = await db.classStudent.findMany({
      where: { studentId },
      include: {
        class: { select: { id: true, name: true } },
      },
    });
    const classes = enrollments.map((e) => ({
      id: e.class.id,
      name: e.class.name,
    }));
    const classIds = classes.map((c) => c.id);

    // Build class name lookup
    const classNameMap = new Map<string, string>();
    for (const c of classes) {
      classNameMap.set(c.id, c.name);
    }

    // Step C — Compute health metrics
    const [allSessions, attendanceRecords] = await Promise.all([
      db.classSession.findMany({
        where: {
          classId: { in: classIds },
          startTime: { lte: now },
          status: { not: "CANCELLED" },
        },
        select: { id: true, classId: true, startTime: true },
      }),
      db.attendance.findMany({
        where: { studentId },
        select: { sessionId: true, status: true },
      }),
    ]);

    const attendanceMap = new Map<string, string>();
    for (const a of attendanceRecords) {
      attendanceMap.set(a.sessionId, a.status);
    }

    const attendedCount = allSessions.filter((s) => {
      const status = attendanceMap.get(s.id);
      return status === "PRESENT" || status === "LATE" || status === "EXCUSED";
    }).length;
    const totalSessions = allSessions.length;
    const attendanceRate =
      totalSessions === 0
        ? 100
        : Math.round((attendedCount / totalSessions) * 1000) / 10;
    const attendanceStatus = computeAttendanceStatus(attendanceRate);

    // Step D+E — Fetch assignments and submissions
    const [allAssignments, directAssignments, submissions] = await Promise.all([
      db.assignment.findMany({
        where: {
          status: { in: ["OPEN", "CLOSED", "ARCHIVED"] },
        },
        include: {
          exercise: { select: { title: true, skill: true } },
          class: { select: { name: true } },
        },
      }),
      db.assignmentStudent.findMany({
        where: { studentId },
        select: { assignmentId: true },
      }),
      this.prisma.submission.findMany({
        where: { centerId, studentId },
        include: {
          feedback: {
            select: { overallScore: true, teacherFinalScore: true },
          },
        },
      }),
    ]);

    const directAssignmentIds = new Set(
      directAssignments.map((a) => a.assignmentId),
    );
    const classIdSet = new Set(classIds);

    const relevantAssignments = allAssignments.filter(
      (a) =>
        (a.classId && classIdSet.has(a.classId)) ||
        directAssignmentIds.has(a.id),
    );

    const submissionMap = new Map<
      string,
      {
        status: string;
        submittedAt: Date | null;
        feedback: {
          overallScore: number | null;
          teacherFinalScore: number | null;
        } | null;
      }
    >();
    for (const s of submissions) {
      submissionMap.set(s.assignmentId, {
        status: s.status,
        submittedAt: s.submittedAt,
        feedback: s.feedback,
      });
    }

    const completedAssignments = relevantAssignments.filter((a) => {
      const sub = submissionMap.get(a.id);
      return (
        sub &&
        (sub.status === "SUBMITTED" ||
          sub.status === "AI_PROCESSING" ||
          sub.status === "GRADED")
      );
    }).length;
    const totalAssignments = relevantAssignments.length;
    const overdueAssignments = relevantAssignments.filter((a) => {
      const sub = submissionMap.get(a.id);
      const hasCompletedSubmission =
        sub &&
        (sub.status === "SUBMITTED" ||
          sub.status === "AI_PROCESSING" ||
          sub.status === "GRADED");
      return a.dueDate && a.dueDate < now && !hasCompletedSubmission;
    }).length;
    const assignmentCompletionRate =
      totalAssignments === 0
        ? 100
        : Math.round((completedAssignments / totalAssignments) * 1000) / 10;
    const assignmentStatus = computeCompletionStatus(assignmentCompletionRate);
    const healthStatus = worstStatus(attendanceStatus, assignmentStatus);

    // Step D — Build attendance history (last 30 sessions)
    const recentSessions = [...allSessions]
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 30);

    const attendanceHistory = recentSessions.map((session) => ({
      sessionId: session.id,
      className: classNameMap.get(session.classId) ?? "Unknown",
      date: session.startTime.toISOString(),
      status: (attendanceMap.get(session.id) ?? "ABSENT") as
        | "PRESENT"
        | "ABSENT"
        | "LATE"
        | "EXCUSED",
    }));

    // Step E — Build assignment history
    const assignmentHistory = relevantAssignments
      .map((a) => {
        const sub = submissionMap.get(a.id);
        let submissionStatus: "not-submitted" | "in-progress" | "submitted" | "graded";
        if (!sub) {
          submissionStatus = "not-submitted";
        } else if (sub.status === "IN_PROGRESS") {
          submissionStatus = "in-progress";
        } else if (
          sub.status === "SUBMITTED" ||
          sub.status === "AI_PROCESSING"
        ) {
          submissionStatus = "submitted";
        } else if (sub.status === "GRADED") {
          submissionStatus = "graded";
        } else {
          submissionStatus = "not-submitted";
        }

        return {
          assignmentId: a.id,
          exerciseTitle: a.exercise.title,
          className: a.class?.name ?? "Individual",
          skill: a.exercise.skill ?? null,
          dueDate: a.dueDate ? a.dueDate.toISOString() : "",
          submissionStatus,
          score:
            sub?.feedback?.teacherFinalScore ??
            sub?.feedback?.overallScore ??
            null,
          submittedAt: sub?.submittedAt?.toISOString() ?? null,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
      );

    // Step F — Compute weekly trends (last 8 weeks)
    const weeklyTrends = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(
        weekStart.getDate() - weekStart.getDay() - 7 * i + 1,
      ); // Monday
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekLabel = weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      const weekSessions = allSessions.filter(
        (s) => s.startTime >= weekStart && s.startTime < weekEnd,
      );
      const weekAttended = weekSessions.filter((s) => {
        const status = attendanceMap.get(s.id);
        return (
          status === "PRESENT" || status === "LATE" || status === "EXCUSED"
        );
      }).length;
      const weekAttendanceRate =
        weekSessions.length === 0
          ? 100
          : Math.round((weekAttended / weekSessions.length) * 1000) / 10;

      const weekAssignments = relevantAssignments.filter((a) => {
        if (!a.dueDate) return false;
        return a.dueDate >= weekStart && a.dueDate < weekEnd;
      });
      const weekCompleted = weekAssignments.filter((a) => {
        const sub = submissionMap.get(a.id);
        return (
          sub &&
          (sub.status === "SUBMITTED" ||
            sub.status === "AI_PROCESSING" ||
            sub.status === "GRADED")
        );
      }).length;
      const weekCompletionRate =
        weekAssignments.length === 0
          ? 100
          : Math.round((weekCompleted / weekAssignments.length) * 1000) / 10;

      weeklyTrends.push({
        weekStart: weekStart.toISOString(),
        weekLabel,
        attendanceRate: weekAttendanceRate,
        completionRate: weekCompletionRate,
      });
    }

    // Step G — Build response
    return {
      student: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        healthStatus,
        metrics: {
          attendanceRate,
          attendanceStatus,
          totalSessions,
          attendedSessions: attendedCount,
          assignmentCompletionRate,
          assignmentStatus,
          totalAssignments,
          completedAssignments,
          overdueAssignments,
        },
        classes,
      },
      attendanceHistory,
      assignmentHistory,
      weeklyTrends,
    };
  }

  async sendIntervention(
    centerId: string,
    createdById: string,
    payload: {
      studentId: string;
      recipientEmail: string;
      subject: string;
      body: string;
      templateUsed: string;
    },
  ): Promise<{ interventionId: string; status: "pending" }> {
    const db = getTenantedClient(this.prisma, centerId);

    // Validate student exists in center
    const membership = await db.centerMembership.findFirst({
      where: {
        userId: payload.studentId,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    if (!membership) {
      throw AppError.notFound("Student not found");
    }

    // Fetch center name for branded HTML email wrapping
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { name: true },
    });
    const centerName = center?.name ?? "ClassLite";

    // Wrap user's plain text body in branded HTML email template
    const htmlBody = wrapPlainTextInEmailHtml(payload.body, centerName);

    // Create InterventionLog record with rendered HTML
    const log = await db.interventionLog.create({
      data: {
        studentId: payload.studentId,
        centerId,
        createdById,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
        body: htmlBody,
        templateUsed: payload.templateUsed,
        status: "PENDING",
      },
    });

    // Fire Inngest event for background email sending
    await inngest.send({
      name: "student-health/intervention.send",
      data: {
        interventionLogId: log.id,
        centerId,
        recipientEmail: payload.recipientEmail,
        subject: payload.subject,
        body: htmlBody,
      },
    });

    return { interventionId: log.id, status: "pending" };
  }

  async getInterventionHistory(
    centerId: string,
    studentId: string,
  ): Promise<InterventionLogRecord[]> {
    const db = getTenantedClient(this.prisma, centerId);

    // Validate student exists in center
    const membership = await db.centerMembership.findFirst({
      where: {
        userId: studentId,
        role: "STUDENT",
        status: "ACTIVE",
      },
    });
    if (!membership) {
      throw AppError.notFound("Student not found");
    }

    const logs = await db.interventionLog.findMany({
      where: { studentId },
      orderBy: { sentAt: "desc" },
    });

    return logs.map((log) => ({
      id: log.id,
      studentId: log.studentId,
      centerId: log.centerId,
      createdById: log.createdById,
      recipientEmail: log.recipientEmail,
      subject: log.subject,
      body: log.body,
      templateUsed: log.templateUsed,
      status: log.status,
      error: log.error,
      sentAt: log.sentAt.toISOString(),
    }));
  }

  async getEmailPreview(
    centerId: string,
    studentId: string,
  ): Promise<InterventionEmailPreview> {
    const db = getTenantedClient(this.prisma, centerId);

    // Validate student exists in center
    const membership = await db.centerMembership.findFirst({
      where: {
        userId: studentId,
        role: "STUDENT",
        status: "ACTIVE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            preferredLanguage: true,
          },
        },
      },
    });
    if (!membership) {
      throw AppError.notFound("Student not found");
    }

    const user = membership.user;

    // Fetch parent emails from new model (ParentEmail is NOT tenanted — use raw prisma)
    const parentEmails = await this.prisma.parentEmail.findMany({
      where: { userId: studentId, unsubscribed: false },
      select: { email: true },
      orderBy: { createdAt: "asc" },
    });
    const recipientEmail = parentEmails[0]?.email ?? null;

    // Fetch center info for template
    const center = await this.prisma.center.findUnique({
      where: { id: centerId },
      select: { name: true },
    });
    const centerName = center?.name ?? "ClassLite";

    // Compute health metrics to auto-detect template
    const profile = await this.getStudentProfile(centerId, studentId);
    const { metrics, classes } = profile.student;

    // Auto-detect template variant
    let templateUsed: InterventionTemplate;
    if (metrics.attendanceRate < 80) {
      templateUsed = "concern-attendance";
    } else if (metrics.assignmentCompletionRate < 50) {
      templateUsed = "concern-assignments";
    } else {
      templateUsed = "concern-general";
    }

    const locale = (
      user.preferredLanguage === "vi" ? "vi" : "en"
    ) as "en" | "vi";
    const studentName = user.name ?? "Student";

    const subject = buildInterventionEmailSubject(
      templateUsed,
      studentName,
      centerName,
      locale,
    );

    const body = buildInterventionEmailPreviewText(
      {
        studentName,
        centerName,
        senderName: "[Your Name]",
        attendanceRate: metrics.attendanceRate,
        attendedSessions: metrics.attendedSessions,
        totalSessions: metrics.totalSessions,
        assignmentCompletionRate: metrics.assignmentCompletionRate,
        completedAssignments: metrics.completedAssignments,
        totalAssignments: metrics.totalAssignments,
        overdueAssignments: metrics.overdueAssignments,
        healthStatus: profile.student.healthStatus,
        classes: classes.map((c) => c.name),
        locale,
      },
      templateUsed,
    );

    return {
      recipientEmail,
      subject,
      body,
      templateUsed,
    };
  }

  async getTeacherAtRiskWidget(
    centerId: string,
    teacherUserId: string,
  ): Promise<TeacherAtRiskWidgetResponse> {
    const dashboard = await this.getDashboard(
      centerId,
      {},
      teacherUserId,
    );

    // Filter to only at-risk + warning, limit to 6
    const atRiskStudents = dashboard.students
      .filter(
        (s) => s.healthStatus === "at-risk" || s.healthStatus === "warning",
      )
      .slice(0, 6);

    // Build class breakdown from dashboard student data (avoids extra DB query)
    const classMap = new Map<string, { className: string; atRiskCount: number; warningCount: number }>();
    for (const student of dashboard.students) {
      for (const cls of student.classes) {
        if (!classMap.has(cls.id)) {
          classMap.set(cls.id, { className: cls.name, atRiskCount: 0, warningCount: 0 });
        }
        const entry = classMap.get(cls.id)!;
        if (student.healthStatus === "at-risk") entry.atRiskCount++;
        if (student.healthStatus === "warning") entry.warningCount++;
      }
    }
    const classBreakdown = Array.from(classMap.entries()).map(([classId, data]) => ({
      classId,
      ...data,
    }));

    return {
      students: atRiskStudents,
      summary: dashboard.summary,
      classBreakdown,
    };
  }

  async createFlag(
    centerId: string,
    studentId: string,
    createdById: string,
    note: string,
    teacherUserId?: string,
  ): Promise<{ flagId: string; status: "OPEN" }> {
    const db = getTenantedClient(this.prisma, centerId);

    // Teacher access check: verify student is in teacher's class
    if (teacherUserId) {
      const hasAccess = await db.classStudent.findFirst({
        where: {
          studentId,
          class: { teacherId: teacherUserId },
        },
      });
      if (!hasAccess) {
        throw AppError.forbidden(
          "You can only flag students in your classes",
        );
      }
    }

    // Validate student exists in center
    const membership = await db.centerMembership.findFirst({
      where: {
        userId: studentId,
        role: "STUDENT",
        status: "ACTIVE",
      },
      include: {
        user: { select: { name: true } },
      },
    });
    if (!membership) {
      throw AppError.notFound("Student not found");
    }

    // Get teacher name for notification
    const teacher = await this.prisma.user.findUnique({
      where: { id: createdById },
      select: { name: true },
    });

    const flag = await db.studentFlag.create({
      data: {
        studentId,
        centerId,
        createdById,
        note,
        status: "OPEN",
      },
    });

    // Create in-app notification for all OWNER/ADMIN users in center
    const adminMembers = await db.centerMembership.findMany({
      where: {
        role: { in: ["OWNER", "ADMIN"] },
        status: "ACTIVE",
      },
      select: { userId: true },
    });

    const teacherName = teacher?.name ?? "A teacher";
    const studentName = membership.user.name ?? "a student";
    const truncatedNote =
      note.length > 100 ? note.slice(0, 100) + "..." : note;

    if (adminMembers.length > 0) {
      await db.notification.createMany({
        data: adminMembers.map((m) => ({
          userId: m.userId,
          centerId,
          title: "Student Flagged",
          message: `${teacherName} flagged ${studentName}: ${truncatedNote}`,
        })),
      });
    }

    return { flagId: flag.id, status: "OPEN" };
  }

  async getStudentFlags(
    centerId: string,
    studentId: string,
  ): Promise<StudentFlagRecord[]> {
    const db = getTenantedClient(this.prisma, centerId);

    const flags = await db.studentFlag.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        resolvedBy: { select: { name: true } },
      },
    });

    return flags.map((f) => ({
      id: f.id,
      studentId: f.studentId,
      centerId: f.centerId,
      createdById: f.createdById,
      createdByName: f.createdBy.name,
      note: f.note,
      status: f.status,
      resolvedById: f.resolvedById,
      resolvedByName: f.resolvedBy?.name ?? null,
      resolvedNote: f.resolvedNote,
      createdAt: f.createdAt.toISOString(),
      resolvedAt: f.resolvedAt?.toISOString() ?? null,
    }));
  }

  async resolveFlag(
    centerId: string,
    flagId: string,
    resolvedById: string,
    resolvedNote?: string,
  ): Promise<{ flagId: string; status: "RESOLVED" }> {
    const db = getTenantedClient(this.prisma, centerId);

    const flag = await db.studentFlag.findFirst({
      where: { id: flagId },
    });
    if (!flag) {
      throw AppError.notFound("Flag not found");
    }
    if (flag.status === "RESOLVED") {
      throw AppError.conflict("Flag is already resolved");
    }

    await db.studentFlag.update({
      where: { id: flagId },
      data: {
        status: "RESOLVED",
        resolvedById,
        resolvedNote: resolvedNote ?? null,
        resolvedAt: new Date(),
      },
    });

    return { flagId, status: "RESOLVED" };
  }
}
