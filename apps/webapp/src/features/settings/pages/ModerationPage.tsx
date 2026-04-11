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

// ── Flag Status Badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    PENDING: { variant: "destructive", label: "Pending" },
    APPROVED: { variant: "default", label: "Approved" },
    REDACTED: { variant: "secondary", label: "Redacted" },
    DELETED: { variant: "outline", label: "Deleted" },
  };
  const config = variants[status] ?? { variant: "outline" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ContentTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    EXERCISE: "Exercise",
    SUBMISSION: "Submission",
    AI_FEEDBACK: "AI Feedback",
  };
  return <Badge variant="outline">{labels[type] ?? type}</Badge>;
}

// ── Flag List & Detail ─────────────────────────────────────────────

function FlagListPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (flag: ModerationFlag) => void;
}) {
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
        <h3 className="font-semibold text-sm">Moderation Flags</h3>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REDACTED">Redacted</SelectItem>
              <SelectItem value="DELETED">Deleted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={contentTypeFilter} onValueChange={setContentTypeFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="EXERCISE">Exercise</SelectItem>
              <SelectItem value="SUBMISSION">Submission</SelectItem>
              <SelectItem value="AI_FEEDBACK">AI Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        )}
        {!isLoading && flags.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No flags found
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
  const resolveFlag = useResolveFlag();
  const [redactedText, setRedactedText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!flag) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a flag to view details
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
          Flagged: {new Date(flag.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Matched Terms</h4>
        <div className="flex flex-wrap gap-1">
          {flag.matchedTerms.map((term) => (
            <Badge key={term} variant="destructive">
              {term}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Flagged Content</h4>
        <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap max-h-60 overflow-auto bg-muted/30">
          {highlightText(flag.flaggedText, flag.matchedTerms)}
        </div>
      </div>

      {flag.redactedText && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Redacted Version</h4>
          <div className="rounded-lg border p-4 text-sm whitespace-pre-wrap max-h-40 overflow-auto">
            {flag.redactedText}
          </div>
        </div>
      )}

      {isPending && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="text-sm font-semibold">Actions</h4>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleApprove}
              disabled={resolveFlag.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={resolveFlag.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              <Scissors className="h-4 w-4 inline mr-1" />
              Redact — provide replacement text:
            </label>
            <Textarea
              value={redactedText}
              onChange={(e) => setRedactedText(e.target.value)}
              placeholder="Enter the redacted version of the content..."
              rows={3}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRedact}
              disabled={resolveFlag.isPending || !redactedText.trim()}
            >
              Apply Redaction
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flagged content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the flagged content. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Term List Manager ──────────────────────────────────────────────

function ModerationTermsSettings() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const { data: termList, isLoading } = useModerationTerms();
  const updateTerms = useUpdateTerms();
  const resetTerms = useResetTerms();
  const [editValue, setEditValue] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  if (isLoading) return <div className="text-sm text-muted-foreground">Loading term list...</div>;

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
          <h3 className="text-sm font-semibold">Prohibited Terms</h3>
          <p className="text-xs text-muted-foreground">
            {terms.length} terms configured
            {termList?.isCustom ? " (customized)" : " (defaults)"}
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
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateTerms.isPending}
                >
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  Edit Terms
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setResetDialogOpen(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Defaults
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
            placeholder="One term per line..."
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Enter one prohibited term per line. Maximum 500 terms, 100
            characters each.
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
            <AlertDialogTitle>Reset to default terms?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your custom term list with the default
              Vietnamese compliance terms. Custom terms will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export function ModerationPage() {
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === "OWNER" || user?.role === "ADMIN";
  const [selectedFlag, setSelectedFlag] = useState<ModerationFlag | null>(null);

  if (!isAdminOrOwner) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Compliance</h2>
          <p className="text-muted-foreground">
            Content moderation and compliance settings.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">Access Restricted</h3>
          <p className="text-muted-foreground max-w-sm mt-2">
            Only Admins and Owners can access compliance settings.
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
          Compliance
        </h2>
        <p className="text-muted-foreground">
          Content moderation and compliance review workspace.
        </p>
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">Flagged Content</TabsTrigger>
          <TabsTrigger value="terms">Prohibited Terms</TabsTrigger>
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
