import { describe, it, expect, vi, beforeEach } from "vitest";
import { CsvImportRowStatus, CsvImportStatus } from "@workspace/db";

// Mock data structures
const createMockTenantedClient = () => ({
  centerMembership: {
    findMany: vi.fn(),
  },
  csvImportLog: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  csvImportRowLog: {
    findMany: vi.fn(),
  },
});

let mockTenantedClient = createMockTenantedClient();

// Mock @workspace/db at module level
vi.mock("@workspace/db", () => ({
  getTenantedClient: vi.fn(() => mockTenantedClient),
  PrismaClient: vi.fn(() => ({})),
  CsvImportStatus: {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    PARTIAL: "PARTIAL",
    FAILED: "FAILED",
  },
  CsvImportRowStatus: {
    VALID: "VALID",
    DUPLICATE_IN_CSV: "DUPLICATE_IN_CSV",
    DUPLICATE_IN_CENTER: "DUPLICATE_IN_CENTER",
    ERROR: "ERROR",
    IMPORTED: "IMPORTED",
    SKIPPED: "SKIPPED",
    FAILED: "FAILED",
  },
}));

// Mock crypto
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => "test-uuid"),
}));

// Import after mocks
import { CsvImportService } from "./csv-import.service.js";

describe("CsvImportService", () => {
  let service: CsvImportService;
  const centerId = "test-center-id";

  beforeEach(() => {
    mockTenantedClient = createMockTenantedClient();
    vi.clearAllMocks();
    service = new CsvImportService({} as any);
  });

  describe("getImportStatus", () => {
    it("returns correct status for pending import", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue({
        id: "import-log-id",
        status: CsvImportStatus.PENDING,
        importedRows: 0,
        failedRows: 0,
        rows: [],
      });

      const result = await service.getImportStatus("import-log-id", centerId);

      expect(result.status).toBe(CsvImportStatus.PENDING);
      expect(result.isComplete).toBe(false);
    });

    it("returns correct status for completed import", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue({
        id: "import-log-id",
        status: CsvImportStatus.COMPLETED,
        importedRows: 10,
        failedRows: 0,
        rows: [],
      });

      const result = await service.getImportStatus("import-log-id", centerId);

      expect(result.status).toBe(CsvImportStatus.COMPLETED);
      expect(result.isComplete).toBe(true);
      expect(result.importedRows).toBe(10);
    });

    it("throws error when import not found", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue(null);

      await expect(
        service.getImportStatus("nonexistent-id", centerId)
      ).rejects.toThrow("Import not found");
    });
  });

  describe("getImportHistory", () => {
    it("returns paginated history", async () => {
      mockTenantedClient.csvImportLog.findMany.mockResolvedValue([
        {
          id: "import-1",
          fileName: "test1.csv",
          totalRows: 10,
          validRows: 8,
          importedRows: 8,
          failedRows: 0,
          status: CsvImportStatus.COMPLETED,
          createdAt: new Date("2024-01-01"),
          completedAt: new Date("2024-01-01"),
          importedBy: { id: "user-1", name: "Test User", email: "test@example.com" },
        },
      ]);
      mockTenantedClient.csvImportLog.count.mockResolvedValue(1);

      const result = await service.getImportHistory(centerId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it("filters by status when provided", async () => {
      mockTenantedClient.csvImportLog.findMany.mockResolvedValue([]);
      mockTenantedClient.csvImportLog.count.mockResolvedValue(0);

      await service.getImportHistory(centerId, {
        page: 1,
        limit: 20,
        status: CsvImportStatus.FAILED,
      });

      expect(mockTenantedClient.csvImportLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: CsvImportStatus.FAILED },
        })
      );
    });
  });

  describe("getFailedRows", () => {
    it("returns only failed rows", async () => {
      mockTenantedClient.csvImportRowLog.findMany.mockResolvedValue([
        {
          id: "row-1",
          rowNumber: 1,
          email: "failed@example.com",
          name: "Failed User",
          role: "TEACHER",
          status: CsvImportRowStatus.FAILED,
          errorMessage: "Network error",
        },
      ]);

      const result = await service.getFailedRows("import-log-id", centerId);

      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe(CsvImportRowStatus.FAILED);
    });
  });

  describe("verifyImportOwnership", () => {
    it("returns true when import belongs to center", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue({
        id: "import-log-id",
      });

      const result = await service.verifyImportOwnership("import-log-id", centerId);

      expect(result).toBe(true);
    });

    it("returns false when import does not belong to center", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue(null);

      const result = await service.verifyImportOwnership("other-import-id", centerId);

      expect(result).toBe(false);
    });
  });

  describe("markProcessing", () => {
    it("throws error when import does not belong to center", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue(null);

      await expect(
        service.markProcessing("other-import-id", centerId, "job-id")
      ).rejects.toThrow("Import not found");
    });

    it("updates import status when ownership is verified", async () => {
      mockTenantedClient.csvImportLog.findUnique.mockResolvedValue({
        id: "import-log-id",
      });
      mockTenantedClient.csvImportLog.update.mockResolvedValue({});

      await service.markProcessing("import-log-id", centerId, "job-id");

      expect(mockTenantedClient.csvImportLog.update).toHaveBeenCalledWith({
        where: { id: "import-log-id" },
        data: {
          status: CsvImportStatus.PROCESSING,
          jobId: "job-id",
        },
      });
    });
  });
});
