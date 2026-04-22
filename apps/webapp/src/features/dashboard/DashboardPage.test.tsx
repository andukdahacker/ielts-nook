import { render, screen } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import DashboardPage from "./DashboardPage";
import { useAuth } from "@/features/auth/auth-context";
import { BrowserRouter } from "react-router";

vi.mock("@/features/auth/auth-context");
vi.mock("@/features/tenants/tenant-context", () => ({
  useTenant: () => ({ tenant: { name: "Test Center" } }),
}));
vi.mock("@tanstack/react-query", () => ({
  useOnlineManager: () => ({ isOnline: () => true }),
  useIsFetching: () => 0,
  useIsMutating: () => 0,
  onlineManager: {
    subscribe: vi.fn(),
    isOnline: vi.fn(() => true),
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
  useQuery: () => ({
    data: [],
    isLoading: false,
  }),
  useMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("DashboardPage", () => {
  it("renders OwnerDashboard for OWNER role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "OWNER", centerId: "center-1" },
      loading: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(
      await screen.findByText(/Student Health/i),
    ).toBeInTheDocument();
  });

  it("renders TeacherDashboard for TEACHER role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "TEACHER", centerId: "center-1" },
      loading: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(await screen.findByText(/Grading Queue/i)).toBeInTheDocument();
  });

  it("renders StudentDashboard for STUDENT role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "STUDENT", centerId: "center-1" },
      loading: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    expect(await screen.findByText(/Your Tasks/i)).toBeInTheDocument();
  });

  it("filters navigation items based on role", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { role: "STUDENT", centerId: "center-1" },
      loading: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>,
    );

    // Students should see Dashboard and Schedule in grouped sidebar nav
    expect(screen.getAllByText(/Dashboard/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Schedule/i)[0]).toBeInTheDocument();
    // Profile is accessible via NavUser dropdown (sidebar footer), not in nav groups

    // Students should NOT see Classes, Exercises, Grading, Students, or Settings
    expect(screen.queryByText(/Classes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Exercises/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Grading/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Students/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Settings/i)).not.toBeInTheDocument();
  });
});
