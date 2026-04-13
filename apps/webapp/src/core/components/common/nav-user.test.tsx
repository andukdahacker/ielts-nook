import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavUser } from "./nav-user";
import { MemoryRouter } from "react-router";

// Track theme state
let currentTheme = "system";
const mockSetTheme = vi.fn((t: string) => {
  currentTheme = t;
});

vi.mock("./theme-provider", () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme: mockSetTheme,
  }),
}));

vi.mock("@/features/auth/auth-context", () => ({
  useAuth: () => ({
    logout: vi.fn(),
    user: { centerId: "center-1", role: "OWNER" },
  }),
}));

vi.mock("@workspace/ui/components/sidebar", () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarMenuButton: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    size?: string;
    className?: string;
  }) => <button {...props}>{children}</button>,
  useSidebar: () => ({ isMobile: false }),
}));

const defaultUser = {
  name: "Test User",
  email: "test@example.com",
  avatar: "https://example.com/avatar.jpg",
};

function renderNavUser(user = defaultUser) {
  return render(
    <MemoryRouter>
      <NavUser user={user} />
    </MemoryRouter>,
  );
}

describe("NavUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTheme = "system";
  });

  it("renders user avatar and name", () => {
    renderNavUser();
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows theme toggle in dropdown menu", async () => {
    const user = userEvent.setup();
    renderNavUser();

    // Open dropdown
    const trigger = screen.getByRole("button");
    await user.click(trigger);

    // Should show theme label (System when theme is "system")
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("cycles theme from system to light on click", async () => {
    currentTheme = "system";
    const user = userEvent.setup();
    renderNavUser();

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    // Click the theme menu item (showing "System")
    const themeItem = screen.getByText("System");
    await user.click(themeItem);

    // Should cycle: system → light
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("cycles theme from light to dark", async () => {
    currentTheme = "light";
    const user = userEvent.setup();
    renderNavUser();

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    const themeItem = screen.getByText("Light");
    await user.click(themeItem);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("cycles theme from dark to system", async () => {
    currentTheme = "dark";
    const user = userEvent.setup();
    renderNavUser();

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    const themeItem = screen.getByText("Dark");
    await user.click(themeItem);

    expect(mockSetTheme).toHaveBeenCalledWith("system");
  });

  it("shows initials fallback when no avatar", () => {
    renderNavUser({ name: "Test User", email: "test@example.com" });
    // Should show first initial as fallback
    expect(screen.getAllByText("T")[0]).toBeInTheDocument();
  });

  it("shows My Profile menu item", async () => {
    const user = userEvent.setup();
    renderNavUser();

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  it("shows Log out menu item and opens confirmation dialog", async () => {
    const user = userEvent.setup();
    renderNavUser();

    const trigger = screen.getByRole("button");
    await user.click(trigger);

    const logoutItem = screen.getByText("Log out");
    expect(logoutItem).toBeInTheDocument();

    await user.click(logoutItem);
    expect(
      screen.getByText("Are you sure you want to log out?"),
    ).toBeInTheDocument();
  });
});
