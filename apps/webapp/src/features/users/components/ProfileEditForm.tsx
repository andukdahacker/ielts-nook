import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  phoneNumber: z.string().max(20, "Phone number must be at most 20 characters").optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "vi"]),
  emailScheduleNotifications: z.boolean(),
  emailEngagementNotifications: z.boolean(),
  emailNotificationsPaused: z.boolean(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

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
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <div className="flex items-center gap-2">
            <FormLabel className="text-sm font-medium">Email</FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Email cannot be changed. Contact an admin if needed.</p>
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
            <FormLabel className="text-sm font-medium">Role</FormLabel>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Role can only be changed by the center owner.</p>
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input
                  placeholder="+84 123 456 789"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Optional. Vietnamese format (+84 or 0xxx) recommended.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferredLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Language</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="vi">Vietnamese</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notification Preferences Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium leading-none">
            Notification Preferences
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
                    Pause all email notifications
                  </FormLabel>
                  <FormDescription>
                    Temporarily stop all email notifications. Your category
                    preferences are preserved.
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
                      Schedule changes
                    </FormLabel>
                    <FormDescription>
                      Email me when class schedules change or sessions are
                      cancelled
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

            <FormField
              control={form.control}
              name="emailEngagementNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Achievements & streaks
                    </FormLabel>
                    <FormDescription>
                      Email me when I hit a 7-day streak or achieve a personal
                      best
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
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
