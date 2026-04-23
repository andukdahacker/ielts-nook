import { describe, it, expect } from "vitest";
import { UnauthorizedError, ForbiddenError } from "./client";

describe("client error classes", () => {
  it("ForbiddenError is an instance of Error", () => {
    const error = new ForbiddenError("Forbidden");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.message).toBe("Forbidden");
  });

  it("ForbiddenError contains backend error message", () => {
    const msg = "FORBIDDEN: You do not have permission to perform this action. Required: [OWNER, ADMIN]";
    const error = new ForbiddenError(msg);
    expect(error.message).toBe(msg);
  });

  it("ForbiddenError is distinct from UnauthorizedError", () => {
    const forbidden = new ForbiddenError("Forbidden");
    const unauthorized = new UnauthorizedError("Unauthorized");
    expect(forbidden).not.toBeInstanceOf(UnauthorizedError);
    expect(unauthorized).not.toBeInstanceOf(ForbiddenError);
  });
});
