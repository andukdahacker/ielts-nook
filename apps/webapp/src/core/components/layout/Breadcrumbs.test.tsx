import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Breadcrumbs } from "./Breadcrumbs";
import { BreadcrumbProvider, useBreadcrumbOverrides } from "@/core/context/breadcrumb-context";
import { useEffect } from "react";

// Mock the breadcrumb config
vi.mock("@/core/config/breadcrumb-config", () => ({
  breadcrumbConfig: {
    dashboard: "Dashboard",
    settings: "Settings",
    users: "Users",
    profile: "My Profile",
    exercises: "Exercises",
    new: "New",
    edit: "Edit",
  },
}));

describe("Breadcrumbs", () => {
  const renderWithRouter = (initialPath: string) => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <BreadcrumbProvider>
          <Breadcrumbs />
        </BreadcrumbProvider>
      </MemoryRouter>
    );
  };

  it("returns null for dashboard root (2 segments)", () => {
    const { container } = renderWithRouter("/test-center/dashboard");
    expect(container.firstChild).toBeNull();
  });

  it("returns null for single segment paths", () => {
    const { container } = renderWithRouter("/test-center");
    expect(container.firstChild).toBeNull();
  });

  it("renders breadcrumb for settings page (3 segments)", () => {
    renderWithRouter("/test-center/dashboard/settings");

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders multiple breadcrumb items for nested routes", () => {
    renderWithRouter("/test-center/dashboard/settings/users");

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("last item is not a link (BreadcrumbPage)", () => {
    renderWithRouter("/test-center/dashboard/settings/users");

    // Users should be the current page (not a link)
    const usersElement = screen.getByText("Users");
    expect(usersElement.tagName.toLowerCase()).toBe("span");
    expect(usersElement).toHaveAttribute("aria-current", "page");
  });

  it("non-last items are links", () => {
    renderWithRouter("/test-center/dashboard/settings/users");

    // Settings should be a link
    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink).toBeInTheDocument();
  });

  it("uses custom labels when provided", () => {
    render(
      <MemoryRouter initialEntries={["/test-center/dashboard/profile/user-123"]}>
        <BreadcrumbProvider>
          <Breadcrumbs customLabels={{ "user-123": "John Doe" }} />
        </BreadcrumbProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("formats unknown segments as Title Case", () => {
    render(
      <MemoryRouter initialEntries={["/test-center/dashboard/some-unknown-page"]}>
        <BreadcrumbProvider>
          <Breadcrumbs />
        </BreadcrumbProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Some Unknown Page")).toBeInTheDocument();
  });

  describe("context-provided labels", () => {
    // Helper that sets breadcrumb overrides via context
    function BreadcrumbSetter({ segment, label, nonClickable }: { segment: string; label: string; nonClickable?: boolean }) {
      const { setLabel, setNonClickable } = useBreadcrumbOverrides();
      useEffect(() => {
        setLabel(segment, label);
        if (nonClickable) setNonClickable(segment);
      }, [segment, label, nonClickable, setLabel, setNonClickable]);
      return null;
    }

    it("uses context labels for exercise edit path with exercise title", () => {
      const exerciseId = "abc-123-def";
      render(
        <MemoryRouter initialEntries={[`/test-center/dashboard/exercises/${exerciseId}/edit`]}>
          <BreadcrumbProvider>
            <BreadcrumbSetter segment={exerciseId} label="My Reading Exercise" nonClickable />
            <Breadcrumbs />
          </BreadcrumbProvider>
        </MemoryRouter>
      );

      expect(screen.getByText("Exercises")).toBeInTheDocument();
      expect(screen.getByText("My Reading Exercise")).toBeInTheDocument();
      expect(screen.getByText("Edit")).toBeInTheDocument();
      // Exercise ID should not appear as raw text
      expect(screen.queryByText("Abc 123 Def")).not.toBeInTheDocument();
    });

    it("non-clickable segments render as BreadcrumbPage (span), not links", () => {
      const exerciseId = "abc-123-def";
      render(
        <MemoryRouter initialEntries={[`/test-center/dashboard/exercises/${exerciseId}/edit`]}>
          <BreadcrumbProvider>
            <BreadcrumbSetter segment={exerciseId} label="My Reading Exercise" nonClickable />
            <Breadcrumbs />
          </BreadcrumbProvider>
        </MemoryRouter>
      );

      // Exercise name segment should be a span (non-clickable), not an anchor link
      const exerciseNameElement = screen.getByText("My Reading Exercise");
      expect(exerciseNameElement.tagName.toLowerCase()).toBe("span");
      // Should NOT be an <a> tag (BreadcrumbPage renders as span with role="link" aria-disabled)
      expect(exerciseNameElement.closest("a")).toBeNull();
    });

    it("renders correct breadcrumbs for new exercise page", () => {
      render(
        <MemoryRouter initialEntries={["/test-center/dashboard/exercises/new"]}>
          <BreadcrumbProvider>
            <Breadcrumbs />
          </BreadcrumbProvider>
        </MemoryRouter>
      );

      expect(screen.getByText("Exercises")).toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
      // Exercises should be a link
      expect(screen.getByRole("link", { name: "Exercises" })).toBeInTheDocument();
    });

    it("context labels take precedence over customLabels", () => {
      render(
        <MemoryRouter initialEntries={["/test-center/dashboard/exercises/abc-123"]}>
          <BreadcrumbProvider>
            <BreadcrumbSetter segment="abc-123" label="Context Label" />
            <Breadcrumbs customLabels={{ "abc-123": "Custom Label" }} />
          </BreadcrumbProvider>
        </MemoryRouter>
      );

      expect(screen.getByText("Context Label")).toBeInTheDocument();
      expect(screen.queryByText("Custom Label")).not.toBeInTheDocument();
    });
  });
});
