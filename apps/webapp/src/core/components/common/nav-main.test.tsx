import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { NavMain } from "./nav-main";

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
import type { NavGroupConfig } from "@/core/config/navigation";
import {
  LayoutDashboard,
  Calendar,
  School,
  Library,
  GraduationCap,
  Users,
  Settings,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
} from "@workspace/ui/components/sidebar";

const mockGroups: NavGroupConfig[] = [
  {
    label: "nav.group.overview",
    items: [
      {
        title: "nav.dashboard",
        url: "/c1/dashboard",
        icon: LayoutDashboard,
        allowedRoles: ["OWNER", "ADMIN", "TEACHER", "STUDENT"],
        order: 1,
        mobileVisible: true,
      },
      {
        title: "nav.schedule",
        url: "/c1/dashboard/schedule",
        icon: Calendar,
        allowedRoles: ["OWNER", "ADMIN", "TEACHER", "STUDENT"],
        order: 2,
        mobileVisible: true,
      },
    ],
  },
  {
    label: "nav.group.teaching",
    items: [
      {
        title: "nav.classes",
        url: "/c1/dashboard/classes",
        icon: School,
        allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
        order: 3,
        mobileVisible: true,
      },
      {
        title: "nav.exercises",
        url: "/c1/dashboard/exercises",
        icon: Library,
        allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
        order: 4,
        mobileVisible: true,
      },
      {
        title: "nav.grading",
        url: "/c1/dashboard/grading",
        icon: GraduationCap,
        allowedRoles: ["OWNER", "TEACHER"],
        order: 6,
        mobileVisible: false,
      },
    ],
  },
  {
    label: "nav.group.people",
    items: [
      {
        title: "nav.students",
        url: "/c1/dashboard/students",
        icon: Users,
        allowedRoles: ["OWNER", "ADMIN", "TEACHER"],
        order: 7,
        mobileVisible: false,
      },
    ],
  },
  {
    label: "nav.group.administration",
    items: [
      {
        title: "nav.settings",
        url: "/c1/dashboard/settings",
        icon: Settings,
        allowedRoles: ["OWNER", "ADMIN"],
        order: 8,
        mobileVisible: false,
      },
    ],
  },
];

const renderNavMain = (
  userRole: "OWNER" | "ADMIN" | "TEACHER" | "STUDENT" | undefined,
  initialPath = "/c1/dashboard"
) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <NavMain groups={mockGroups} userRole={userRole} />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </MemoryRouter>
  );
};

describe("NavMain grouped navigation", () => {
  it("renders grouped sections with labels (AC2)", () => {
    renderNavMain("OWNER");

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Teaching")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();
  });

  it("active route's group is auto-expanded (AC2)", () => {
    renderNavMain("OWNER", "/c1/dashboard/grading");

    // The Teaching group should be expanded (grading is in Teaching)
    // When expanded, we should see the grading link
    expect(screen.getByText("Grading")).toBeInTheDocument();
  });

  it("Owner-only badge shown on items where allowedRoles is exactly ['OWNER'] (AC3)", () => {
    // Create a group with an Owner-only item
    const groupsWithOwnerOnly: NavGroupConfig[] = [
      {
        label: "nav.group.administration",
        items: [
          {
            title: "nav.billing",
            url: "/c1/dashboard/billing",
            icon: Settings,
            allowedRoles: ["OWNER"],
            order: 9,
            mobileVisible: false,
          },
        ],
      },
    ];

    render(
      <MemoryRouter initialEntries={["/c1/dashboard/billing"]}>
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <NavMain groups={groupsWithOwnerOnly} userRole="OWNER" />
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("Owner-only badge NOT shown on items accessible to multiple roles (AC3)", () => {
    renderNavMain("OWNER", "/c1/dashboard/settings");

    // Settings has allowedRoles: ["OWNER", "ADMIN"] — badge should NOT appear
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
  });

  it("groups with no accessible items are hidden for restricted roles", () => {
    renderNavMain("STUDENT");

    // STUDENT should see Overview group
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Schedule")).toBeInTheDocument();

    // STUDENT should NOT see Teaching, People, or Administration groups
    expect(screen.queryByText("Teaching")).not.toBeInTheDocument();
    expect(screen.queryByText("People")).not.toBeInTheDocument();
    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
  });

  it("ADMIN sees 4 groups with correct items (no grading)", () => {
    renderNavMain("ADMIN", "/c1/dashboard");

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Teaching")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();

    // ADMIN should NOT see grading (allowedRoles: ["OWNER", "TEACHER"])
    expect(screen.queryByText("Grading")).not.toBeInTheDocument();
  });

  it("renders nothing when userRole is undefined (auth loading)", () => {
    const { container } = renderNavMain(undefined);

    // Should render empty — no group labels, no nav items
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Teaching")).not.toBeInTheDocument();
    expect(container.querySelector("[data-sidebar='group']")).toBeNull();
  });

  it("first visible group is open by default when no route matches", () => {
    renderNavMain("OWNER", "/c1/some-unknown-page");

    // Overview should be expanded as fallback (first visible group)
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
