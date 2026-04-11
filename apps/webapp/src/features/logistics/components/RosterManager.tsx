import client from "@/core/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Loader2, Search, UserMinus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRoster } from "../hooks/use-logistics";

interface RosterManagerProps {
  classId: string;
  centerId: string;
}

export function RosterManager({ classId, centerId }: RosterManagerProps) {
  const { t } = useTranslation("logistics");
  const {
    roster,
    isLoading: isRosterLoading,
    addStudent,
    removeStudent,
  } = useRoster(classId, centerId);
  const [search, setSearch] = useState("");

  const availableStudentsQuery = useQuery({
    queryKey: ["available-students", centerId, search],
    queryFn: async () => {
      const { data, error } = await client.GET(
        "/api/v1/logistics/classes/available-students",
        {
          params: { query: { search } },
        },
      );
      if (error) throw error;
      return data.data;
    },
    enabled: !!centerId,
  });

  // P3: Memoize enrolled student IDs to avoid re-creating Set each render
  const enrolledIds = useMemo(
    () => new Set(roster.map((item) => item.studentId)),
    [roster],
  );

  // P2: Memoize filtered available students list (replaces IIFE in JSX)
  const filteredAvailableStudents = useMemo(() => {
    const all = availableStudentsQuery.data ?? [];
    return all.filter((student) => !enrolledIds.has(student.id));
  }, [availableStudentsQuery.data, enrolledIds]);

  const handleAdd = async (studentId: string) => {
    try {
      await addStudent({ studentId });
      toast.success(t("attendance.toastAddSuccess"));
    } catch {
      toast.error(t("attendance.toastAddError"));
    }
  };

  const handleRemove = async (studentId: string) => {
    try {
      await removeStudent(studentId);
      toast.success(t("attendance.toastRemoveSuccess"));
    } catch {
      toast.error(t("attendance.toastRemoveError"));
    }
  };

  // P6: Contextual empty state message for available students
  const emptyMessage = useMemo(() => {
    const rawCount = (availableStudentsQuery.data ?? []).length;
    if (rawCount > 0) return t("rosterManager.emptyAllEnrolled");
    if (search) return t("rosterManager.emptyNoSearchResults");
    return t("rosterManager.emptyNotFound");
  }, [availableStudentsQuery.data, search, t]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{t("rosterManager.classRoster")}</h3>
            <Badge variant="secondary">{roster.length} {t("rosterManager.studentsBadge")}</Badge>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("rosterManager.headerName")}</TableHead>
                  <TableHead className="text-right">{t("rosterManager.headerAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRosterLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : roster.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {t("rosterManager.emptyNoStudents")}
                    </TableCell>
                  </TableRow>
                ) : (
                  roster.map((item) => (
                    <TableRow key={item.studentId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {item.student?.name || t("attendance.unknown")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.student?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleRemove(item.studentId)}
                        >
                          <UserMinus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("rosterManager.addStudents")}</h3>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder={t("rosterManager.searchPlaceholder")}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("rosterManager.headerName")}</TableHead>
                  <TableHead className="text-right">{t("rosterManager.headerAction")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* P5: Show loading while either query or roster is loading */}
                {availableStudentsQuery.isLoading || isRosterLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      <Loader2 className="mx-auto size-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filteredAvailableStudents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAvailableStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {student.name || t("attendance.unknown")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAdd(student.id)}
                        >
                          <UserPlus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
