import { inngest } from "../../inngest/client.js";
import {
  CenterRole,
  MembershipStatus,
  CsvImportStatus,
  CsvImportRowStatus,
  getTenantedClient,
} from "@workspace/db";
import { createPrisma } from "../../../plugins/create-prisma.js";
import { Resend } from "resend";
import { BillingService } from "../../billing/billing.service.js";

// Event type for CSV import batch processing
export type CsvImportBatchEvent = {
  name: "csv-import/process-batch";
  data: {
    importLogId: string;
    selectedRowIds: string[];
    centerId: string;
    requestingUserId: string;
    isRetry?: boolean;
  };
};

// Batch size for processing
const BATCH_SIZE = 10;

// Helper to chunk array
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Inngest function that processes CSV import batches.
 *
 * Flow:
 * 1. Fetch selected rows from database
 * 2. Process in batches of 10 with 1s delay
 * 3. For each row: create user + membership, send email
 * 4. Update row statuses after each batch
 * 5. Update final import log status
 */
export const csvImportJob = inngest.createFunction(
  {
    id: "csv-import-batch",
    retries: 3,
  },
  { event: "csv-import/process-batch" },
  async ({ event, step }) => {
    const { importLogId, selectedRowIds, centerId, isRetry } = event.data;

    // Get environment variables for email
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM ?? "noreply@classlite.com";
    const webappUrl = process.env.WEBAPP_URL ?? "http://localhost:5173";

    // Step 1: Verify import belongs to center (security check)
    const importVerified = await step.run("verify-ownership", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const importLog = await db.csvImportLog.findUnique({
          where: { id: importLogId },
          select: { id: true, centerId: true },
        });
        if (!importLog) {
          throw new Error("Import not found or does not belong to this center");
        }
        return true;
      } finally {
        await prisma.$disconnect();
      }
    });

    if (!importVerified) {
      return {
        status: "error",
        message: "Import verification failed",
      };
    }

    // Step 2: Fetch rows to process
    const rowsToProcess = await step.run("fetch-rows", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);
        const rows = await db.csvImportRowLog.findMany({
          where: {
            importLogId,
            id: { in: selectedRowIds },
            status: isRetry
              ? CsvImportRowStatus.FAILED
              : CsvImportRowStatus.VALID,
          },
          orderBy: { rowNumber: "asc" },
        });
        return rows.map((r) => ({
          id: r.id,
          email: r.email,
          name: r.name,
          role: r.role,
          rowNumber: r.rowNumber,
        }));
      } finally {
        await prisma.$disconnect();
      }
    });

    if (rowsToProcess.length === 0) {
      return {
        status: "no_rows",
        message: "No valid rows to process",
      };
    }

    // Check enrollment restriction only if batch contains STUDENT rows
    const hasStudentRows = rowsToProcess.some((row) => row.role === "STUDENT");
    const enrollmentAllowed = hasStudentRows
      ? await step.run("check-enrollment", async () => {
          const prisma = createPrisma();
          try {
            const billingService = new BillingService(prisma);
            return billingService.checkEnrollmentAllowed(centerId);
          } finally {
            await prisma.$disconnect();
          }
        })
      : { allowed: true as const };

    // Get center info for emails
    const centerInfo = await step.run("fetch-center", async () => {
      const prisma = createPrisma();
      try {
        const center = await prisma.center.findUnique({
          where: { id: centerId },
          select: { name: true },
        });
        return { centerName: center?.name ?? "Your Center" };
      } finally {
        await prisma.$disconnect();
      }
    });

    // Filter out STUDENT rows if enrollment is restricted
    let filteredRows = rowsToProcess;
    if (!enrollmentAllowed.allowed) {
      filteredRows = rowsToProcess.filter((row) => row.role !== "STUDENT");
      // Mark skipped STUDENT rows
      const skippedStudentRows = rowsToProcess.filter((row) => row.role === "STUDENT");
      if (skippedStudentRows.length > 0) {
        await step.run("mark-restricted-students", async () => {
          const prisma = createPrisma();
          try {
            const db = getTenantedClient(prisma, centerId);
            for (const row of skippedStudentRows) {
              await db.csvImportRowLog.update({
                where: { id: row.id },
                data: {
                  status: CsvImportRowStatus.SKIPPED,
                  errorMessage: enrollmentAllowed.reason ?? "Enrollment restricted — subscription inactive",
                },
              });
            }
          } finally {
            await prisma.$disconnect();
          }
        });
      }
    }

    if (filteredRows.length === 0 && rowsToProcess.length > 0) {
      // All rows were student rows and enrollment is restricted
      await step.run("finalize-restricted-import", async () => {
        const prisma = createPrisma();
        try {
          const db = getTenantedClient(prisma, centerId);
          await db.csvImportLog.update({
            where: { id: importLogId },
            data: {
              status: CsvImportStatus.FAILED,
              failedRows: { increment: rowsToProcess.length },
              completedAt: new Date(),
            },
          });
        } finally {
          await prisma.$disconnect();
        }
      });

      return {
        status: "enrollment_restricted",
        message: enrollmentAllowed.reason,
        importedRows: 0,
        failedRows: rowsToProcess.length,
        totalProcessed: rowsToProcess.length,
      };
    }

    // Chunk rows into batches
    const batches = chunk(filteredRows, BATCH_SIZE);
    let importedCount = 0;
    let failedCount = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]!;

      const batchResults = await step.run(
        `process-batch-${batchIndex}`,
        async () => {
          const prisma = createPrisma();
          const resend = resendApiKey ? new Resend(resendApiKey) : null;
          const results: {
            rowId: string;
            status: CsvImportRowStatus;
            error?: string;
          }[] = [];

          try {
            const db = getTenantedClient(prisma, centerId);

            for (const row of batch) {
              try {
                // Check if user already exists globally
                let user = await prisma.user.findUnique({
                  where: { email: row.email },
                });

                // Check if membership already exists in this center
                if (user) {
                  const existingMembership =
                    await db.centerMembership.findUnique({
                      where: {
                        centerId_userId: {
                          centerId,
                          userId: user.id,
                        },
                      },
                    });

                  if (existingMembership) {
                    results.push({
                      rowId: row.id,
                      status: CsvImportRowStatus.DUPLICATE_IN_CENTER,
                      error: "User already has membership in this center",
                    });
                    continue;
                  }
                }

                // Create user and membership in transaction
                await db.$transaction(async (tx) => {
                  // Create user if doesn't exist
                  if (!user) {
                    user = await tx.user.create({
                      data: {
                        email: row.email,
                        name: row.name,
                      },
                    });
                  } else if (!user.name && row.name) {
                    // Update name if user exists but has no name
                    await tx.user.update({
                      where: { id: user.id },
                      data: { name: row.name },
                    });
                  }

                  // Create membership
                  await tx.centerMembership.create({
                    data: {
                      centerId,
                      userId: user!.id,
                      role: row.role as CenterRole,
                      status: MembershipStatus.INVITED,
                    },
                  });
                });

                // Send invitation email (failure doesn't fail the import)
                if (resend) {
                  try {
                    const signupUrl = `${webappUrl}/sign-up?email=${encodeURIComponent(row.email)}`;
                    await resend.emails.send({
                      from: emailFrom,
                      to: row.email,
                      subject: `You've been invited to join ${centerInfo.centerName} on ClassLite`,
                      html: `
                        <h1>You've been invited!</h1>
                        <p>You have been invited to join <strong>${centerInfo.centerName}</strong> on ClassLite as a <strong>${row.role.toLowerCase()}</strong>.</p>
                        <p>Please click the link below to create your account and join:</p>
                        <a href="${signupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px;">Join Now</a>
                      `,
                    });
                  } catch (emailError) {
                    // Log but don't fail the import
                    console.error(
                      `Failed to send email to ${row.email}:`,
                      emailError
                    );
                  }
                }

                results.push({
                  rowId: row.id,
                  status: CsvImportRowStatus.IMPORTED,
                });
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : "Unknown error";
                results.push({
                  rowId: row.id,
                  status: CsvImportRowStatus.FAILED,
                  error: errorMessage,
                });
              }
            }
          } finally {
            await prisma.$disconnect();
          }

          return results;
        }
      );

      // Update row statuses
      await step.run(`update-batch-${batchIndex}-statuses`, async () => {
        const prisma = createPrisma();
        try {
          const db = getTenantedClient(prisma, centerId);
          for (const result of batchResults) {
            await db.csvImportRowLog.update({
              where: { id: result.rowId },
              data: {
                status: result.status,
                errorMessage: result.error ?? null,
              },
            });

            if (result.status === CsvImportRowStatus.IMPORTED) {
              importedCount++;
            } else {
              failedCount++;
            }
          }
        } finally {
          await prisma.$disconnect();
        }
      });

      // Delay between batches (except last batch)
      if (batchIndex < batches.length - 1) {
        await step.sleep("batch-delay", "1s");
      }
    }

    // Update final import log status
    await step.run("finalize-import", async () => {
      const prisma = createPrisma();
      try {
        const db = getTenantedClient(prisma, centerId);

        let finalStatus: CsvImportStatus;
        if (failedCount === 0) {
          finalStatus = CsvImportStatus.COMPLETED;
        } else if (importedCount === 0) {
          finalStatus = CsvImportStatus.FAILED;
        } else {
          finalStatus = CsvImportStatus.PARTIAL;
        }

        await db.csvImportLog.update({
          where: { id: importLogId },
          data: {
            status: finalStatus,
            importedRows: { increment: importedCount },
            failedRows: { increment: failedCount },
            completedAt: new Date(),
          },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    return {
      status: "completed",
      importedRows: importedCount,
      failedRows: failedCount,
      totalProcessed: rowsToProcess.length,
    };
  }
);
