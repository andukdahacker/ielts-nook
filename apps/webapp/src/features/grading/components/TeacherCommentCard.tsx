import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
import {
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import type { CommentVisibility, TeacherComment } from "@workspace/types";
import type { AnchorStatus } from "../hooks/use-anchor-validation";
import { AnchorStatusIndicator } from "./AnchorStatusIndicator";

interface TeacherCommentCardProps {
  comment: TeacherComment;
  isAuthor: boolean;
  isHighlighted?: boolean;
  onHighlight?: (id: string | null, debounce?: boolean) => void;
  onScrollTo?: (id: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onVisibilityChange: (commentId: string, visibility: CommentVisibility) => void;
  anchorStatus?: AnchorStatus;
}

function TeacherCommentCardInner({
  comment,
  isAuthor,
  isHighlighted = false,
  onHighlight,
  onScrollTo,
  onEdit,
  onDelete,
  onVisibilityChange,
  anchorStatus = "no-anchor",
}: TeacherCommentCardProps) {
  const { t } = useTranslation("grading");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const suppressMouseRef = useRef(false);

  const hasAnchor = anchorStatus === "valid" || anchorStatus === "drifted";
  const isOrphaned = anchorStatus === "orphaned";
  const isPrivate = comment.visibility === "private";

  const handleMouseEnter = useCallback(() => {
    if (suppressMouseRef.current) return;
    if (hasAnchor && onHighlight) onHighlight(comment.id, true);
  }, [hasAnchor, onHighlight, comment.id]);

  const handleMouseLeave = useCallback(() => {
    if (suppressMouseRef.current) return;
    if (hasAnchor && onHighlight) onHighlight(null, true);
  }, [hasAnchor, onHighlight]);

  const handleFocus = useCallback(() => {
    if (hasAnchor && onHighlight) onHighlight(comment.id, false);
  }, [hasAnchor, onHighlight, comment.id]);

  const handleBlur = useCallback(() => {
    if (hasAnchor && onHighlight) onHighlight(null, false);
  }, [hasAnchor, onHighlight]);

  const handleClick = useCallback(() => {
    if (suppressMouseRef.current) return;
    if (hasAnchor && onScrollTo) onScrollTo(comment.id);
  }, [hasAnchor, onScrollTo, comment.id]);

  const handleTouchStart = useCallback(
    () => {
      if (!hasAnchor) return;
      if (onScrollTo) {
        onScrollTo(comment.id);
      }
      suppressMouseRef.current = true;
      setTimeout(() => { suppressMouseRef.current = false; }, 400);
    },
    [hasAnchor, onScrollTo, comment.id],
  );

  const handleEditSave = useCallback(() => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent.trim());
    }
    setIsEditing(false);
  }, [editContent, comment.content, comment.id, onEdit]);

  const handleEditCancel = useCallback(() => {
    setEditContent(comment.content);
    setIsEditing(false);
  }, [comment.content]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleEditSave();
      } else if (e.key === "Escape") {
        handleEditCancel();
      }
    },
    [handleEditSave, handleEditCancel],
  );

  const toggleVisibility = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newVisibility: CommentVisibility =
      comment.visibility === "private" ? "student_facing" : "private";
    onVisibilityChange(comment.id, newVisibility);
  }, [comment.id, comment.visibility, onVisibilityChange]);

  const highlightRing = isHighlighted ? "ring-2 ring-emerald-500" : "";
  const orphanedOpacity = isOrphaned ? "opacity-75" : "";
  const privateStyle = isPrivate ? "bg-muted/50 border-dashed" : "";
  const editingStyle = isEditing ? "ring-2 ring-primary" : "";

  const timestamp = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  });

  return (
    <Card
      className={`border-l-4 border-l-emerald-500 transition-shadow duration-150 ${highlightRing} ${orphanedOpacity} ${privateStyle} ${editingStyle} ${hasAnchor ? "cursor-pointer" : ""}`}
      data-card-id={comment.id}
      tabIndex={0}
      title={hasAnchor ? t("teacherComment.clickToScroll") : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={handleTouchStart}
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <Badge variant="secondary" className="gap-1">
                  <User className="h-3 w-3" />
                  {t("teacherComment.teacher")}
                </Badge>
                <AnchorStatusIndicator anchorStatus={anchorStatus} variant="dot" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={toggleVisibility}
                title={
                  isPrivate
                    ? t("teacherComment.privateTooltip")
                    : t("teacherComment.visibleTooltip")
                }
                aria-label={
                  isPrivate ? t("teacherComment.privateAriaLabel") : t("teacherComment.visibleAriaLabel")
                }
              >
                {isPrivate ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Eye className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>
              <span className="text-xs text-muted-foreground truncate">
                {comment.authorName}
              </span>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>
            {isAuthor && !isEditing && (
              <div role="presentation" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditContent(comment.content);
                        setIsEditing(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("teacherComment.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("teacherComment.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {isPrivate && (
            <span className="text-xs text-muted-foreground">{t("teacherComment.private")}</span>
          )}

          {/* Quoted context snippet */}
          {comment.originalContextSnippet && (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-2 text-xs italic text-muted-foreground">
              {comment.originalContextSnippet}
            </blockquote>
          )}

          {/* Content / Edit mode */}
          {isEditing ? (
            <div className="space-y-2" role="presentation" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                maxLength={5000}
                rows={3}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <div className="flex gap-2" role="presentation" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <Button size="sm" onClick={handleEditSave}>
                  {t("teacherComment.save")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
          )}

          {/* Anchor status */}
          <AnchorStatusIndicator anchorStatus={anchorStatus} variant="label" />
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherComment.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherComment.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(comment.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export const TeacherCommentCard = React.memo(TeacherCommentCardInner);
