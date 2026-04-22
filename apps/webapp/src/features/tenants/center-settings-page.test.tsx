import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const MOCK_TIMEZONES = [
  "America/New_York",
  "Asia/Ho_Chi_Minh",
  "Europe/London",
  "UTC",
];

const origSupportedValuesOf = Intl.supportedValuesOf;
beforeAll(() => {
  Intl.supportedValuesOf = ((key: "calendar" | "collation" | "currency" | "numberingSystem" | "timeZone" | "unit") => {
    if (key === "timeZone") return MOCK_TIMEZONES;
    return origSupportedValuesOf.call(Intl, key);
  }) as typeof Intl.supportedValuesOf;
});
afterAll(() => {
  Intl.supportedValuesOf = origSupportedValuesOf;
});

const mockUpdateBranding = vi.fn();
vi.mock("./tenant-context", () => ({
  useTenant: () => ({
    tenant: {
      name: "Test Center",
      brandColor: "#2563EB",
      timezone: "Asia/Ho_Chi_Minh",
      logoUrl: null,
    },
    updateBranding: mockUpdateBranding,
    uploadLogo: vi.fn(),
    isLoading: false,
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() },
}));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("@workspace/types", () => {
  const { z } = require("zod");
  return {
    UpdateCenterSchema: z.object({
      name: z.string().optional(),
      timezone: z.string().optional(),
      brandColor: z.string().optional(),
    }),
  };
});

// Mock useForm to avoid real react-hook-form rendering issues
vi.mock("react-hook-form", () => {
  const React = require("react");
  const Ctx = React.createContext(null as any);
  function useForm(props: any) {
    const defaults = props?.defaultValues ?? {};
    const valuesRef = React.useRef({ ...defaults });
    return {
      control: { _defaultValues: defaults, _valuesRef: valuesRef },
      handleSubmit: (fn: any) => (e: any) => {
        e?.preventDefault?.();
        fn(valuesRef.current);
      },
      formState: { isSubmitting: false, errors: {} },
      reset: (v: any) => {
        valuesRef.current = v ?? defaults;
      },
      getFieldState: () => ({
        error: undefined,
        invalid: false,
        isDirty: false,
        isTouched: false,
      }),
    };
  }
  function FormProvider({ children, ...form }: any) {
    return React.createElement(Ctx.Provider, { value: form }, children);
  }
  function useFormContext() {
    return React.useContext(Ctx);
  }
  function useFormState() {
    return { errors: {} };
  }
  function Controller({ render: renderProp, name, control }: any) {
    const [value, setValue] = React.useState(
      control?._defaultValues?.[name] ?? "",
    );
    return renderProp({
      field: {
        value,
        onChange: setValue,
        onBlur: () => {},
        name,
        ref: () => {},
      },
      fieldState: {
        error: undefined,
        invalid: false,
        isDirty: false,
        isTouched: false,
      },
      formState: { errors: {}, isSubmitting: false },
    });
  }
  return { useForm, FormProvider, useFormContext, useFormState, Controller };
});

// Mock @workspace/ui/components/form — avoids transitive Radix imports
vi.mock("@workspace/ui/components/form", () => {
  const React = require("react");
  const Form = ({ children }: any) =>
    React.createElement("div", null, children);
  const FormField = ({ render: renderProp, name, control }: any) => {
    const [value, setValue] = React.useState(
      control?._defaultValues?.[name] ?? "",
    );
    return renderProp({
      field: {
        value,
        onChange: (v: any) =>
          setValue(typeof v?.target !== "undefined" ? v.target.value : v),
        onBlur: () => {},
        name,
        ref: () => {},
      },
      fieldState: { error: undefined },
      formState: { errors: {}, isSubmitting: false },
    });
  };
  const FormItem = ({ children, className }: any) =>
    React.createElement("div", { className }, children);
  const FormLabel = ({ children }: any) =>
    React.createElement("label", null, children);
  const FormControl = ({ children }: any) => children;
  const FormDescription = ({ children }: any) =>
    React.createElement("p", null, children);
  const FormMessage = () => null;
  return {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
  };
});

// Mock @workspace/ui/components/popover
vi.mock("@workspace/ui/components/popover", () => {
  const React = require("react");
  const Ctx = React.createContext({
    open: false,
    onOpenChange: (_: boolean) => {},
  });
  const Popover = ({ children, open, onOpenChange }: any) => {
    const [isOpen, setIsOpen] = React.useState(open ?? false);
    return React.createElement(
      Ctx.Provider,
      {
        value: {
          open: open ?? isOpen,
          onOpenChange: onOpenChange ?? setIsOpen,
        },
      },
      children,
    );
  };
  const PopoverTrigger = ({ children, asChild }: any) => {
    const { open, onOpenChange } = React.useContext(Ctx);
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: () => onOpenChange(!open),
      } as any);
    }
    return React.createElement(
      "button",
      { onClick: () => onOpenChange(!open) },
      children,
    );
  };
  const PopoverContent = ({ children }: any) => {
    const { open } = React.useContext(Ctx);
    if (!open) return null;
    return React.createElement("div", null, children);
  };
  return { Popover, PopoverTrigger, PopoverContent };
});

// Mock @workspace/ui/components/command
vi.mock("@workspace/ui/components/command", () => {
  const React = require("react");
  const FilterCtx = React.createContext("");
  const Command = ({ children }: any) => {
    const [filter, setFilter] = React.useState("");
    return React.createElement(
      FilterCtx.Provider,
      { value: filter },
      React.createElement(
        "div",
        null,
        React.Children.map(children, (child: any) =>
          React.isValidElement(child)
            ? React.cloneElement(child, { _setFilter: setFilter } as any)
            : child,
        ),
      ),
    );
  };
  const CommandInput = ({ placeholder, _setFilter }: any) =>
    React.createElement("input", {
      placeholder,
      role: "searchbox",
      onChange: (e: any) => _setFilter?.(e.target.value),
    });
  const CommandList = ({ children }: any) =>
    React.createElement("div", null, children);
  const CommandEmpty = ({ children }: any) => {
    const filter = React.useContext(FilterCtx);
    if (!filter) return null;
    return React.createElement("div", null, children);
  };
  const CommandGroup = ({ children }: any) =>
    React.createElement("div", null, children);
  const CommandItem = ({ children, value, onSelect }: any) => {
    const filter = React.useContext(FilterCtx);
    if (filter && !value?.toLowerCase().includes(filter.toLowerCase()))
      return null;
    return React.createElement(
      "div",
      { role: "option", onClick: () => onSelect?.(value) },
      children,
    );
  };
  return {
    Command,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
  };
});

import { CenterSettingsPage } from "./center-settings-page";

describe("CenterSettingsPage — Timezone Combobox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the timezone combobox with pre-selected value", () => {
    render(<CenterSettingsPage />);
    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveTextContent("Asia/Ho_Chi_Minh");
  });

  it("opens timezone dropdown and shows search input", async () => {
    const user = userEvent.setup();
    render(<CenterSettingsPage />);
    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("filters timezones when searching", async () => {
    const user = userEvent.setup();
    render(<CenterSettingsPage />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "America");
    expect(screen.getByText("America/New_York")).toBeInTheDocument();
    expect(screen.queryByText("Europe/London")).not.toBeInTheDocument();
  });

  it("selects a timezone from the dropdown", async () => {
    const user = userEvent.setup();
    render(<CenterSettingsPage />);
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.click(screen.getByText("Europe/London"));
    expect(combobox).toHaveTextContent("Europe/London");
  });

  it("shows no options when search yields no results", async () => {
    const user = userEvent.setup();
    render(<CenterSettingsPage />);
    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByRole("searchbox"), "Nonexistent");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });
});
