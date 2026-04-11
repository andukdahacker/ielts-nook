import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import type { AuthUser } from "@workspace/types";

// Form value shape. Validation rules + i18n error messages are built per-render
// inside the component (so messages are translated via t()).
type ProfileFormValues = {
  name: string;
  phoneNumber?: string;
  preferredLanguage: "en" | "vi";
  emailScheduleNotifications: boolean;
  emailEngagementNotifications: boolean;
  emailNotificationsPaused: boolean;
};

interface ProfileEditFormProps {
  user: AuthUser;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ProfileEditForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting,
}: ProfileEditFormProps) {
  const { t } = useTranslation("users");
  // Build a localized schema each render so error messages come back already
  // translated. This avoids the need to wrap the FormMessage component.
  const localizedSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t("profileEdit.errorNameRequired"))
          .max(100, t("profileEdit.errorNameMax")),
        phoneNumber: z
          .string()
          .max(20, t("profileEdit.errorPhoneMax"))
          .optional()
          .or(z.literal("")),
        preferredLanguage: z.enum(["en", "vi"]),
        emailScheduleNotifications: z.boolean(),
        emailEngagementNotifications: z.boolean(),
        emailNotificationsPaused: z.boolean(),
      }),
    [t],
  );
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(localizedSchema),
    defaultValues: {
      name: user.name || "",
      phoneNumber: user.phoneNumber || "",
      preferredLanguage: (user.preferredLanguage as "en" | "vi") || "en",
      emailScheduleNotifications: user.emailScheduleNotifications ?? true,
      emailEngagementNotifications: user.emailEngagementNotifications ?? true,
      emailNotificationsPaused: user.emailNotificationsPaused ?? false,
    },
  });

  const handleSubmit = async (values: ProfileFormValues) => {
    await onSubmit({
      ...values,
      phoneNumber: values.phoneNumber || undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t("profileEdit.nameLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("profileEdit.namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
              {void fieldState}
            </FormItem>
          )}
        />

        <div>
          <div className="flex items-center gap-2">
            <FormLabel className="text-sm font-medium">{t("profileEdit.emailLabel")}</FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("profileEdit.emailTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            value={user.email}
            disabled
            className="mt-2 bg-muted text-muted-foreground"
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <FormLabel className="text-sm font-medium">{t("profileEdit.roleLabel")}</FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("profileEdit.roleTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            value={user.role}
            disabled
            className="mt-2 bg-muted text-muted-foreground capitalize"
          />
        </div>

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t("profileEdit.phoneLabel")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("profileEdit.phonePlaceholder")}
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                {t("profileEdit.phoneDescription")}
              </FormDescription>
              <FormMessage />
              {void fieldState}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("profileEdit.languageLabel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("profileEdit.languagePlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* Native names — intentionally not translated so users can
                      always recognize their own language. */}
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notification Preferences Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium leading-none">
            {t("profileEdit.notificationsTitle")}
          </h3>

          <FormField
            control={form.control}
            name="emailNotificationsPaused"
            render={({ field }) => (
              <FormItem
                className={`flex flex-row items-center justify-between rounded-lg border p-4 ${
                  field.value
                    ? "border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
                    : ""
                }`}
              >
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {t("profileEdit.notificationsPauseLabel")}
                  </FormLabel>
                  <FormDescription>
                    {t("profileEdit.notificationsPauseDescription")}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div
            className={
              form.watch("emailNotificationsPaused") ? "opacity-50" : ""
            }
          >
            <FormField
              control={form.control}
              name="emailScheduleNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("profileEdit.notificationsScheduleLabel")}
                    </FormLabel>
                    <FormDescription>
                      {t("profileEdit.notificationsScheduleDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={form.watch("emailNotificationsPaused")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* TODO: Re-enable when achievement & streak features are activated
            <FormField
              control={form.control}
              name="emailEngagementNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("profileEdit.notificationsEngagementLabel")}
                    </FormLabel>
                    <FormDescription>
                      {t("profileEdit.notificationsEngagementDescription")}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={form.watch("emailNotificationsPaused")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            */}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("profileEdit.saveChanges")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("profileEdit.cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
