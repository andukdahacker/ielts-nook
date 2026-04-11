import { useAuth } from "@/features/auth/auth-context";
import type { MockTest } from "@workspace/types";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useMockTests } from "./hooks/use-mock-tests";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  ARCHIVED: "outline",
};

export function MockTestsPage() {
  const { t } = useTranslation("mock-tests");
  const { user } = useAuth();
  const navigate = useNavigate();

  const TEST_TYPE_LABELS: Record<string, string> = {
    ACADEMIC: t("page.testTypeAcademic"),
    GENERAL_TRAINING: t("page.testTypeGeneralTraining"),
  };
  const centerId = user?.centerId || undefined;

  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [testTypeFilter, setTestTypeFilter] = useState<string | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MockTest | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newTestType, setNewTestType] = useState("ACADEMIC");
  const [newDescription, setNewDescription] = useState("");

  const {
    mockTests,
    isLoading,
    createMockTest,
    isCreating,
    deleteMockTest,
    publishMockTest,
    archiveMockTest,
  } = useMockTests(centerId, {
    status: statusFilter,
    testType: testTypeFilter,
  });

  const handleCreate = async () => {
    try {
      const created = await createMockTest({
        title: newTitle,
        testType: newTestType as "ACADEMIC" | "GENERAL_TRAINING",
        description: newDescription || undefined,
      });
      setShowCreateDialog(false);
      setNewTitle("");
      setNewTestType("ACADEMIC");
      setNewDescription("");
      toast.success(t("page.toastCreated"));
      navigate(`../mock-tests/${created.id}/edit`);
    } catch {
      toast.error(t("page.toastCreateError"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMockTest(deleteTarget.id);
      setDeleteTarget(null);
      toast.success(t("page.toastDeleted"));
    } catch {
      toast.error(t("page.toastDeleteError"));
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishMockTest(id);
      toast.success(t("page.toastPublished"));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("editor.toastPublishError");
      toast.error(msg);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archiveMockTest(id);
      toast.success(t("page.toastArchived"));
    } catch {
      toast.error(t("page.toastArchiveError"));
    }
  };

  const getSectionSummary = (mockTest: MockTest) => {
    if (!mockTest.sections) return "";
    return mockTest.sections
      .map((s) => {
        const count = s.exercises?.length ?? 0;
        return `${s.skill.charAt(0)}:${count}`;
      })
      .join(" ");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("page.title")}</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("page.createButton")}
        </Button>
      </div>

      <div className="flex gap-3">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("page.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("page.statusAll")}</SelectItem>
            <SelectItem value="DRAFT">{t("page.statusDraft")}</SelectItem>
            <SelectItem value="PUBLISHED">
              {t("page.statusPublished")}
            </SelectItem>
            <SelectItem value="ARCHIVED">{t("page.statusArchived")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={testTypeFilter ?? "all"}
          onValueChange={(v) => setTestTypeFilter(v === "all" ? undefined : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("page.testTypeFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("page.testTypeAll")}</SelectItem>
            <SelectItem value="ACADEMIC">
              {t("page.testTypeAcademic")}
            </SelectItem>
            <SelectItem value="GENERAL_TRAINING">
              {t("page.testTypeGeneralTraining")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : mockTests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t("page.noTests")}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("page.tableTitle")}</TableHead>
              <TableHead>{t("page.tableTestType")}</TableHead>
              <TableHead>{t("page.tableStatus")}</TableHead>
              <TableHead>{t("page.tableSections")}</TableHead>
              <TableHead>{t("page.tableCreatedBy")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTests.map((mt) => (
              <TableRow
                key={mt.id}
                className="cursor-pointer"
                onClick={() => navigate(`../mock-tests/${mt.id}/edit`)}
              >
                <TableCell className="font-medium">{mt.title}</TableCell>
                <TableCell>
                  {TEST_TYPE_LABELS[mt.testType] ?? mt.testType}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[mt.status] ?? "secondary"}>
                    {mt.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {getSectionSummary(mt)}
                </TableCell>
                <TableCell>{mt.createdBy?.name ?? "—"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onClick={() => navigate(`../mock-tests/${mt.id}/edit`)}
                      >
                        {t("page.menuEdit")}
                      </DropdownMenuItem>
                      {mt.status === "DRAFT" && (
                        <DropdownMenuItem
                          onClick={() => handlePublish(mt.id)}
                        >
                          {t("page.menuPublish")}
                        </DropdownMenuItem>
                      )}
                      {mt.status !== "ARCHIVED" && (
                        <DropdownMenuItem
                          onClick={() => handleArchive(mt.id)}
                        >
                          {t("page.menuArchive")}
                        </DropdownMenuItem>
                      )}
                      {mt.status === "DRAFT" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(mt)}
                          >
                            {t("page.menuDelete")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("page.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("page.titleLabel")}</Label>
              <Input
                id="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("page.titlePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("page.testTypeLabel")}</Label>
              <Select value={newTestType} onValueChange={setNewTestType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACADEMIC">
                    {t("page.testTypeAcademic")}
                  </SelectItem>
                  <SelectItem value="GENERAL_TRAINING">
                    {t("page.testTypeGeneralTraining")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                {t("page.descriptionLabel")}
              </Label>
              <Textarea
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t("page.descriptionPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              {t("editor.cancelButton")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || isCreating}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("page.createSubmitButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("page.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("page.deleteDesc", { title: deleteTarget?.title ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("editor.cancelButton")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("page.menuDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
