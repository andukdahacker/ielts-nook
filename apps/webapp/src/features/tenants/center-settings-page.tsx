import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UpdateCenterSchema, type UpdateCenterInput } from "@workspace/types";
import { useTenant } from "./tenant-context";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2, Upload } from "lucide-react";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslation } from "react-i18next";

export const CenterSettingsPage: React.FC = () => {
  const { tenant, updateBranding, uploadLogo, isLoading } = useTenant();
  const { t } = useTranslation("settings");

  const form = useForm<UpdateCenterInput>({
    resolver: zodResolver(UpdateCenterSchema),
    defaultValues: {
      name: tenant?.name || "",
      brandColor: tenant?.brandColor || "#2563EB",
      timezone: tenant?.timezone || "UTC",
    },
  });

  // Update form values when tenant data loads
  React.useEffect(() => {
    if (tenant) {
      form.reset({
        name: tenant.name,
        brandColor: tenant.brandColor,
        timezone: tenant.timezone,
      });
    }
  }, [tenant, form]);

  const onSubmit = async (values: UpdateCenterInput) => {
    try {
      await updateBranding(values);
      toast.success(t("general.success"));
    } catch {
      toast.error(t("general.error"));
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("general.logoSizeError"));
      return;
    }

    try {
      const promise = uploadLogo(file);
      toast.promise(promise, {
        loading: t("general.logoUploadLoading"),
        success: t("general.logoUploadSuccess"),
        error: t("general.logoUploadError"),
      });
      await promise;
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("general.title")}</h1>
        <p className="text-muted-foreground">
          {t("layout.description")}
        </p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("general.branding")}</h2>
          <div className="flex items-center gap-6">
            <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              {tenant?.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={t("general.centerLogo")}
                  className="size-full object-contain"
                />
              ) : (
                <Upload className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 size-4" />
                    {t("general.changeLogo")}
                  </span>
                </Button>
                <Input
                  id="logo"
                  type="file"
                  className="hidden"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                />
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("general.logoHint")}
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("general.centerName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("general.centerNamePlaceholder")} {...field} />
                  </FormControl>
                  <FormDescription>
                    {t("general.centerNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brandColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("general.brandColor")}</FormLabel>
                  <div className="flex items-center gap-4">
                    <FormControl>
                      <Input type="color" className="size-10 p-1" {...field} />
                    </FormControl>
                    <Input {...field} className="font-mono" />
                  </div>
                  <FormDescription>
                    {t("general.brandColorDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t("general.timezone")}</FormLabel>
                  <TimezoneCombobox
                    value={field.value ?? ""}
                    onSelect={(tz) => {
                      field.onChange(tz);
                    }}
                  />
                  <FormDescription>
                    {t("general.timezoneDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {t("general.saveChanges")}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

function TimezoneCombobox({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (tz: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation("settings");
  const timezones = React.useMemo(() => Intl.supportedValuesOf("timeZone"), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || t("general.timezoneSelectPlaceholder")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={t("general.timezoneSearchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("general.timezoneNotFound")}</CommandEmpty>
            <CommandGroup>
              {timezones.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => {
                    onSelect(tz);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === tz ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
