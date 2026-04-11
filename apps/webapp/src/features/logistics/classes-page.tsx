import { useAuth } from "@/features/auth/auth-context";
import { RBACWrapper } from "@/features/auth/components/RBACWrapper";
import type { Class, Course } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Edit2, HeartPulse, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { toast } from "sonner";
import { ClassDrawer } from "./components/ClassDrawer";
import { CourseDrawer } from "./components/CourseDrawer";
import { useClasses, useCourses } from "./hooks/use-logistics";

export const ClassesPage = () => {
  const { t } = useTranslation("logistics");
  const { user } = useAuth();
  const centerId = user?.centerId || undefined;

  const { classes, isLoading: classesLoading, deleteClass } = useClasses(centerId);
  const { courses, isLoading: coursesLoading, deleteCourse } = useCourses(centerId);

  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classDrawerOpen, setClassDrawerOpen] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDrawerOpen, setCourseDrawerOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("classes");

  // Class handlers
  const handleClassCreated = (cls: Class) => {
    setSelectedClass(cls);
    // Drawer stays open — now in edit mode with schedule + roster visible
  };

  const handleCreateClass = () => {
    setSelectedClass(null);
    setClassDrawerOpen(true);
  };

  const handleEditClass = (cls: Class) => {
    setSelectedClass(cls);
    setClassDrawerOpen(true);
  };

  const handleDeleteClass = async (id: string) => {
    if (confirm(t("classes.deleteConfirmClass"))) {
      try {
        await deleteClass(id);
        toast.success(t("classes.deleteSuccessClass"));
      } catch {
        toast.error(t("classes.deleteErrorClass"));
      }
    }
  };

  // Course handlers
  const handleCreateCourse = () => {
    setSelectedCourse(null);
    setCourseDrawerOpen(true);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setCourseDrawerOpen(true);
  };

  const handleDeleteCourse = async (id: string) => {
    if (confirm(t("classes.deleteConfirmCourse"))) {
      try {
        await deleteCourse(id);
        toast.success(t("classes.deleteSuccessCourse"));
      } catch {
        toast.error(t("classes.deleteErrorCourse"));
      }
    }
  };

  if (classesLoading || coursesLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container space-y-8 py-10">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("classes.pageTitle")}</h1>
            <p className="text-muted-foreground">
              {t("classes.pageSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <TabsList>
              <TabsTrigger value="classes">{t("classes.tabClasses")}</TabsTrigger>
              <TabsTrigger value="courses">{t("classes.tabCourses")}</TabsTrigger>
            </TabsList>
            <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
              {activeTab === "classes" ? (
                <Button onClick={handleCreateClass}>
                  <Plus className="mr-2 size-4" />
                  {t("classes.newClass")}
                </Button>
              ) : (
                <Button onClick={handleCreateCourse}>
                  <Plus className="mr-2 size-4" />
                  {t("classes.newCourse")}
                </Button>
              )}
            </RBACWrapper>
          </div>
        </div>

        <TabsContent value="classes">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("classes.tableClassName")}</TableHead>
                  <TableHead>{t("classes.tableCourse")}</TableHead>
                  <TableHead>{t("classes.tableStudents")}</TableHead>
                  <TableHead className="text-right">{t("table.actions", { ns: "common" })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {t("classes.emptyClasses")}
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.course?.name || "N/A"}</TableCell>
                      <TableCell>{cls.studentCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user?.role === "TEACHER" && (
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <Link to={`/${centerId}/dashboard/students?classId=${cls.id}`}>
                                <HeartPulse className="mr-2 size-4" />
                                {t("classes.viewHealth")}
                              </Link>
                            </Button>
                          )}
                          <RBACWrapper requiredRoles={["OWNER", "ADMIN"]}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClass(cls)}
                            >
                              <Users className="mr-2 size-4" />
                              {t("classes.roster")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClass(cls)}
                            >
                              <Edit2 className="size-4" />
                              <span className="sr-only">{t("button.edit", { ns: "common" })}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClass(cls.id)}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">{t("button.delete", { ns: "common" })}</span>
                            </Button>
                          </RBACWrapper>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="courses">
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
                              onClick={() => handleEditCourse(course)}
                            >
                              <Edit2 className="size-4" />
                              <span className="sr-only">{t("button.edit", { ns: "common" })}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteCourse(course.id)}
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
        </TabsContent>
      </Tabs>

      <ClassDrawer
        open={classDrawerOpen}
        onOpenChange={setClassDrawerOpen}
        onCreated={handleClassCreated}
        cls={selectedClass}
        centerId={user?.centerId || ""}
      />

      <CourseDrawer
        open={courseDrawerOpen}
        onOpenChange={setCourseDrawerOpen}
        course={selectedCourse}
        centerId={user?.centerId || ""}
      />
    </div>
  );
};

export default ClassesPage;
