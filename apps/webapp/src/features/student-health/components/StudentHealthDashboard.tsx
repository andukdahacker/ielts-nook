import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import type { HealthStatus } from "@workspace/types";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Button } from "@workspace/ui/components/button";
import { Search } from "lucide-react";
import { useStudentHealthDashboard } from "../hooks/use-student-health-dashboard";
import { HealthSummaryBar } from "./HealthSummaryBar";
import { StudentHealthCardComponent } from "./StudentHealthCard";
import { StudentProfileOverlay } from "./StudentProfileOverlay";

export function StudentHealthDashboard() {
  const { t } = useTranslation("student-health");
  const [searchParams] = useSearchParams();
  const initialClassId = searchParams.get("classId") ?? undefined;
  const [classId, setClassId] = useState<string | undefined>(initialClassId);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HealthStatus | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = useMemo(
    () => ({
      ...(classId ? { classId } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [classId, debouncedSearch],
  );

  const { students, summary, isLoading, isError, refetch } =
    useStudentHealthDashboard(filters);

  // Cache the full class list from unfiltered responses to prevent
  // the dropdown from losing options when a class filter is active
  const classListCacheRef = useRef<Array<{ id: string; name: string }>>([]);

  const computedClasses = useMemo(() => {
    const classMap = new Map<string, string>();
    for (const student of students) {
      for (const cls of student.classes) {
        classMap.set(cls.id, cls.name);
      }
    }
    return Array.from(classMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  if (!classId && !debouncedSearch && computedClasses.length > 0) {
    classListCacheRef.current = computedClasses;
  }

  const availableClasses =
    classListCacheRef.current.length > 0
      ? classListCacheRef.current
      : computedClasses;

  // Client-side filter by status (from summary bar clicks)
  const filteredStudents = statusFilter
    ? students.filter((s) => s.healthStatus === statusFilter)
    : students;

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("page.errorTitle")}</h1>
          <p className="text-muted-foreground">
            {t("page.description")}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            {t("page.errorMessage")}
          </p>
          <Button onClick={() => refetch()}>{t("button.retry", { ns: "common" })}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("page.title")}</h1>
        <p className="text-muted-foreground">
          {t("page.description")}
        </p>
      </div>

      {/* Summary bar */}
      <HealthSummaryBar
        summary={summary}
        isLoading={isLoading}
        onFilterClick={(status) =>
          setStatusFilter(status === statusFilter ? null : status)
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("page.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={classId ?? "all"}
          onValueChange={(v) => setClassId(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t("page.classFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("page.classFilter")}</SelectItem>
            {availableClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Student cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            {students.length === 0 && !debouncedSearch && !classId
              ? t("page.noStudents")
              : t("page.noMatches")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <StudentHealthCardComponent
              key={student.id}
              student={student}
              onClick={() => setSelectedStudentId(student.id)}
            />
          ))}
        </div>
      )}

      <StudentProfileOverlay
        studentId={selectedStudentId}
        open={selectedStudentId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedStudentId(null);
        }}
      />
    </div>
  );
}
