import { useState, useEffect } from "react";
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
      setIsSavingNext(false);
    }
  }, [open, course, form]);

  const onSubmit = async (values: CreateCourseInput) => {
    try {
      if (isEditing && course) {
        await updateCourse({ id: course.id, input: values });
        toast.success("Course updated successfully");
      } else {
        await createCourse(values);
        toast.success("Course created successfully");
      }
      onOpenChange(false);
    } catch {
      toast.error("Failed to save course");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isSavingNext) return;
    if (!newOpen && form.formState.isDirty) {
      if (
        confirm(
          "You have unsaved changes. Are you sure you want to close this drawer?",
        )
      ) {
        onOpenChange(false);
      }
    } else {
      onOpenChange(newOpen);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Course" : "Create New Course"}
          </SheetTitle>
          <SheetDescription>
            {step === 1
              ? "Fill in the basic details for your course."
              : "Configure scheduling and roster options."}
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
                      <FormLabel>Course Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. IELTS Foundation" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What will students learn in this course?"
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
                      <FormLabel>Brand Color</FormLabel>
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
                        Used for course identification on the calendar.
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
                    Scheduling & Roster
                  </p>
                  <p className="mt-1">
                    Specific classes and schedules will be managed in the
                    Classes section. This step will allow you to pre-configure
                    defaults in a future update.
                  </p>
                </div>
                {/*
                  Placeholder for Class fields as per AC4.
                  Since they are not in the current DB Task for Course,
                  we keep them as progressive disclosure UI for now.
                */}
                <FormItem>
                  <FormLabel>Default Teacher</FormLabel>
                  <Input disabled placeholder="Select teacher..." />
                </FormItem>
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Input disabled placeholder="e.g. Room 101" />
                </FormItem>
                <FormItem>
                  <FormLabel>Days</FormLabel>
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
                  Back
                </Button>
              ) : (
                <div /> // Spacer
              )}

              <div className="flex gap-2">
                {step === 1 ? (
                  <Button
                    type="button"
                    disabled={isSavingNext}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const isValid = await form.trigger(["name", "color"]);
                      if (!isValid) return;

                      if (isEditing && course) {
                        setIsSavingNext(true);
                        try {
                          const { name, description, color } = form.getValues();
                          await updateCourse({
                            id: course.id,
                            input: { name, description, color },
                          });
                          toast.success("Changes saved");
                          setStep(2);
                        } catch {
                          toast.error("Failed to save changes");
                        } finally {
                          setIsSavingNext(false);
                        }
                      } else {
                        setStep(2);
                      }
                    }}
                  >
                    {isSavingNext && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Next
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    {isEditing ? "Save Changes" : "Create Course"}
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
