import { useAuth } from "@/features/auth/auth-context";
import type { Exercise, ExerciseSkill, ExerciseStatus, BandLevel, IeltsQuestionType } from "@workspace/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Archive,
  Book,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Headphones,
  LayoutGrid,
  LayoutList,
  Loader2,
  Mic,
  MoreHorizontal,
  Pen,
  Plus,
  RotateCcw,
  Search,
  Tag,
  X,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useExercises } from "./hooks/use-exercises";
import { useTags } from "./hooks/use-tags";
import { useAssignmentCounts } from "@/features/assignments/hooks/use-assignments";
import { CreateAssignmentDialog } from "@/features/assignments/components/create-assignment-dialog";

const SKILL_ICONS: Record<ExerciseSkill, React.ReactNode> = {
  READING: <Book className="size-4" />,
  LISTENING: <Headphones className="size-4" />,
  WRITING: <Pen className="size-4" />,
  SPEAKING: <Mic className="size-4" />,
};

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const getSkillLabels = (t: TFunc): Record<ExerciseSkill, string> => ({
  READING: t("skill.reading", { ns: "common" }),
  LISTENING: t("skill.listening", { ns: "common" }),
  WRITING: t("skill.writing", { ns: "common" }),
  SPEAKING: t("skill.speaking", { ns: "common" }),
});

const getStatusVariants = (
  t: TFunc,
): Record<ExerciseStatus, { label: string; className: string }> => ({
  DRAFT: { label: t("status.draft"), className: "bg-muted text-muted-foreground" },
  PUBLISHED: {
    label: t("status.published"),
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  ARCHIVED: {
    label: t("status.archived"),
    className: "bg-muted/50 text-muted-foreground/70",
  },
});

const getQuestionTypeGroups = (
  t: TFunc,
): { skill: string; types: { value: string; label: string }[] }[] => [
  {
    skill: t("skill.reading", { ns: "common" }),
    types: [
      { value: "R1_MCQ_SINGLE", label: t("questions.r1McqSingle") },
      { value: "R2_MCQ_MULTI", label: t("questions.r2McqMulti") },
      { value: "R3_TFNG", label: t("questions.r3Tfng") },
      { value: "R4_YNNG", label: t("questions.r4Ynng") },
      { value: "R5_SENTENCE_COMPLETION", label: t("questions.r5SentenceCompletion") },
      { value: "R6_SHORT_ANSWER", label: t("questions.r6ShortAnswer") },
      { value: "R7_SUMMARY_WORD_BANK", label: t("questions.r7SummaryWordBank") },
      { value: "R8_SUMMARY_PASSAGE", label: t("questions.r8SummaryPassage") },
      { value: "R9_MATCHING_HEADINGS", label: t("questions.r9MatchingHeadings") },
      { value: "R10_MATCHING_INFORMATION", label: t("questions.r10MatchingInformation") },
      { value: "R11_MATCHING_FEATURES", label: t("questions.r11MatchingFeatures") },
      { value: "R12_MATCHING_SENTENCE_ENDINGS", label: t("questions.r12MatchingSentenceEndings") },
      { value: "R13_NOTE_TABLE_FLOWCHART", label: t("questions.r13NoteTableFlowchart") },
      { value: "R14_DIAGRAM_LABELLING", label: t("questions.r14DiagramLabelling") },
    ],
  },
  {
    skill: t("skill.listening", { ns: "common" }),
    types: [
      { value: "L1_FORM_NOTE_TABLE", label: t("questions.l1FormNoteTable") },
      { value: "L2_MCQ", label: t("questions.l2Mcq") },
      { value: "L3_MATCHING", label: t("questions.l3Matching") },
      { value: "L4_MAP_PLAN_LABELLING", label: t("questions.l4MapPlanLabelling") },
      { value: "L5_SENTENCE_COMPLETION", label: t("questions.l5SentenceCompletion") },
      { value: "L6_SHORT_ANSWER", label: t("questions.l6ShortAnswer") },
    ],
  },
  {
    skill: t("skill.writing", { ns: "common" }),
    types: [
      { value: "W1_TASK1_ACADEMIC", label: t("questions.w1Task1Academic") },
      { value: "W2_TASK1_GENERAL", label: t("questions.w2Task1General") },
      { value: "W3_TASK2_ESSAY", label: t("questions.w3Task2Essay") },
    ],
  },
  {
    skill: t("skill.speaking", { ns: "common" }),
    types: [
      { value: "S1_PART1_QA", label: t("questions.s1Part1Qa") },
      { value: "S2_PART2_CUE_CARD", label: t("questions.s2Part2CueCard") },
      { value: "S3_PART3_DISCUSSION", label: t("questions.s3Part3Discussion") },
    ],
  },
];

const getQuestionTypeLabels = (t: TFunc): Record<string, string> =>
  Object.fromEntries(
    getQuestionTypeGroups(t).flatMap((g) => g.types.map((ty) => [ty.value, ty.label])),
  );

const PAGE_SIZE = 20;

export function ExercisesPage() {
  const { t } = useTranslation("exercises");
  const { user } = useAuth();
  const centerId = user?.centerId || undefined;
  const navigate = useNavigate();

  const SKILL_LABELS = useMemo(() => getSkillLabels(t), [t]);
  const STATUS_VARIANTS = useMemo(() => getStatusVariants(t), [t]);
  const QUESTION_TYPE_GROUPS = useMemo(() => getQuestionTypeGroups(t), [t]);
  const QUESTION_TYPE_LABELS = useMemo(() => getQuestionTypeLabels(t), [t]);

  const [skillFilter, setSkillFilter] = useState<ExerciseSkill | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ExerciseStatus | "ALL">("ALL");
  const [bandLevelFilter, setBandLevelFilter] = useState<BandLevel | "ALL">("ALL");
  const [questionTypeFilter, setQuestionTypeFilter] = useState<string | "ALL">("ALL");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Exercise | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagPopoverOpen, setBulkTagPopoverOpen] = useState(false);
  const [bulkTagSelection, setBulkTagSelection] = useState<string[]>([]);

  const { tags: centerTags } = useTags(centerId);

  const filters = useMemo(() => {
    const f: {
      skill?: ExerciseSkill;
      status?: ExerciseStatus;
      bandLevel?: BandLevel;
      tagIds?: string;
      questionType?: IeltsQuestionType;
      excludeArchived?: boolean;
    } = {};
    if (skillFilter !== "ALL") f.skill = skillFilter;
    if (statusFilter !== "ALL") f.status = statusFilter;
    if (bandLevelFilter !== "ALL") f.bandLevel = bandLevelFilter;
    if (tagFilter.length > 0) f.tagIds = tagFilter.join(",");
    if (questionTypeFilter !== "ALL") f.questionType = questionTypeFilter as IeltsQuestionType;
    if (!showArchived) f.excludeArchived = true;
    return f;
  }, [skillFilter, statusFilter, bandLevelFilter, tagFilter, questionTypeFilter, showArchived]);

  const {
    exercises,
    isLoading,
    deleteExercise,
    isDeleting,
    publishExercise,
    archiveExercise,
    duplicateExercise,
    restoreExercise,
    bulkArchive,
    bulkDuplicate,
    bulkTag,
  } = useExercises(centerId, filters);

  // Assignment counts for library column
  const exerciseIds = useMemo(() => exercises.map((e) => e.id), [exercises]);
  const { data: assignmentCounts } = useAssignmentCounts(exerciseIds);
  const assignmentCountMap = useMemo(
    () => new Map((assignmentCounts ?? []).map((c: { exerciseId: string; count: number }) => [c.exerciseId, c.count])),
    [assignmentCounts],
  );
  const [assignExerciseId, setAssignExerciseId] = useState<string | undefined>(undefined);

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const query = searchQuery.toLowerCase();
    return exercises.filter((ex) => ex.title.toLowerCase().includes(query));
  }, [exercises, searchQuery]);

  const totalPages = Math.ceil(filteredExercises.length / PAGE_SIZE);
  const paginatedExercises = filteredExercises.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const allPageSelected = paginatedExercises.length > 0 &&
    paginatedExercises.every((ex) => selectedIds.has(ex.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [skillFilter, statusFilter, bandLevelFilter, tagFilter, questionTypeFilter, searchQuery, showArchived]);

  const handleCreate = () => {
    navigate("../exercises/new");
  };

  const handleEdit = (exercise: Exercise) => {
    navigate(`../exercises/${exercise.id}/edit`);
  };

  const handleDeleteClick = (exercise: Exercise) => {
    if (exercise.status !== "DRAFT") {
      toast.error(t("toast.onlyDraftDelete"));
      return;
    }
    setDeleteTarget(exercise);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExercise(deleteTarget.id);
      toast.success(t("toast.deleteSuccess"));
    } catch {
      toast.error(t("toast.deleteError"));
    } finally {
      setDeleteTarget(null);
    }
  };

  const handlePublish = async (exercise: Exercise) => {
    try {
      await publishExercise(exercise.id);
      toast.success(t("toast.publishSuccess"));
    } catch {
      toast.error(t("toast.publishError"));
    }
  };

  const handleArchive = async (exercise: Exercise) => {
    try {
      await archiveExercise(exercise.id);
      toast.success(t("toast.archiveSuccess"));
    } catch {
      toast.error(t("toast.archiveError"));
    }
  };

  const handleDuplicate = async (exercise: Exercise) => {
    try {
      await duplicateExercise(exercise.id);
      toast.success(t("toast.duplicateSuccess"));
    } catch {
      toast.error(t("toast.duplicateError"));
    }
  };

  const handleRestore = async (exercise: Exercise) => {
    try {
      await restoreExercise(exercise.id);
      toast.success(t("toast.restoreSuccess"));
    } catch {
      toast.error(t("toast.restoreError"));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedExercises.forEach((ex) => next.delete(ex.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedExercises.forEach((ex) => next.add(ex.id));
        return next;
      });
    }
  };

  const handleBulkArchive = async () => {
    try {
      await bulkArchive([...selectedIds]);
      toast.success(`${selectedIds.size} ${t("toast.bulkArchiveCount")}`);
      setSelectedIds(new Set());
    } catch {
      toast.error(t("toast.bulkArchiveError"));
    }
  };

  const handleBulkDuplicate = async () => {
    try {
      await bulkDuplicate([...selectedIds]);
      toast.success(`${selectedIds.size} ${t("toast.bulkDuplicateCount")}`);
      setSelectedIds(new Set());
    } catch {
      toast.error(t("toast.bulkDuplicateError"));
    }
  };

  const handleBulkTag = async () => {
    if (bulkTagSelection.length === 0) return;
    try {
      await bulkTag({ exerciseIds: [...selectedIds], tagIds: bulkTagSelection });
      toast.success(t("toast.tagsApplied"));
      setSelectedIds(new Set());
      setBulkTagPopoverOpen(false);
      setBulkTagSelection([]);
    } catch {
      toast.error(t("toast.tagsError"));
    }
  };

  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderActionMenu = (exercise: Exercise) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">{t("table.actions", { ns: "common" })}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(exercise)}>
          {t("menu.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDuplicate(exercise)}>
          <Copy className="mr-2 size-4" />
          {t("menu.duplicate")}
        </DropdownMenuItem>
        {exercise.status === "PUBLISHED" && (
          <DropdownMenuItem onClick={() => setAssignExerciseId(exercise.id)}>
            {t("menu.assign")}
          </DropdownMenuItem>
        )}
        {exercise.status === "DRAFT" && (
          <DropdownMenuItem onClick={() => handlePublish(exercise)}>
            {t("menu.publish")}
          </DropdownMenuItem>
        )}
        {exercise.status !== "ARCHIVED" && (
          <DropdownMenuItem onClick={() => handleArchive(exercise)}>
            {t("menu.archive")}
          </DropdownMenuItem>
        )}
        {exercise.status === "ARCHIVED" && (
          <DropdownMenuItem onClick={() => handleRestore(exercise)}>
            <RotateCcw className="mr-2 size-4" />
            {t("menu.restore")}
          </DropdownMenuItem>
        )}
        {exercise.status === "DRAFT" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              disabled={isDeleting}
              onClick={() => handleDeleteClick(exercise)}
            >
              {t("menu.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container space-y-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("page.title")}</h1>
          <p className="text-muted-foreground">
            {t("page.subtitle")}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          {t("page.createButton")}
        </Button>
      </div>

      {/* Filters Row 1 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("list.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={skillFilter}
          onValueChange={(v) => setSkillFilter(v as ExerciseSkill | "ALL")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("skill.allSkills", { ns: "common" })} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("skill.allSkills", { ns: "common" })}</SelectItem>
            <SelectItem value="READING">{t("skill.reading", { ns: "common" })}</SelectItem>
            <SelectItem value="LISTENING">{t("skill.listening", { ns: "common" })}</SelectItem>
            <SelectItem value="WRITING">{t("skill.writing", { ns: "common" })}</SelectItem>
            <SelectItem value="SPEAKING">{t("skill.speaking", { ns: "common" })}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ExerciseStatus | "ALL")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filters.allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allStatuses")}</SelectItem>
            <SelectItem value="DRAFT">{t("filters.draft")}</SelectItem>
            <SelectItem value="PUBLISHED">{t("filters.published")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={bandLevelFilter}
          onValueChange={(v) => setBandLevelFilter(v as BandLevel | "ALL")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder={t("filters.allBands")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allBands")}</SelectItem>
            <SelectItem value="4-5">{t("filters.band45")}</SelectItem>
            <SelectItem value="5-6">{t("filters.band56")}</SelectItem>
            <SelectItem value="6-7">{t("filters.band67")}</SelectItem>
            <SelectItem value="7-8">{t("filters.band78")}</SelectItem>
            <SelectItem value="8-9">{t("filters.band89")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={questionTypeFilter}
          onValueChange={(v) => setQuestionTypeFilter(v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filters.allQuestionTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("filters.allQuestionTypes")}</SelectItem>
            {QUESTION_TYPE_GROUPS.map((group) => (
              <SelectGroup key={group.skill}>
                <SelectLabel>{group.skill}</SelectLabel>
                {group.types.map((ty) => (
                  <SelectItem key={ty.value} value={ty.value}>
                    {ty.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={tagPopoverOpen}
              className="w-[180px] justify-between"
            >
              {tagFilter.length > 0
                ? t("filters.tagsCount", { count: tagFilter.length })
                : t("filters.allTags")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder={t("filters.searchTags")} />
              <CommandList>
                <CommandEmpty>{t("filters.noTags")}</CommandEmpty>
                {centerTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => {
                      setTagFilter((prev) =>
                        prev.includes(tag.id)
                          ? prev.filter((id) => id !== tag.id)
                          : [...prev, tag.id],
                      );
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        tagFilter.includes(tag.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filters Row 2: Show Archived + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <label htmlFor="show-archived" className="text-sm text-muted-foreground cursor-pointer">
            {t("filters.showArchived")}
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label={t("listView.label")}
          >
            <LayoutList className="size-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label={t("gridView.label")}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">{t("bulkActions.countSelected", { count: selectedIds.size })}</span>
          <Button variant="outline" size="sm" onClick={handleBulkArchive}>
            <Archive className="mr-2 size-4" />
            {t("bulkActions.archive")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDuplicate}>
            <Copy className="mr-2 size-4" />
            {t("bulkActions.duplicate")}
          </Button>
          <Popover open={bulkTagPopoverOpen} onOpenChange={setBulkTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="mr-2 size-4" />
                {t("bulkActions.tag")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder={t("filters.searchTags")} />
                <CommandList>
                  <CommandEmpty>{t("filters.noTags")}</CommandEmpty>
                  {centerTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={() => {
                        setBulkTagSelection((prev) =>
                          prev.includes(tag.id)
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id],
                        );
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          bulkTagSelection.includes(tag.id) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {tag.name}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
              {bulkTagSelection.length > 0 && (
                <div className="border-t p-2">
                  <Button size="sm" className="w-full" onClick={handleBulkTag}>
                    {t("bulkActions.applyTags", { count: bulkTagSelection.length })}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="mr-2 size-4" />
            {t("bulkActions.deselectAll")}
          </Button>
        </div>
      )}

      {/* Content: List or Grid View */}
      {viewMode === "list" ? (
        <div className="overflow-x-auto rounded-md border" role="region" aria-label={t("table.ariaLabel")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label={t("table.selectAll", { ns: "common" })}
                  />
                </TableHead>
                <TableHead>{t("table.title")}</TableHead>
                <TableHead>{t("table.skill")}</TableHead>
                <TableHead>{t("table.types")}</TableHead>
                <TableHead>{t("table.band")}</TableHead>
                <TableHead>{t("table.tags")}</TableHead>
                <TableHead>{t("table.sections")}</TableHead>
                <TableHead>{t("table.status", { ns: "common" })}</TableHead>
                <TableHead>{t("table.assignments")}</TableHead>
                <TableHead>{t("table.avgScore")}</TableHead>
                <TableHead>{t("table.lastModified")}</TableHead>
                <TableHead className="text-right">{t("table.actions", { ns: "common" })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExercises.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {exercises.length === 0
                      ? t("table.noExercises")
                      : t("table.noMatches")}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExercises.map((exercise) => (
                  <TableRow
                    key={exercise.id}
                    className={cn(exercise.status === "ARCHIVED" && "opacity-60")}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(exercise.id)}
                        onCheckedChange={() => toggleSelect(exercise.id)}
                        aria-label={t("table.selectAria", { title: exercise.title })}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {exercise.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {SKILL_ICONS[exercise.skill]}
                        <span>{SKILL_LABELS[exercise.skill]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const types = [...new Set(exercise.sections?.map((s) => s.sectionType) ?? [])];
                        if (types.length === 0) return <span className="text-muted-foreground">-</span>;
                        return (
                          <div className="flex flex-wrap gap-1">
                            {types.slice(0, 2).map((typeKey) => (
                              <Badge key={typeKey} variant="outline" className="text-xs">
                                {QUESTION_TYPE_LABELS[typeKey] ?? typeKey}
                              </Badge>
                            ))}
                            {types.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{types.length - 2}
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {exercise.bandLevel ? (
                        <Badge variant="outline">{exercise.bandLevel}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {exercise.tags?.map((tag) => (
                          <Badge key={tag.id} variant="secondary" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{exercise.sections?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_VARIANTS[exercise.status]?.className}
                      >
                        {STATUS_VARIANTS[exercise.status]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{assignmentCountMap.get(exercise.id) ?? 0}</TableCell>
                    {/* TODO: Epic 5 — Replace stub with real avg score from grading data */}
                    <TableCell className="text-muted-foreground">&mdash;</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(exercise.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderActionMenu(exercise)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedExercises.length === 0 ? (
            <div className="col-span-full h-24 flex items-center justify-center text-muted-foreground">
              {exercises.length === 0
                ? t("table.noExercises")
                : t("table.noMatches")}
            </div>
          ) : (
            paginatedExercises.map((exercise) => (
              <Card
                key={exercise.id}
                className={cn(
                  "relative",
                  exercise.status === "ARCHIVED" && "opacity-60",
                )}
              >
                <div className="absolute top-3 left-3 z-10">
                  <Checkbox
                    checked={selectedIds.has(exercise.id)}
                    onCheckedChange={() => toggleSelect(exercise.id)}
                    aria-label={t("table.selectAria", { title: exercise.title })}
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 pl-6">
                      {SKILL_ICONS[exercise.skill]}
                      <span className="text-xs text-muted-foreground">
                        {SKILL_LABELS[exercise.skill]}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_VARIANTS[exercise.status]?.className}
                    >
                      {STATUS_VARIANTS[exercise.status]?.label}
                    </Badge>
                  </div>
                  <h3 className="font-medium leading-tight line-clamp-2 mt-1">
                    {exercise.title}
                  </h3>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-wrap gap-1">
                    {exercise.bandLevel && (
                      <Badge variant="outline" className="text-xs">
                        {exercise.bandLevel}
                      </Badge>
                    )}
                    {exercise.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                    {(exercise.tags?.length ?? 0) > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        {t("grid.moreCount", { count: (exercise.tags?.length ?? 0) - 3 })}
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{formatDate(exercise.updatedAt)}</span>
                    <span>{t("grid.sectionsCount", { count: exercise.sections?.length ?? 0 })}</span>
                    <span>{t("grid.assignmentsCount", { count: assignmentCountMap.get(exercise.id) ?? 0 })}</span>
                    {/* TODO: Epic 5 — Replace stub with real avg score from grading data */}
                    <span>{t("grid.avgScoreDash")}</span>
                  </div>
                  {renderActionMenu(exercise)}
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="mr-1 size-4" />
            {t("pagination.previous", { ns: "common" })}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pagination.page", { ns: "common" })} {currentPage} {t("pagination.of", { ns: "common" })} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            {t("pagination.next", { ns: "common" })}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.confirmation", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("button.cancel", { ns: "common" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Exercise Dialog */}
      <CreateAssignmentDialog
        open={!!assignExerciseId}
        onOpenChange={(open) => { if (!open) setAssignExerciseId(undefined); }}
        defaultExerciseId={assignExerciseId}
      />
    </div>
  );
}
