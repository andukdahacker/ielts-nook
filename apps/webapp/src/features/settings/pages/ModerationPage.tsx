import { useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Shield, AlertTriangle, Check, Scissors, Trash2, RotateCcw } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import {
  useModerationFlags,
  useResolveFlag,
  useModerationTerms,
  useUpdateTerms,
  useResetTerms,
  type ModerationFlag,
} from "../moderation.api";
import { useTranslation } from "react-i18next";

// ── Flag Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation("settings");
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; labelKey: string }> = {
    PENDING: { variant: "destructive", labelKey: "moderation.badgePending" },
    APPROVED: { variant: "default", labelKey: "moderation.badgeApproved" },
    REDACTED: { variant: "secondary", labelKey: "moderation.badgeRedacted" },
    DELETED: { variant: "outline", labelKey: "moderation.badgeDeleted" },
  };
  const config = variants[status] ?? { variant: "outline" as const, labelKey: "" };
  return <Badge variant={config.variant}>{config.labelKey ? t(config.labelKey) : status}</Badge>;
}

function ContentTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation("settings");
  const labels: Record<string, string> = {
    EXERCISE: "moderation.badgeExercise",
    SUBMISSION: "moderation.badgeSubmission",
    AI_FEEDBACK: "moderation.badgeAiFeedback",
  };
  return <Badge variant="outline">{labels[type] ? t(labels[type]) : type}</Badge>;
}

// ── Flag List & Detail ─────────────────────────────────────────────

function FlagListPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (flag: ModerationFlag) => void;
}) {
  const { t } = useTranslation("settings");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");

  const { data, isLoading } = useModerationFlags({
    status: statusFilter === "all" ? undefined : statusFilter,
    contentType: contentTypeFilter === "all" ? undefined : contentTypeFilter,
    limit: 50,
  });

  const flags = data?.data ?? [];

  return (
    <div className="flex flex-col h-full border-r">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-sm">{t("moderation.panelFlags")}</h3>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("moderation.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("moderation.filterAllStatus")}</SelectItem>
              <SelectItem value="PENDING">{t("moderation.filterPending")}</SelectItem>
              <SelectItem value="APPROVED">{t("moderation.filterApproved")}</SelectItem>
              <SelectItem value="REDACTED">{t("moderation.filterRedacted")}</SelectItem>
              <SelectItem value="DELETED">{t("moderation.filterDeleted")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("moderation.filterType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("moderation.filterAllTypes")}</SelectItem>
              <SelectItem value="EXERCISE">{t("moderation.filterExercise")}</SelectItem>
              <SelectItem value="SUBMISSION">{t("moderation.filterSubmission")}</SelectItem>
              <SelectItem value="AI_FEEDBACK">{t("moderation.filterAiFeedback")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">{t("moderation.loading")}</div>
        )}
        {!isLoading && flags.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            {t("moderation.noFlags")}
          </div>
        )}
        {flags.map((flag) => (
          <button
            key={flag.id}
            onClick={() => onSelect(flag)}
            className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
              selectedId === flag.id ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <ContentTypeBadge type={flag.contentType} />
              <StatusBadge status={flag.status} />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {flag.flaggedText.slice(0, 100)}...
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {flag.matchedTerms.slice(0, 2).map((term) => (
                <Badge key={term} variant="destructive" className="text-[10px] px-1">
                  {term}
                </Badge>
              ))}
              {flag.matchedTerms.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{flag.matchedTerms.length - 2}
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {new Date(flag.createdAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function FlagDetailPanel({ flag }: { flag: ModerationFlag | null }) {
  const { t } = useTranslation("settings");
  const resolveFlag = useResolveFlag();
  const [redactedText, setRedactedText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!flag) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        {t("moderation.noFlagSelected")}
      </div>
    );
  }

  const isPending = flag.status === "PENDING";

  const handleApprove = () => {
    resolveFlag.mutate({ id: flag.id, action: "APPROVED" });
  };

  const handleRedact = () => {
    if (!redactedText.trim()) return;
    resolveFlag.mutate({ id: flag.id, action: "REDACTED", redactedText });
  };

  const handleDelete = () => {
    resolveFlag.mutate({ id: flag.id, action: "DELETED" });
    setDeleteDialogOpen(false);
  };

  // Highlight matched terms in the flagged text
  const highlightText = (text: string, terms: string[]) => {
    if (terms.length === 0) return text;
    const pattern = terms
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    const splitRegex = new RegExp(`(${pattern})`, "gi");
    const parts = text.split(splitRegex);
    // Use a separate regex without `g` flag for testing each part to avoid stateful lastIndex
    const testRegex = new RegExp(`^(?:${pattern})$`, "i");
    return parts.map((part, i) =>
      testRegex.test(part) ? (
        <mark key={i} className="bg-destructive/20 text-destructive font-medium px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={flag.contentType} />
          <StatusBadge status={flag.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {new Date(flag.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{t("moderation.matchedTerms")}</h4>
        <div className="flex flex-wrap gap-1">
          {flag.matchedTerms.map((term) => (
            <Badge key={term} variant="destructive">
              {term}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{t("moderation.flaggedContent")}</h4>
        <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap max-h-60 overflow-auto bg-muted/30">
          {highlightText(flag.flaggedText, flag.matchedTerms)}
        </div>
      </div>

      {flag.redactedText && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t("moderation.redactedVersion")}</h4>
          <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
            {flag.redactedText}
          </div>
        </div>
      )}

      {isPending && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold">{t("moderation.actions")}</h4>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleApprove}
              disabled={resolveFlag.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              {t("moderation.approve")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={resolveFlag.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t("moderation.badgeDeleted")}
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="redact-textarea" className="text-sm font-medium">
              <Scissors className="h-4 w-4 inline mr-1" />
              {t("moderation.redactLabel")}
            </label>
            <Textarea
              id="redact-textarea"
              value={redactedText}
              onChange={(e) => setRedactedText(e.target.value)}
              placeholder={t("moderation.redactPlaceholder")}
              rows={3}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRedact}
              disabled={resolveFlag.isPending || !redactedText.trim()}
            >
              {t("moderation.applyRedaction")}
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("moderation.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("moderation.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:button.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t("moderation.badgeDeleted")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Term List Manager ──────────────────────────────────────────────

function ModerationTermsSettings() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data: termList, isLoading } = useModerationTerms();
  const updateTerms = useUpdateTerms();
  const resetTerms = useResetTerms();
  const [editValue, setEditValue] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  if (isLoading) return <div className="text-sm text-muted-foreground">{t("moderation.loading")}</div>;

  const terms = termList?.terms ?? [];
  const isEditing = editValue !== null;

  const handleStartEdit = () => {
    setEditValue(terms.join("\n"));
  };

  const handleSave = () => {
    if (editValue === null) return;
    const newTerms = editValue
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    updateTerms.mutate(newTerms, {
      onSuccess: () => setEditValue(null),
    });
  };

  const handleReset = () => {
    resetTerms.mutate(undefined, {
      onSuccess: () => {
        setEditValue(null);
        setResetDialogOpen(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("moderation.termsTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("moderation.termsConfigured", { count: terms.length })}
            {termList?.isCustom ? ` ${t("moderation.termsCustomized")}` : ` ${t("moderation.termsDefaults")}`}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditValue(null)}
                >
                  {t("common:button.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateTerms.isPending}
                >
                  {t("common:button.save")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  {t("moderation.editTerms")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {t("moderation.resetDefaults")}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue ?? ""}
            onChange={(e) => setEditValue(e.target.value)}
            rows={15}
            placeholder={t("moderation.termsPlaceholder")}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t("moderation.termsHelp")}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border p-4 max-h-80 overflow-auto">
          <div className="flex flex-wrap gap-1">
            {terms.map((term, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {term}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("moderation.resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("moderation.resetDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:button.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              {t("moderation.resetConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function ModerationPage() {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === "OWNER" || user?.role === "ADMIN";
  const [selectedFlag, setSelectedFlag] = useState<ModerationFlag | null>(null);

  if (!isAdminOrOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">{t("moderation.heading")}</h2>
          <p className="text-muted-foreground">
            {t("moderation.description")}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">{t("moderation.errorTitle")}</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            {t("moderation.errorMessage")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {t("moderation.heading")}
        </h2>
        <p className="text-muted-foreground">
          {t("moderation.descriptionFull")}
        </p>
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">{t("moderation.tabFlaggedContent")}</TabsTrigger>
          <TabsTrigger value="terms">{t("moderation.tabProhibitedTerms")}</TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="mt-4">
          <div className="border rounded-lg grid grid-cols-1 md:grid-cols-[300px_1fr] h-[500px]">
            <FlagListPanel
              selectedId={selectedFlag?.id ?? null}
              onSelect={setSelectedFlag}
            />
            <FlagDetailPanel flag={selectedFlag} />
          </div>
        </TabsContent>

        <TabsContent value="terms" className="mt-4">
          <ModerationTermsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
