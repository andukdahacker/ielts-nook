import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateCourseSchema,
  type CreateCourseInput,
  type Course,
} from "@workspace/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@workspace/ui/components/sheet";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useCourses } from "../hooks/use-logistics";

interface CourseDrawerProps {
  course?: Course | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centerId: string;
}

export function CourseDrawer({
  course,
  open,
  onOpenChange,
  centerId,
}: CourseDrawerProps) {
  const { t } = useTranslation("logistics");
  const [step, setStep] = useState(1);
  const [isSavingNext, setIsSavingNext] = useState(false);
  const isEditing = !!course;
  const { createCourse, updateCourse } = useCourses(centerId);

  const form = useForm<CreateCourseInput>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#2563EB",
    },
  });

  useEffect(() => {
    if (open) {
      if (course) {
        form.reset({
          name: course.name,
          description: course.description || "",
          color: course.color || "#2563EB",
        });
      } else {
        form.reset({
          name: "",
          description: "",
          color: "#2563EB",
        });
      }
      setStep(1);
    }
  }, [open, course, form]);

  const onSubmit = async (values: CreateCourseInput) => {
    try {
      if (isEditing && course) {
        await updateCourse({ id: course.id, input: values });
        toast.success(t("courseDrawer.toastUpdateSuccess"));
      } else {
        await createCourse(values);
        toast.success(t("courseDrawer.toastSuccess"));
      }
      onOpenChange(false);
    } catch {
      toast.error(t("courseDrawer.toastError"));
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && form.formState.isDirty) {
      if (
        confirm(t("courseDrawer.unsavedChanges"))
      ) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(newOpen);
    }
  };

  const handleNext = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isValid = await form.trigger(["name", "color"]);
    if (!isValid) return;

    if (isEditing && course) {
      setIsSavingNext(true);
      try {
        await updateCourse({ id: course.id, input: form.getValues() });
        toast.success(t("courseDrawer.toastSaveChanges"));
        setStep(2);
      } catch {
        toast.error(t("courseDrawer.toastSaveError"));
      } finally {
        setIsSavingNext(false);
      }
    } else {
      setStep(2);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? t("courseDrawer.titleEdit") : t("courseDrawer.titleCreate")}
          </SheetTitle>
          <SheetDescription>
            {step === 1
              ? t("courseDrawer.descriptionStep1")
              : t("courseDrawer.descriptionStep2")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 p-6"
          >
            {step === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("courseDrawer.courseName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("courseDrawer.courseNamePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("courseDrawer.description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("courseDrawer.descriptionPlaceholder")}
                          className="resize-none"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("courseDrawer.brandColor")}</FormLabel>
                      <div className="flex items-center gap-4">
                        <FormControl>
                          <Input
                            type="color"
                            className="size-10 p-1"
                            {...field}
                            value={field.value || "#2563EB"}
                          />
                        </FormControl>
                        <Input
                          {...field}
                          value={field.value || "#2563EB"}
                          className="font-mono"
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </div>
                      <FormDescription>
                        {t("courseDrawer.brandColorHelp")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">
                    {t("courseDrawer.schedulingRoster")}
                  </p>
                  <p className="mt-1">
                    {t("courseDrawer.schedulingRosterInfo")}
                  </p>
                </div>
                {/*
                  Placeholder for Class fields as per AC4.
                  Since they are not in the current DB Task for Course,
                  we keep them as progressive disclosure UI for now.
                */}
                <FormItem>
                  <FormLabel>{t("courseDrawer.defaultTeacher")}</FormLabel>
                  <Input disabled placeholder={t("courseDrawer.defaultTeacherPlaceholder")} />
                </FormItem>
                <FormItem>
                  <FormLabel>{t("courseDrawer.room")}</FormLabel>
                  <Input disabled placeholder={t("courseDrawer.roomPlaceholder")} />
                </FormItem>
                <FormItem>
                  <FormLabel>{t("courseDrawer.days")}</FormLabel>
                  <div className="flex gap-2">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled
                      >
                        {day}
                      </Button>
                    ))}
                  </div>
                </FormItem>
              </div>
            )}

            <SheetFooter className="flex-row justify-between sm:justify-between">
              {step === 2 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  <ChevronLeft className="mr-2 size-4" />
                  {t("button.back", { ns: "common" })}
                </Button>
              ) : (
                <div /> // Spacer
              )}

              <div className="flex gap-2">
                {step === 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSavingNext}
                  >
                    {isSavingNext && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {t("button.next", { ns: "common" })}
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {isEditing ? t("button.saveChanges", { ns: "common" }) : t("courseDrawer.createCourse")}
                  </Button>
                )}
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
