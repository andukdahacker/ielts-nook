import React from "react";
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

const MOCK_TIMEZONES = [
  "America/New_York",
  "Asia/Ho_Chi_Minh",
  "Europe/London",
  "UTC",
];

const origSupportedValuesOf = Intl.supportedValuesOf;
beforeAll(() => {
  Intl.supportedValuesOf = ((key: string) => {
    if (key === "timeZone") return MOCK_TIMEZONES;
    return origSupportedValuesOf.call(Intl, key as "calendar");
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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), promise: vi.fn() } }));
vi.mock("@hookform/resolvers/zod", () => ({ zodResolver: () => undefined }));
vi.mock("@workspace/types", () => ({
  UpdateCenterSchema: z.object({
    name: z.string().optional(),
    timezone: z.string().optional(),
    brandColor: z.string().optional(),
  }),
}));

// Mock useForm to avoid real react-hook-form rendering issues
vi.mock("react-hook-form", () => {
  interface FormDefaults { [key: string]: string }
  interface FormProps { defaultValues?: FormDefaults }
  interface FieldProps {
    value: string;
    onChange: (v: string | React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    name: string;
    ref: () => void;
  }
  interface FieldState { error: undefined; invalid: boolean; isDirty: boolean; isTouched: boolean }
  interface FormState { errors: Record<string, never>; isSubmitting: boolean }
  interface RenderArg { field: FieldProps; fieldState: FieldState; formState: FormState }

  function useForm(props?: FormProps) {
    const defaults = props?.defaultValues ?? {};
    const valuesRef = React.useRef<FormDefaults>({ ...defaults });
    return {
      control: { _defaultValues: defaults, _valuesRef: valuesRef },
      handleSubmit: (fn: (vals: FormDefaults) => void) => (e?: React.FormEvent) => {
        e?.preventDefault?.();
        fn(valuesRef.current);
      },
      formState: { isSubmitting: false, errors: {} },
      reset: (v?: FormDefaults) => { valuesRef.current = v ?? defaults; },
      getFieldState: () => ({ error: undefined, invalid: false, isDirty: false, isTouched: false }),
    };
  }
  function FormProvider({ children, ...form }: { children: React.ReactNode } & Record<string, unknown>) {
    return React.createElement(Ctx.Provider, { value: form }, children);
  }
  const Ctx = React.createContext<Record<string, unknown> | null>(null);
  function useFormContext() { return React.useContext(Ctx); }
  function useFormState() { return { errors: {} }; }
  function Controller({ render: renderProp, name, control }: {
    render: (arg: RenderArg) => React.ReactElement;
    name: string;
    control?: { _defaultValues?: FormDefaults };
  }) {
    const [value, setValue] = React.useState(control?._defaultValues?.[name] ?? "");
    return renderProp({
      field: { value, onChange: setValue as FieldProps["onChange"], onBlur: () => {}, name, ref: () => {} },
      fieldState: { error: undefined, invalid: false, isDirty: false, isTouched: false },
      formState: { errors: {}, isSubmitting: false },
    });
  }
  return { useForm, FormProvider, useFormContext, useFormState, Controller };
});

// Mock @workspace/ui/components/form — avoids transitive Radix imports
vi.mock("@workspace/ui/components/form", () => {
  interface FieldProps {
    value: string;
    onChange: (v: string | React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    name: string;
    ref: () => void;
  }
  interface RenderArg {
    field: FieldProps;
    fieldState: { error: undefined };
    formState: { errors: Record<string, never>; isSubmitting: boolean };
  }

  const Form = ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children);
  const FormField = ({ render: renderProp, name, control }: {
    render: (arg: RenderArg) => React.ReactElement;
    name: string;
    control?: { _defaultValues?: Record<string, string> };
  }) => {
    const [value, setValue] = React.useState(control?._defaultValues?.[name] ?? "");
    return renderProp({
      field: {
        value,
        onChange: (v: string | React.ChangeEvent<HTMLInputElement>) =>
          setValue(typeof v === "object" && v !== null && "target" in v ? v.target.value : v),
        onBlur: () => {},
        name,
        ref: () => {},
      },
      fieldState: { error: undefined },
      formState: { errors: {}, isSubmitting: false },
    });
  };
  const FormItem = ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement("div", { className }, children);
  const FormLabel = ({ children }: { children: React.ReactNode }) =>
    React.createElement("label", null, children);
  const FormControl = ({ children }: { children: React.ReactNode }) => children;
  const FormDescription = ({ children }: { children: React.ReactNode }) =>
    React.createElement("p", null, children);
  const FormMessage = () => null;
  return { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage };
});

// Mock @workspace/ui/components/popover
vi.mock("@workspace/ui/components/popover", () => {
  interface PopoverCtxValue { open: boolean; onOpenChange: (v: boolean) => void }
  const Ctx = React.createContext<PopoverCtxValue>({ open: false, onOpenChange: () => {} });
  const Popover = ({ children, open, onOpenChange }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
  }) => {
    const [isOpen, setIsOpen] = React.useState(open ?? false);
    return React.createElement(Ctx.Provider, {
      value: { open: open ?? isOpen, onOpenChange: onOpenChange ?? setIsOpen },
    }, children);
  };
  const PopoverTrigger = ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => {
    const { open, onOpenChange } = React.useContext(Ctx);
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => onOpenChange(!open),
      });
    }
    return React.createElement("button", { onClick: () => onOpenChange(!open) }, children);
  };
  const PopoverContent = ({ children }: { children: React.ReactNode }) => {
    const { open } = React.useContext(Ctx);
    if (!open) return null;
    return React.createElement("div", null, children);
  };
  return { Popover, PopoverTrigger, PopoverContent };
});

// Mock @workspace/ui/components/command
vi.mock("@workspace/ui/components/command", () => {
  const FilterCtx = React.createContext("");
  const Command = ({ children }: { children: React.ReactNode }) => {
    const [filter, setFilter] = React.useState("");
    return React.createElement(FilterCtx.Provider, { value: filter },
      React.createElement("div", null,
        React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ _setFilter?: (v: string) => void }>, { _setFilter: setFilter })
            : child
        )
      )
    );
  };
  const CommandInput = ({ placeholder, _setFilter }: { placeholder?: string; _setFilter?: (v: string) => void }) =>
    React.createElement("input", {
      placeholder,
      role: "searchbox",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => _setFilter?.(e.target.value),
    });
  const CommandList = ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children);
  const CommandEmpty = ({ children }: { children: React.ReactNode }) => {
    const filter = React.useContext(FilterCtx);
    if (!filter) return null;
    return React.createElement("div", null, children);
  };
  const CommandGroup = ({ children }: { children: React.ReactNode }) => React.createElement("div", null, children);
  const CommandItem = ({ children, value, onSelect }: {
    children: React.ReactNode;
    value?: string;
    onSelect?: (v: string) => void;
  }) => {
    const filter = React.useContext(FilterCtx);
    if (filter && !value?.toLowerCase().includes(filter.toLowerCase())) return null;
    return React.createElement("div", { role: "option", onClick: () => onSelect?.(value ?? "") }, children);
  };
  return { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem };
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
