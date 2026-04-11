import { useAuth } from "@/features/auth/auth-context";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import type { Course } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CourseDrawer } from "./components/CourseDrawer";
import { useCourses } from "./hooks/use-logistics";

export const CoursesPage = () => {
  const { t } = useTranslation("logistics");
  const { user } = useAuth();
  const { courses, isLoading, deleteCourse } = useCourses(user?.centerId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setDrawerOpen(true);
  };

  const handleCreate = () => {
    setSelectedCourse(null);
    setDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("classes.deleteConfirmCourse"))) {
      try {
        await deleteCourse(id);
        toast.success(t("classes.deleteSuccessCourse"));
      } catch {
        toast.error(t("classes.deleteErrorCourse"));
      }
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
    <div className="container space-y-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("courses.pageTitle")}</h1>
          <p className="text-muted-foreground">
            {t("courses.pageSubtitle")}
          </p>
        </div>
        <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 size-4" />
            {t("classes.newCourse")}
          </Button>
        </RBACWrapper>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">{t("classes.tableColor")}</TableHead>
              <TableHead>{t("classes.tableName")}</TableHead>
              <TableHead>{t("classes.tableDescription")}</TableHead>
              <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
                <TableHead className="text-right">{t("table.actions", { ns: "common" })}</TableHead>
              </RBACWrapper>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("classes.emptyCourses")}
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div
                      className="size-6 rounded-md border"
                      style={{ backgroundColor: course.color || "#ccc" }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell className="max-w-md truncate text-muted-foreground">
                    {course.description || t("classes.noDescription")}
                  </TableCell>
                  <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(course)}
                        >
                          <Edit2 className="size-4" />
                          <span className="sr-only">{t("button.edit", { ns: "common" })}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(course.id)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">{t("button.delete", { ns: "common" })}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </RBACWrapper>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CourseDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        course={selectedCourse}
        centerId={user?.centerId || ""}
      />
    </div>
  );
};

export default CoursesPage;
