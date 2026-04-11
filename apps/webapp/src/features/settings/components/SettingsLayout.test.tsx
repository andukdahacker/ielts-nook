import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { SettingsLayout } from "./SettingsLayout";

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({ user: { role: "OWNER", centerId: "center-1" } }),
}));

// Simple outlet content for testing
const MockOutlet = ({ text }: { text: string }) => <div>{text}</div>;

describe("SettingsLayout", () => {
  const renderWithRouter = (initialPath = "/test/dashboard/settings") => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/test/dashboard/settings" element={<SettingsLayout />}>
            <Route index element={<MockOutlet text="General Content" />} />
            <Route path="users" element={<MockOutlet text="Users Content" />} />
            <Route
              path="integrations"
              element={<MockOutlet text="Integrations Content" />}
            />
            <Route
              path="privacy"
              element={<MockOutlet text="Privacy Content" />}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders settings header", () => {
    renderWithRouter();

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your center settings and preferences.")
    ).toBeInTheDocument();
  });

  it("renders all settings tabs", () => {
    renderWithRouter();

    expect(screen.getAllByText("General")).toHaveLength(2); // Desktop + mobile
    expect(screen.getAllByText("Users")).toHaveLength(2);
    expect(screen.getAllByText("Integrations")).toHaveLength(2);
    expect(screen.getAllByText("Privacy")).toHaveLength(2);
    expect(screen.getAllByText("Billing")).toHaveLength(2);
  });

  it("renders Billing tab without Coming Soon badge", () => {
    renderWithRouter();

    expect(screen.getAllByText("Billing")).toHaveLength(2); // Desktop + mobile
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();
  });

  it("highlights General tab on settings root", () => {
    renderWithRouter("/test/dashboard/settings");

    // Find desktop nav buttons with General
    const desktopButtons = screen.getAllByRole("button", { name: /general/i });
    const desktopGeneralButton = desktopButtons.find(
      (btn) => btn.getAttribute("aria-current") === "page"
    );
    expect(desktopGeneralButton).toBeDefined();
  });

  it("highlights Users tab on settings/users path", () => {
    renderWithRouter("/test/dashboard/settings/users");

    const desktopButtons = screen.getAllByRole("button", { name: /^users$/i });
    const activeButton = desktopButtons.find(
      (btn) => btn.getAttribute("aria-current") === "page"
    );
    expect(activeButton).toBeDefined();
  });

  it("renders outlet content for index route", () => {
    renderWithRouter("/test/dashboard/settings");

    expect(screen.getByText("General Content")).toBeInTheDocument();
  });

  it("renders outlet content for users route", () => {
    renderWithRouter("/test/dashboard/settings/users");

    expect(screen.getByText("Users Content")).toBeInTheDocument();
  });

  it("Billing tab is enabled", () => {
    renderWithRouter();

    const billingButtons = screen.getAllByRole("button", { name: /billing/i });
    billingButtons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });
});
