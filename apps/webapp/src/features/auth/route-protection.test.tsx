import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { ProtectedRoute } from "./protected-route";
import { useAuth } from "./auth-context";

// Mock auth context
vi.mock("./auth-context");

// Simple test components
const TestPage = ({ name }: { name: string }) => <div>{name} Page</div>;
const LoginPage = () => <div>Login Page</div>;

describe("Route Protection", () => {
  const renderProtectedRoute = (
    initialPath: string,
    mockUser: { role: string; centerId: string } | null,
    allowedRoles: string[]
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(useAuth).mockReturnValue({ user: mockUser, loading: false } as any);

    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/sign-in" element={<LoginPage />} />
          <Route
            path="/:centerId/dashboard/settings"
            element={
              <ProtectedRoute allowedRoles={allowedRoles as unknown[]}>
                <TestPage name="Settings" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:centerId/dashboard/grading"
            element={
              <ProtectedRoute allowedRoles={allowedRoles as unknown[]}>
                <TestPage name="Grading" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/:centerId/dashboard/students"
            element={
              <ProtectedRoute allowedRoles={allowedRoles as unknown[]}>
                <TestPage name="Students" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  describe("Settings route protection", () => {
    const allowedRoles = ["OWNER", "ADMIN"];

    it("allows OWNER to access settings", () => {
      renderProtectedRoute(
        "/test-center/dashboard/settings",
        { role: "OWNER", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.getByText("Settings Page")).toBeInTheDocument();
    });

    it("allows ADMIN to access settings", () => {
      renderProtectedRoute(
        "/test-center/dashboard/settings",
        { role: "ADMIN", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.getByText("Settings Page")).toBeInTheDocument();
    });

    it("redirects TEACHER from settings", () => {
      renderProtectedRoute(
        "/test-center/dashboard/settings",
        { role: "TEACHER", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.queryByText("Settings Page")).not.toBeInTheDocument();
    });

    it("redirects STUDENT from settings", () => {
      renderProtectedRoute(
        "/test-center/dashboard/settings",
        { role: "STUDENT", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.queryByText("Settings Page")).not.toBeInTheDocument();
    });
  });

  describe("Grading route protection", () => {
    const allowedRoles = ["OWNER", "TEACHER"];

    it("allows OWNER to access grading", () => {
      renderProtectedRoute(
        "/test-center/dashboard/grading",
        { role: "OWNER", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.getByText("Grading Page")).toBeInTheDocument();
    });

    it("allows TEACHER to access grading", () => {
      renderProtectedRoute(
        "/test-center/dashboard/grading",
        { role: "TEACHER", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.getByText("Grading Page")).toBeInTheDocument();
    });

    it("redirects ADMIN from grading (Story 15-2)", () => {
      renderProtectedRoute(
        "/test-center/dashboard/grading",
        { role: "ADMIN", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.queryByText("Grading Page")).not.toBeInTheDocument();
    });

    it("redirects STUDENT from grading", () => {
      renderProtectedRoute(
        "/test-center/dashboard/grading",
        { role: "STUDENT", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.queryByText("Grading Page")).not.toBeInTheDocument();
    });
  });

  describe("Students route protection", () => {
    const allowedRoles = ["OWNER", "ADMIN", "TEACHER"];

    it("allows OWNER to access students", () => {
      renderProtectedRoute(
        "/test-center/dashboard/students",
        { role: "OWNER", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.getByText("Students Page")).toBeInTheDocument();
    });

    it("allows TEACHER to access students", () => {
      renderProtectedRoute(
        "/test-center/dashboard/students",
        { role: "TEACHER", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.getByText("Students Page")).toBeInTheDocument();
    });

    it("redirects STUDENT from students page", () => {
      renderProtectedRoute(
        "/test-center/dashboard/students",
        { role: "STUDENT", centerId: "test-center" },
        allowedRoles
      );
      expect(screen.queryByText("Students Page")).not.toBeInTheDocument();
    });
  });

  describe("Unauthenticated access", () => {
    it("redirects unauthenticated users from protected routes", () => {
      renderProtectedRoute(
        "/test-center/dashboard/settings",
        null,
        ["OWNER", "ADMIN"]
      );
      expect(screen.queryByText("Settings Page")).not.toBeInTheDocument();
    });
  });
});
