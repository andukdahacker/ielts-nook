import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import {
  useGradingQueue,
  type GradingQueueFilters,
} from "../hooks/use-grading-queue";
import { useTogglePriority } from "../hooks/use-toggle-priority";
import { GradingQueueListView } from "./GradingQueueListView";
import { QueueFilters } from "./QueueFilters";
import { QueueProgressBar } from "./QueueProgressBar";

interface QueueListModeProps {
  centerId: string;
}

export function QueueListMode({ centerId }: QueueListModeProps) {
  const { t } = useTranslation("grading");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const togglePriority = useTogglePriority();

  const filters: GradingQueueFilters = useMemo(
    () => ({
      classId: searchParams.get("classId") || undefined,
      assignmentId: searchParams.get("assignmentId") || undefined,
      gradingStatus:
        (searchParams.get("gradingStatus") as GradingQueueFilters["gradingStatus"]) ||
        undefined,
      sortBy:
        (searchParams.get("sortBy") as GradingQueueFilters["sortBy"]) ||
        "submittedAt",
      sortOrder:
        (searchParams.get("sortOrder") as GradingQueueFilters["sortOrder"]) ||
        "asc",
      limit: 100,
    }),
    [searchParams],
  );

  const { data, isLoading } = useGradingQueue(filters);
  const queueItems = useMemo(() => data?.data?.items ?? [], [data]);
  const progress = data?.data?.progress ?? null;

  const handleFiltersChange = useCallback(
    (newFilters: GradingQueueFilters) => {
      const params = new URLSearchParams();
      if (newFilters.classId) params.set("classId", newFilters.classId);
      if (newFilters.assignmentId)
        params.set("assignmentId", newFilters.assignmentId);
      if (newFilters.gradingStatus)
        params.set("gradingStatus", newFilters.gradingStatus);
      if (newFilters.sortBy && newFilters.sortBy !== "submittedAt")
        params.set("sortBy", newFilters.sortBy);
      if (newFilters.sortOrder && newFilters.sortOrder !== "asc")
        params.set("sortOrder", newFilters.sortOrder);
      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const classOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of queueItems) {
      if (item.classId && item.className)
        map.set(item.classId, item.className);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [queueItems]);

  const assignmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of queueItems) {
      if (item.assignmentId && item.assignmentTitle)
        map.set(item.assignmentId, item.assignmentTitle);
    }
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [queueItems]);

  const selectedAssignmentTitle = useMemo(() => {
    if (!filters.assignmentId) return null;
    return (
      queueItems.find((i) => i.assignmentId === filters.assignmentId)
        ?.assignmentTitle ?? null
    );
  }, [filters.assignmentId, queueItems]);

  const handleStartGrading = useCallback(() => {
    const target =
      queueItems.find((i) => i.gradingStatus === "ready") ??
      queueItems.find((i) => i.gradingStatus === "in_progress");
    if (target) {
      const params = searchParams.toString();
      navigate(`/${centerId}/dashboard/grading/${target.submissionId}${params ? `?${params}` : ""}`);
    }
  }, [queueItems, centerId, navigate, searchParams]);

  const handleTogglePriority = useCallback(
    (submissionId: string, isPriority: boolean) => {
      togglePriority.mutate({ submissionId, isPriority });
    },
    [togglePriority],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">{t("queueListMode.title")}</h1>
      </div>
      <QueueFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        classOptions={classOptions}
        assignmentOptions={assignmentOptions}
      />
      <QueueProgressBar
        progress={progress}
        assignmentTitle={selectedAssignmentTitle}
      />
      <div className="flex-1 overflow-auto">
        <GradingQueueListView
          items={queueItems}
          isLoading={isLoading}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onTogglePriority={handleTogglePriority}
          onStartGrading={handleStartGrading}
        />
      </div>
    </div>
  );
}
