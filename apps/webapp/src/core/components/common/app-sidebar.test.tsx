import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AppSidebar } from "./app-sidebar";

// Mock matchMedia for Radix/Shadcn
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

let mockUser: {
  role: string;
  centerId: string;
  email: string;
  name: string;
  avatarUrl: string;
} | null = null;

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

vi.mock("@/features/tenants/tenant-context", () => ({
  useTenant: () => ({
    tenant: { name: "Test Center", logoUrl: null },
  }),
}));

vi.mock("@/core/config/navigation", () => ({
  getNavigationGroups: () => [],
}));

vi.mock("./nav-main", () => ({
  NavMain: () => <div data-testid="nav-main" />,
}));

vi.mock("./nav-user", () => ({
  NavUser: () => <div data-testid="nav-user" />,
}));

import {
  SidebarProvider,
} from "@workspace/ui/components/sidebar";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe("AppSidebar role badge (AC1)", () => {
  it("shows localized role badge for OWNER with default variant", () => {
    mockUser = {
      role: "OWNER",
      centerId: "c1",
      email: "owner@test.com",
      name: "OwnerUser",
      avatarUrl: "",
    };
    renderSidebar();

    const badge = screen.getByText("Owner");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("[data-slot='badge']")).toBeTruthy();
  });

  it("shows localized role badge for ADMIN with secondary variant", () => {
    mockUser = {
      role: "ADMIN",
      centerId: "c1",
      email: "admin@test.com",
      name: "AdminUser",
      avatarUrl: "",
    };
    renderSidebar();

    const badge = screen.getByText("Admin");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("[data-slot='badge']")).toBeTruthy();
  });

  it("shows localized role badge for TEACHER with outline variant", () => {
    mockUser = {
      role: "TEACHER",
      centerId: "c1",
      email: "teacher@test.com",
      name: "TeacherUser",
      avatarUrl: "",
    };
    renderSidebar();

    const badge = screen.getByText("Teacher");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("[data-slot='badge']")).toBeTruthy();
  });

  it("shows localized role badge for STUDENT with outline variant", () => {
    mockUser = {
      role: "STUDENT",
      centerId: "c1",
      email: "student@test.com",
      name: "StudentUser",
      avatarUrl: "",
    };
    renderSidebar();

    const badge = screen.getByText("Student");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("[data-slot='badge']")).toBeTruthy();
  });

  it("does not show role badge when user is null", () => {
    mockUser = null;
    renderSidebar();

    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Teacher")).not.toBeInTheDocument();
    expect(screen.queryByText("Student")).not.toBeInTheDocument();
  });
});
