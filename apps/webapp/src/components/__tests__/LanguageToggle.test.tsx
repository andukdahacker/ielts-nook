import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import i18n from "i18next";
import { LanguageToggle } from "../LanguageToggle";

const updateProfile = vi.fn();
let mockUser: { id: string; preferredLanguage?: "en" | "vi" } | null = {
  id: "u-1",
  preferredLanguage: "en",
};

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/features/users/users.api", () => ({
  useUpdateProfile: () => ({ mutate: updateProfile, isPending: false }),
}));

// Stub Radix Select with native primitives so jsdom (no pointer capture) can drive it
vi.mock("@workspace/ui/components/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      data-testid="lang-select"
      aria-label="Select language"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

describe("LanguageToggle", () => {
  beforeEach(async () => {
    updateProfile.mockReset();
    mockUser = { id: "u-1", preferredLanguage: "en" };
    if (i18n.language !== "en") {
      await i18n.changeLanguage("en");
    }
  });

  it("renders both languages in their native names", () => {
    render(<LanguageToggle />);
    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Tiếng Việt" })).toBeInTheDocument();
  });

  it("reflects the current language as the selected option", () => {
    render(<LanguageToggle />);
    const select = screen.getByTestId("lang-select") as HTMLSelectElement;
    expect(select.value).toBe("en");
  });

  it("calls updateProfile when authenticated user changes language", async () => {
    const { fireEvent, waitFor } = await import("@testing-library/react");
    render(<LanguageToggle />);

    const select = screen.getByTestId("lang-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "vi" } });

    // useLanguage.changeLanguage awaits i18n.changeLanguage before firing the
    // mutation, so we wait for the side effect.
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalled();
    });
    // First positional arg is the mutation payload.
    expect(updateProfile.mock.calls[0][0]).toEqual({ preferredLanguage: "vi" });
    expect(i18n.language).toBe("vi");
  });

  it("does not call updateProfile when user is unauthenticated", async () => {
    mockUser = null;
    const { fireEvent, waitFor } = await import("@testing-library/react");
    render(<LanguageToggle />);

    const select = screen.getByTestId("lang-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "vi" } });

    await waitFor(() => {
      expect(i18n.language).toBe("vi");
    });
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
