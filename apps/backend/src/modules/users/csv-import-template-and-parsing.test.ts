import { describe, it, expect, vi, beforeEach } from "vitest";
import { CsvImportRowStatus } from "@workspace/db";

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
  const userId = "test-user-id";

  beforeEach(() => {
    mockTenantedClient = createMockTenantedClient();
    vi.clearAllMocks();
    service = new CsvImportService({} as any);
  });

  describe("generateTemplate", () => {
    it("returns CSV template with headers and example rows", () => {
      const template = service.generateTemplate();

      expect(template).toContain("Email,Name,Role");
      expect(template).toContain("teacher1@example.com,John Smith,Teacher");
      expect(template).toContain("student1@example.com,Jane Doe,Student");
    });

    it("has exactly 3 lines (header + 2 examples)", () => {
      const template = service.generateTemplate();
      const lines = template.split("\n");

      expect(lines).toHaveLength(3);
    });
  });

  describe("parseAndValidate", () => {
    beforeEach(() => {
      // Default: no existing memberships
      mockTenantedClient.centerMembership.findMany.mockResolvedValue([]);
      mockTenantedClient.csvImportLog.create.mockResolvedValue({
        id: "import-log-id",
        rows: [],
      });
    });

    describe("CSV parsing", () => {
      it("parses valid CSV with standard headers", async () => {
        const csv = `Email,Name,Role
john@example.com,John Doe,Teacher
jane@example.com,Jane Doe,Student`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
            {
              id: "row-2",
              rowNumber: 2,
              email: "jane@example.com",
              name: "Jane Doe",
              role: "STUDENT",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.totalRows).toBe(2);
        expect(result.validRows).toBe(2);
        expect(result.errorRows).toBe(0);
      });

      it("throws error for invalid CSV format", async () => {
        const invalidCsv = "not,a,valid\ncsv\"file";

        await expect(
          service.parseAndValidate(
            Buffer.from(invalidCsv),
            centerId,
            userId,
            "test.csv"
          )
        ).rejects.toThrow();
      });

      it("throws error when CSV is empty", async () => {
        const emptyCsv = "Email,Name,Role";

        await expect(
          service.parseAndValidate(
            Buffer.from(emptyCsv),
            centerId,
            userId,
            "test.csv"
          )
        ).rejects.toThrow("CSV file is empty");
      });

      it("throws error when row count exceeds 1000", async () => {
        const rows = ["Email,Name,Role"];
        for (let i = 0; i < 1001; i++) {
          rows.push(`user${i}@example.com,User ${i},Student`);
        }
        const largeCsv = rows.join("\n");

        await expect(
          service.parseAndValidate(
            Buffer.from(largeCsv),
            centerId,
            userId,
            "test.csv"
          )
        ).rejects.toThrow("Too many rows");
      });
    });

    describe("header normalization", () => {
      it("accepts lowercase headers (email, name, role)", async () => {
        const csv = `email,name,role
john@example.com,John Doe,Teacher`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.validRows).toBe(1);
      });

      it("accepts uppercase headers (EMAIL, NAME, ROLE)", async () => {
        const csv = `EMAIL,NAME,ROLE
john@example.com,John Doe,Teacher`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.validRows).toBe(1);
      });

      it("accepts mixed case headers (Email, Name, Role)", async () => {
        const csv = `Email,Name,Role
john@example.com,John Doe,Teacher`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.validRows).toBe(1);
      });

      it("throws error when required column is missing", async () => {
        const csv = `Email,Name
john@example.com,John Doe`;

        await expect(
          service.parseAndValidate(
            Buffer.from(csv),
            centerId,
            userId,
            "test.csv"
          )
        ).rejects.toThrow("Missing required column(s): Role");
      });
    });
  });
});
