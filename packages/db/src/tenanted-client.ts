import { PrismaClient } from "./generated/client";

/**
 * Models that MUST be isolated by centerId.
 * Improved to be more robust, but ideally verify against Prisma.dmmf at build time.
 * For runtime, we can check if the model has a 'centerId' field in the schema,
 * but the extension API gives us the model name.
 */
const TENANTED_MODELS = [
  "CenterMembership",
  "Course",
  "Class",
  "ClassStudent",
  "ClassSchedule",
  "ClassSession",
  "Notification",
  "EmailLog",
  "Room",
  "Attendance",
  "Exercise",
  "QuestionSection",
  "Question",
  "ExerciseTag",
  "ExerciseTagAssignment",
  "AIGenerationJob",
  "MockTest",
  "MockTestSection",
  "MockTestSectionExercise",
  "Assignment",
  "AssignmentStudent",
  "BillingEvent",
  "StudentCountSnapshot",
  "GoldenSample",
  "ContentModerationFlag",
  "ModerationTermList",
];

/**
 * Returns a Prisma Client extended with multi-tenant isolation logic.
 *
 * @param prisma - The base Prisma Client instance (from backend plugin/context)
 * @param centerId - The ID of the center to isolate data for
 */
export const getTenantedClient = (prisma: PrismaClient, centerId: string) => {
  if (!prisma) {
    throw new Error("getTenantedClient requires a prisma client instance");
  }
  if (!centerId) {
    throw new Error("getTenantedClient requires a centerId");
  }

  // Prisma v7 $extends loses model accessors in the inferred return type.
  // Cast back to PrismaClient so downstream code retains full model access.
  // The extension only adds query middleware — it doesn't change the API surface.
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: {
          model: string;
          operation: string;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: Record<string, any>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          query: (args: any) => Promise<any>;
        }) {
          // Robust check: Only apply if the model is explicitly marked as tenanted
          if (TENANTED_MODELS.includes(model as string)) {
            // Force type assertion to allow dynamic property access
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const queryArgs = (args || {}) as any;

            // READ operations
            if (
              [
                "findMany",
                "findFirst",
                "count",
                "aggregate",
                "groupBy",
              ].includes(operation)
            ) {
              queryArgs.where = { ...queryArgs.where, centerId };
            }

            // findUnique -> findFirst rewrite to allow non-unique centerId injection.
            // Known limitation: this only works correctly when a single Prisma extension
            // is applied. Chaining multiple extensions that rewrite findUnique may conflict.
            if (
              operation === "findUnique" ||
              operation === "findUniqueOrThrow"
            ) {
              const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
              if (operation === "findUnique") {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (prisma as any)[modelKey].findFirst({
                  ...queryArgs,
                  where: { ...queryArgs.where, centerId },
                });
              } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (prisma as any)[modelKey].findFirstOrThrow({
                  ...queryArgs,
                  where: { ...queryArgs.where, centerId },
                });
              }
            }

            // WRITE operations - Insert
            if (["create", "createMany", "upsert"].includes(operation)) {
              if (operation === "create") {
                queryArgs.data = { ...queryArgs.data, centerId };
              }
              if (operation === "createMany") {
                if (Array.isArray(queryArgs.data)) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  queryArgs.data = queryArgs.data.map((d: any) => ({
                    ...d,
                    centerId,
                  }));
                } else {
                  queryArgs.data = { ...queryArgs.data, centerId };
                }
              }
              if (operation === "upsert") {
                queryArgs.where = { ...queryArgs.where, centerId };
                queryArgs.create = { ...queryArgs.create, centerId };
                queryArgs.update = { ...queryArgs.update, centerId };
              }
            }

            // WRITE operations - Update/Delete
            if (
              ["update", "updateMany", "delete", "deleteMany"].includes(
                operation,
              )
            ) {
              queryArgs.where = { ...queryArgs.where, centerId };
            }
          }

          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
};
