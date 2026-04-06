import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  skillType: z.enum(["WRITING", "SPEAKING"]),
  studentWork: z.string().min(50, "Student work must be at least 50 characters").max(5000, "Student work must be at most 5000 characters"),
  teacherFeedback: z.string().min(50, "Teacher feedback must be at least 50 characters").max(5000, "Teacher feedback must be at most 5000 characters"),
});

type FormValues = z.infer<typeof formSchema>;

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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
            {isEdit ? "Edit Golden Sample" : "Add Golden Sample"}
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
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Band 7 Writing Sample" {...field} />
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
                    <FormLabel>Skill Type</FormLabel>
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
                        <SelectItem value="WRITING">Writing</SelectItem>
                        <SelectItem value="SPEAKING">Speaking</SelectItem>
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
                  <FormLabel>Student Work</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the student's original text here (min 50 characters)..."
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
                  <FormLabel>Teacher Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the teacher's feedback here (min 50 characters)..."
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
                <p className="text-sm font-medium text-muted-foreground">Preview</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium mb-1">Student Work</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
                      {studentWork || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1">Teacher Feedback</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
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
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
