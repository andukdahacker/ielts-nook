import {
  ClassSessionListResponse,
  ClassSessionResponse,
  CreateClassSessionInput,
  GenerateSessionsInput,
  GenerateSessionsResponse,
  UpdateClassSessionInput,
  ConflictCheckInput,
  ConflictResultResponse,
  DeleteFutureSessionsResponse,
} from "@workspace/types";
import { format } from "date-fns";
import { JwtPayload } from "jsonwebtoken";
import { AppError } from "../../errors/app-error.js";
import { NotificationsService } from "../notifications/notifications.service.js";
import { SessionsService } from "./sessions.service.js";
import { inngest } from "../inngest/client.js";
import type {
  SessionScheduleChangedEvent,
  SessionCancelledEvent,
} from "./jobs/session-email-notification.job.js";

export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listSessions(
    user: JwtPayload,
    startDate: string,
    endDate: string,
    classId?: string,
    includeConflicts?: boolean,
  ): Promise<ClassSessionListResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const sessions = includeConflicts
      ? await this.sessionsService.listSessionsWithConflicts(
          centerId,
          new Date(startDate),
          new Date(endDate),
          classId,
        )
      : await this.sessionsService.listSessions(
          centerId,
          new Date(startDate),
          new Date(endDate),
          classId,
        );
    return {
      data: sessions,
      message: "Sessions retrieved successfully",
    };
  }

  async getSessionsForWeek(
    user: JwtPayload,
    weekStart: string,
    classId?: string,
  ): Promise<ClassSessionListResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const sessions = await this.sessionsService.getSessionsForWeek(
      centerId,
      new Date(weekStart),
      classId,
    );
    return {
      data: sessions,
      message: "Sessions retrieved successfully",
    };
  }

  async getSession(
    id: string,
    user: JwtPayload,
  ): Promise<ClassSessionResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const session = await this.sessionsService.getSession(centerId, id);
    return {
      data: session,
      message: "Session retrieved successfully",
    };
  }

  async createSession(
    input: CreateClassSessionInput,
    user: JwtPayload,
  ): Promise<ClassSessionResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const session = await this.sessionsService.createSession(centerId, input);
    return {
      data: session,
      message: "Session created successfully",
    };
  }

  async updateSession(
    id: string,
    input: UpdateClassSessionInput,
    user: JwtPayload,
  ): Promise<ClassSessionResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const { session, previousStartTime, previousEndTime, previousRoomName } =
      await this.sessionsService.updateSession(centerId, id, input);

    // Check if time changed - if so, notify students and teacher
    const timeChanged =
      (input.startTime !== undefined &&
        new Date(input.startTime).getTime() !== previousStartTime.getTime()) ||
      (input.endTime !== undefined &&
        new Date(input.endTime).getTime() !== previousEndTime.getTime());

    // Check if room changed
    const roomChanged =
      input.roomName !== undefined &&
      input.roomName !== previousRoomName;

    if (timeChanged) {
      // Get participants to notify (in-app notifications for time changes)
      const participants = await this.sessionsService.getClassParticipants(
        centerId,
        session.classId,
      );

      const userIdsToNotify: string[] = [
        ...participants.studentIds,
        ...(participants.teacherId ? [participants.teacherId] : []),
      ];

      if (userIdsToNotify.length > 0) {
        const className = session.class?.name ?? "Class";
        const courseName = session.class?.course?.name ?? "Course";
        const newTime = format(new Date(session.startTime), "MMM d, h:mm a");

        await this.notificationsService.createBulkNotifications(
          centerId,
          userIdsToNotify,
          "Session Rescheduled",
          `${courseName} - ${className} has been moved to ${newTime}`,
        );
      }
    }

    // Emit email notification event (separate from in-app notifications)
    if (timeChanged || roomChanged) {
      await inngest.send({
        name: "logistics/session.schedule-changed",
        data: {
          sessionId: session.id,
          centerId,
          classId: session.classId,
          previousStartTime: previousStartTime.toISOString(),
          previousEndTime: previousEndTime.toISOString(),
          newStartTime: new Date(session.startTime).toISOString(),
          newEndTime: new Date(session.endTime).toISOString(),
          previousRoomName: previousRoomName ?? null,
          newRoomName: session.roomName ?? null,
        },
      } as SessionScheduleChangedEvent);
    }

    return {
      data: session,
      message: "Session updated successfully",
    };
  }

  async cancelSession(
    id: string,
    user: JwtPayload,
  ): Promise<ClassSessionResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const { session, alreadyCancelled } = await this.sessionsService.cancelSession(centerId, id);

    // Skip notifications on idempotent re-cancel
    if (!alreadyCancelled) {
      try {
        // Send in-app notifications to participants
        const participants = await this.sessionsService.getClassParticipants(
          centerId,
          session.classId,
        );

        const userIdsToNotify: string[] = [
          ...participants.studentIds,
          ...(participants.teacherId ? [participants.teacherId] : []),
        ];

        if (userIdsToNotify.length > 0) {
          const className = session.class?.name ?? "Class";
          const courseName = session.class?.course?.name ?? "Course";
          const sessionTime = format(new Date(session.startTime), "MMM d, h:mm a");

          await this.notificationsService.createBulkNotifications(
            centerId,
            userIdsToNotify,
            "Session Cancelled",
            `${courseName} - ${className} on ${sessionTime} has been cancelled`,
          );
        }

        // Emit cancellation email event
        await inngest.send({
          name: "logistics/session.cancelled",
          data: {
            centerId,
            classId: session.classId,
            originalStartTime: new Date(session.startTime).toISOString(),
            originalEndTime: new Date(session.endTime).toISOString(),
            roomName: session.roomName ?? null,
            isBulk: false,
          },
        } as SessionCancelledEvent);
      } catch (notificationError) {
        // Log but don't fail the cancel — DB state is already committed
        console.error("Failed to send cancel notifications:", notificationError);
      }
    }

    return {
      data: session,
      message: "Session cancelled successfully",
    };
  }

  async deleteSession(
    id: string,
    user: JwtPayload,
  ): Promise<{ message: string }> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    // Fetch session details BEFORE deletion for notifications
    const session = await this.sessionsService.getSession(centerId, id);

    await this.sessionsService.deleteSession(centerId, id);

    // Send in-app notifications (consistent with deleteFutureSessions)
    const participants = await this.sessionsService.getClassParticipants(
      centerId,
      session.classId,
    );

    const userIdsToNotify: string[] = [
      ...participants.studentIds,
      ...(participants.teacherId ? [participants.teacherId] : []),
    ];

    if (userIdsToNotify.length > 0) {
      const className = session.class?.name ?? "Class";
      const courseName = session.class?.course?.name ?? "Course";
      const sessionTime = format(new Date(session.startTime), "MMM d, h:mm a");

      await this.notificationsService.createBulkNotifications(
        centerId,
        userIdsToNotify,
        "Session Cancelled",
        `${courseName} - ${className} on ${sessionTime} has been cancelled`,
      );
    }

    // Emit cancellation email event
    await inngest.send({
      name: "logistics/session.cancelled",
      data: {
        centerId,
        classId: session.classId,
        originalStartTime: new Date(session.startTime).toISOString(),
        originalEndTime: new Date(session.endTime).toISOString(),
        roomName: session.roomName ?? null,
        isBulk: false,
      },
    } as SessionCancelledEvent);

    return {
      message: "Session deleted successfully",
    };
  }

  async deleteFutureSessions(
    sessionId: string,
    user: JwtPayload,
  ): Promise<DeleteFutureSessionsResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    // Fetch session details BEFORE deletion for email notification
    const sessionBeforeDelete = await this.sessionsService.getSession(
      centerId,
      sessionId,
    );

    const { deletedCount, classId } =
      await this.sessionsService.deleteFutureSessions(centerId, sessionId);

    // Notify all class participants about cancellation
    const participants = await this.sessionsService.getClassParticipants(
      centerId,
      classId,
    );

    const userIdsToNotify: string[] = [
      ...participants.studentIds,
      ...(participants.teacherId ? [participants.teacherId] : []),
    ];

    if (userIdsToNotify.length > 0) {
      await this.notificationsService.createBulkNotifications(
        centerId,
        userIdsToNotify,
        "Sessions Cancelled",
        `${deletedCount} future session(s) have been cancelled`,
      );
    }

    // Emit cancellation email event
    await inngest.send({
      name: "logistics/session.cancelled",
      data: {
        centerId,
        classId,
        originalStartTime: new Date(sessionBeforeDelete.startTime).toISOString(),
        originalEndTime: new Date(sessionBeforeDelete.endTime).toISOString(),
        roomName: sessionBeforeDelete.roomName ?? null,
        isBulk: true,
        deletedCount,
      },
    } as SessionCancelledEvent);

    return {
      data: { deletedCount },
      message: `Deleted ${deletedCount} future session(s)`,
    };
  }

  async generateSessions(
    input: GenerateSessionsInput,
    user: JwtPayload,
  ): Promise<GenerateSessionsResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const result = await this.sessionsService.generateSessions(centerId, input);
    return {
      data: result,
      message: `Generated ${result.generatedCount} sessions successfully`,
    };
  }

  async checkConflicts(
    input: ConflictCheckInput,
    user: JwtPayload,
  ): Promise<ConflictResultResponse> {
    const centerId = user.centerId;
    if (!centerId) throw AppError.unauthorized("Center ID missing from token");

    const result = await this.sessionsService.checkConflicts(centerId, input);
    return {
      data: result,
      message: result.hasConflicts
        ? "Scheduling conflicts detected"
        : "No conflicts detected",
    };
  }
}
