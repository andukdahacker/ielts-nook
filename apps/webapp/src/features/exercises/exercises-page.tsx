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

const SKILL_LABELS: Record<ExerciseSkill, string> = {
  READING: "Reading",
  LISTENING: "Listening",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

const STATUS_VARIANTS: Record<
  ExerciseStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PUBLISHED: {
    label: "Published",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-muted/50 text-muted-foreground/70",
  },
};

const QUESTION_TYPE_GROUPS: { skill: string; types: { value: string; label: string }[] }[] = [
  {
    skill: "Reading",
    types: [
      { value: "R1_MCQ_SINGLE", label: "MCQ Single Answer" },
      { value: "R2_MCQ_MULTI", label: "MCQ Multiple Answers" },
      { value: "R3_TFNG", label: "True/False/Not Given" },
      { value: "R4_YNNG", label: "Yes/No/Not Given" },
      { value: "R5_SENTENCE_COMPLETION", label: "Sentence Completion" },
      { value: "R6_SHORT_ANSWER", label: "Short Answer" },
      { value: "R7_SUMMARY_WORD_BANK", label: "Summary (Word Bank)" },
      { value: "R8_SUMMARY_PASSAGE", label: "Summary (Passage)" },
      { value: "R9_MATCHING_HEADINGS", label: "Matching Headings" },
      { value: "R10_MATCHING_INFORMATION", label: "Matching Information" },
      { value: "R11_MATCHING_FEATURES", label: "Matching Features" },
      { value: "R12_MATCHING_SENTENCE_ENDINGS", label: "Matching Endings" },
      { value: "R13_NOTE_TABLE_FLOWCHART", label: "Note/Table/Flowchart" },
      { value: "R14_DIAGRAM_LABELLING", label: "Diagram Labelling" },
    ],
  },
  {
    skill: "Listening",
    types: [
      { value: "L1_FORM_NOTE_TABLE", label: "Form/Note/Table" },
      { value: "L2_MCQ", label: "Multiple Choice" },
      { value: "L3_MATCHING", label: "Matching" },
      { value: "L4_MAP_PLAN_LABELLING", label: "Map/Plan Labelling" },
      { value: "L5_SENTENCE_COMPLETION", label: "Sentence Completion" },
      { value: "L6_SHORT_ANSWER", label: "Short Answer" },
    ],
  },
  {
    skill: "Writing",
    types: [
      { value: "W1_TASK1_ACADEMIC", label: "Task 1 Academic" },
      { value: "W2_TASK1_GENERAL", label: "Task 1 General" },
      { value: "W3_TASK2_ESSAY", label: "Task 2 Essay" },
    ],
  },
  {
    skill: "Speaking",
    types: [
      { value: "S1_PART1_QA", label: "Part 1 Questions" },
      { value: "S2_PART2_CUE_CARD", label: "Part 2 Cue Card" },
      { value: "S3_PART3_DISCUSSION", label: "Part 3 Discussion" },
    ],
  },
];

const QUESTION_TYPE_LABELS = Object.fromEntries(
  QUESTION_TYPE_GROUPS.flatMap((g) => g.types.map((t) => [t.value, t.label])),
);

const PAGE_SIZE = 20;

export function ExercisesPage() {
  const { user } = useAuth();
  const centerId = user?.centerId || undefined;
  const navigate = useNavigate();

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
      toast.error("Only draft exercises can be deleted");
      return;
    }
    setDeleteTarget(exercise);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExercise(deleteTarget.id);
      toast.success("Exercise deleted successfully");
    } catch {
      toast.error("Failed to delete exercise");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handlePublish = async (exercise: Exercise) => {
    try {
      await publishExercise(exercise.id);
      toast.success("Exercise published successfully");
    } catch {
      toast.error("Failed to publish exercise");
    }
  };

  const handleArchive = async (exercise: Exercise) => {
    try {
      await archiveExercise(exercise.id);
      toast.success("Exercise archived successfully");
    } catch {
      toast.error("Failed to archive exercise");
    }
  };

  const handleDuplicate = async (exercise: Exercise) => {
    try {
      await duplicateExercise(exercise.id);
      toast.success("Exercise duplicated");
    } catch {
      toast.error("Failed to duplicate exercise");
    }
  };

  const handleRestore = async (exercise: Exercise) => {
    try {
      await restoreExercise(exercise.id);
      toast.success("Exercise restored to draft");
    } catch {
      toast.error("Failed to restore exercise");
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
      toast.success(`${selectedIds.size} exercises archived`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to archive exercises");
    }
  };

  const handleBulkDuplicate = async () => {
    try {
      await bulkDuplicate([...selectedIds]);
      toast.success(`${selectedIds.size} exercises duplicated`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Failed to duplicate exercises");
    }
  };

  const handleBulkTag = async () => {
    if (bulkTagSelection.length === 0) return;
    try {
      await bulkTag({ exerciseIds: [...selectedIds], tagIds: bulkTagSelection });
      toast.success("Tags applied to selected exercises");
      setSelectedIds(new Set());
      setBulkTagPopoverOpen(false);
      setBulkTagSelection([]);
    } catch {
      toast.error("Failed to tag exercises");
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
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(exercise)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDuplicate(exercise)}>
          <Copy className="mr-2 size-4" />
          Duplicate
        </DropdownMenuItem>
        {exercise.status === "PUBLISHED" && (
          <DropdownMenuItem onClick={() => setAssignExerciseId(exercise.id)}>
            Assign
          </DropdownMenuItem>
        )}
        {exercise.status === "DRAFT" && (
          <DropdownMenuItem onClick={() => handlePublish(exercise)}>
            Publish
          </DropdownMenuItem>
        )}
        {exercise.status !== "ARCHIVED" && (
          <DropdownMenuItem onClick={() => handleArchive(exercise)}>
            Archive
          </DropdownMenuItem>
        )}
        {exercise.status === "ARCHIVED" && (
          <DropdownMenuItem onClick={() => handleRestore(exercise)}>
            <RotateCcw className="mr-2 size-4" />
            Restore
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
              Delete
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
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
          <p className="text-muted-foreground">
            Create and manage IELTS exercises for your students.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Create Exercise
        </Button>
      </div>

      {/* Filters Row 1 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
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
            <SelectValue placeholder="All Skills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Skills</SelectItem>
            <SelectItem value="READING">Reading</SelectItem>
            <SelectItem value="LISTENING">Listening</SelectItem>
            <SelectItem value="WRITING">Writing</SelectItem>
            <SelectItem value="SPEAKING">Speaking</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ExerciseStatus | "ALL")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={bandLevelFilter}
          onValueChange={(v) => setBandLevelFilter(v as BandLevel | "ALL")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Bands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Bands</SelectItem>
            <SelectItem value="4-5">Band 4-5</SelectItem>
            <SelectItem value="5-6">Band 5-6</SelectItem>
            <SelectItem value="6-7">Band 6-7</SelectItem>
            <SelectItem value="7-8">Band 7-8</SelectItem>
            <SelectItem value="8-9">Band 8-9</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={questionTypeFilter}
          onValueChange={(v) => setQuestionTypeFilter(v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Question Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Question Types</SelectItem>
            {QUESTION_TYPE_GROUPS.map((group) => (
              <SelectGroup key={group.skill}>
                <SelectLabel>{group.skill}</SelectLabel>
                {group.types.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
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
                ? `${tagFilter.length} tag${tagFilter.length > 1 ? "s" : ""}`
                : "All Tags"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
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
            Show Archived
          </label>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
            aria-label="List view"
          >
            <LayoutList className="size-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={handleBulkArchive}>
            <Archive className="mr-2 size-4" />
            Archive
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkDuplicate}>
            <Copy className="mr-2 size-4" />
            Duplicate
          </Button>
          <Popover open={bulkTagPopoverOpen} onOpenChange={setBulkTagPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Tag className="mr-2 size-4" />
                Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
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
                    Apply {bulkTagSelection.length} tag{bulkTagSelection.length > 1 ? "s" : ""}
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            <X className="mr-2 size-4" />
            Deselect All
          </Button>
        </div>
      )}

      {/* Content: List or Grid View */}
      {viewMode === "list" ? (
        <div className="overflow-x-auto rounded-md border" tabIndex={0} role="region" aria-label="Exercise list table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead>Types</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Avg Score</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                      ? "No exercises found. Create one to get started."
                      : "No exercises match your search."}
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
                        aria-label={`Select ${exercise.title}`}
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
                            {types.slice(0, 2).map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">
                                {QUESTION_TYPE_LABELS[t] ?? t}
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
                ? "No exercises found. Create one to get started."
                : "No exercises match your search."}
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
                    aria-label={`Select ${exercise.title}`}
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
                        +{(exercise.tags?.length ?? 0) - 3} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>{formatDate(exercise.updatedAt)}</span>
                    <span>{exercise.sections?.length ?? 0} sections</span>
                    <span>Assignments: {assignmentCountMap.get(exercise.id) ?? 0}</span>
                    {/* TODO: Epic 5 — Replace stub with real avg score from grading data */}
                    <span>Avg Score: &mdash;</span>
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
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next
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
            <AlertDialogTitle>Delete Exercise</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.title}
              &rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
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
