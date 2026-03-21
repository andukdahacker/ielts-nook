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

  describe("parseAndValidate", () => {
    beforeEach(() => {
      // Default: no existing memberships
      mockTenantedClient.centerMembership.findMany.mockResolvedValue([]);
      mockTenantedClient.csvImportLog.create.mockResolvedValue({
        id: "import-log-id",
        rows: [],
      });
    });

    describe("validation rules", () => {
      it("marks row as error when email is missing", async () => {
        const csv = `Email,Name,Role
,John Doe,Teacher`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.ERROR,
              errorMessage: "Email is required",
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.errorRows).toBe(1);
      });

      it("marks row as error when email format is invalid", async () => {
        const csv = `Email,Name,Role
invalid-email,John Doe,Teacher`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "invalid-email",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.ERROR,
              errorMessage: "Invalid email format",
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.errorRows).toBe(1);
      });

      it("marks row as error when name is missing", async () => {
        const csv = `Email,Name,Role
john@example.com,,Teacher`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "",
              role: "TEACHER",
              status: CsvImportRowStatus.ERROR,
              errorMessage: "Name is required",
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.errorRows).toBe(1);
      });

      it("marks row as error when role is invalid", async () => {
        const csv = `Email,Name,Role
john@example.com,John Doe,Manager`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "John Doe",
              role: "Manager",
              status: CsvImportRowStatus.ERROR,
              errorMessage: "Role must be 'Teacher' or 'Student'",
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.errorRows).toBe(1);
      });

      it("accepts Teacher role (case insensitive)", async () => {
        const csv = `Email,Name,Role
john@example.com,John Doe,teacher`;

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
    });

    describe("duplicate detection", () => {
      it("detects duplicate emails within CSV", async () => {
        const csv = `Email,Name,Role
john@example.com,John Doe,Teacher
john@example.com,John Smith,Student`;

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
              email: "john@example.com",
              name: "John Smith",
              role: "STUDENT",
              status: CsvImportRowStatus.DUPLICATE_IN_CSV,
              errorMessage: "Duplicate email in row 1",
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
        expect(result.duplicateRows).toBe(1);
      });

      it("detects duplicate emails against existing center members", async () => {
        const csv = `Email,Name,Role
existing@example.com,Existing User,Teacher`;

        // Mock existing membership
        mockTenantedClient.centerMembership.findMany.mockResolvedValue([
          {
            user: { email: "existing@example.com" },
          },
        ]);

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "existing@example.com",
              name: "Existing User",
              role: "TEACHER",
              status: CsvImportRowStatus.DUPLICATE_IN_CENTER,
              errorMessage: "Email already invited to this center",
            },
          ],
        });

        const result = await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        expect(result.validRows).toBe(0);
        expect(result.duplicateRows).toBe(1);
      });

      it("handles case-insensitive email duplicate detection", async () => {
        const csv = `Email,Name,Role
JOHN@EXAMPLE.COM,John Doe,Teacher
john@example.com,John Smith,Student`;

        mockTenantedClient.csvImportLog.create.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "JOHN@EXAMPLE.COM",
              name: "John Doe",
              role: "TEACHER",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
            {
              id: "row-2",
              rowNumber: 2,
              email: "john@example.com",
              name: "John Smith",
              role: "STUDENT",
              status: CsvImportRowStatus.DUPLICATE_IN_CSV,
              errorMessage: "Duplicate email in row 1",
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
        expect(result.duplicateRows).toBe(1);
      });
    });

    describe("formula injection prevention", () => {
      it("escapes values starting with =", async () => {
        const csv = `Email,Name,Role
john@example.com,=SUM(A1),Teacher`;

        // The service should escape the name
        const createCall = mockTenantedClient.csvImportLog.create;
        createCall.mockResolvedValue({
          id: "import-log-id",
          rows: [
            {
              id: "row-1",
              rowNumber: 1,
              email: "john@example.com",
              name: "'=SUM(A1)",
              role: "TEACHER",
              status: CsvImportRowStatus.VALID,
              errorMessage: null,
            },
          ],
        });

        await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        // Check that create was called with escaped value
        expect(createCall).toHaveBeenCalled();
        const createArg = createCall.mock.calls[0]![0];
        const rowData = createArg.data.rows.create[0];
        expect(rowData.name).toBe("'=SUM(A1)");
      });

      it("escapes values starting with +", async () => {
        const csv = `Email,Name,Role
john@example.com,+1234567890,Teacher`;

        const createCall = mockTenantedClient.csvImportLog.create;
        createCall.mockResolvedValue({
          id: "import-log-id",
          rows: [],
        });

        await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        const createArg = createCall.mock.calls[0]![0];
        const rowData = createArg.data.rows.create[0];
        expect(rowData.name).toBe("'+1234567890");
      });

      it("escapes values starting with -", async () => {
        const csv = `Email,Name,Role
john@example.com,-John Doe,Teacher`;

        const createCall = mockTenantedClient.csvImportLog.create;
        createCall.mockResolvedValue({
          id: "import-log-id",
          rows: [],
        });

        await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        const createArg = createCall.mock.calls[0]![0];
        const rowData = createArg.data.rows.create[0];
        expect(rowData.name).toBe("'-John Doe");
      });

      it("escapes values starting with @", async () => {
        const csv = `Email,Name,Role
john@example.com,@username,Teacher`;

        const createCall = mockTenantedClient.csvImportLog.create;
        createCall.mockResolvedValue({
          id: "import-log-id",
          rows: [],
        });

        await service.parseAndValidate(
          Buffer.from(csv),
          centerId,
          userId,
          "test.csv"
        );

        const createArg = createCall.mock.calls[0]![0];
        const rowData = createArg.data.rows.create[0];
        expect(rowData.name).toBe("'@username");
      });
    });
  });
});
