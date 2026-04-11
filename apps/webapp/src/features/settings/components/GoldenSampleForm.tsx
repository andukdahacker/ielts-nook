import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";

type FormValues = {
  title: string;
  skillType: "WRITING" | "SPEAKING";
  studentWork: string;
  teacherFeedback: string;
};

interface GoldenSampleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => Promise<void>;
  initialData?: Partial<FormValues>;
  isSubmitting?: boolean;
  isEdit?: boolean;
}

export function GoldenSampleForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting,
  isEdit = false,
}: GoldenSampleFormProps) {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  const localizedSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("ai.goldenSample.errorTitleRequired")).max(200, t("ai.goldenSample.errorTitleMax")),
        skillType: z.enum(["WRITING", "SPEAKING"]),
        studentWork: z.string().min(50, t("ai.goldenSample.errorStudentWorkMin")).max(5000, t("ai.goldenSample.errorStudentWorkMax")),
        teacherFeedback: z.string().min(50, t("ai.goldenSample.errorFeedbackMin")).max(5000, t("ai.goldenSample.errorFeedbackMax")),
      }),
    [t],
  );
  const form = useForm<FormValues>({
    resolver: zodResolver(localizedSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      skillType: initialData?.skillType ?? "WRITING",
      studentWork: initialData?.studentWork ?? "",
      teacherFeedback: initialData?.teacherFeedback ?? "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    await onSubmit(values);
    form.reset();
  };

  const studentWork = form.watch("studentWork");
  const teacherFeedback = form.watch("teacherFeedback");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("ai.goldenSample.editTitle") : t("ai.goldenSample.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ai.goldenSample.titleLabel")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("ai.goldenSample.titlePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skillType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("ai.goldenSample.skillType")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WRITING">{tCommon("skill.writing")}</SelectItem>
                        <SelectItem value="SPEAKING">{tCommon("skill.speaking")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="studentWork"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("ai.goldenSample.studentWorkLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("ai.goldenSample.studentWorkPlaceholder")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("ai.goldenSample.teacherFeedbackLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("ai.goldenSample.teacherFeedbackPlaceholder")}
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Side-by-side preview */}
            {(studentWork.length > 0 || teacherFeedback.length > 0) && (
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">{t("ai.goldenSample.previewLabel")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-1">{t("ai.studentWork")}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {studentWork || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">{t("ai.teacherFeedback")}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {teacherFeedback || "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("button.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? tCommon("button.update") : tCommon("button.create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
