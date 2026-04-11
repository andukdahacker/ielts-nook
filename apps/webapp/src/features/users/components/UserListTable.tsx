import { formatDistanceToNow } from "date-fns";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import type { UserListItem } from "@workspace/types";
import { UserActionsDropdown } from "./UserActionsDropdown";
import { cn } from "@workspace/ui/lib/utils";

interface UserListTableProps {
  users: UserListItem[];
  isLoading: boolean;
  selectedUserIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

const roleBadgeVariants: Record<string, string> = {
  OWNER: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ADMIN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  TEACHER: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  STUDENT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function UserListTable({
  users,
  isLoading,
  selectedUserIds,
  onSelectionChange,
  onPageChange,
  currentPage,
  totalPages,
  hasMore,
}: UserListTableProps) {
  const { t } = useTranslation("users");
  const allSelected = users.length > 0 && users.every((u) => selectedUserIds.includes(u.id));
  const someSelected = users.some((u) => selectedUserIds.includes(u.id)) && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all non-owner users
      const newSelected = users
        .filter((u) => u.role !== "OWNER")
        .map((u) => u.id);
      onSelectionChange([...new Set([...selectedUserIds, ...newSelected])]);
    } else {
      const userIds = users.map((u) => u.id);
      onSelectionChange(selectedUserIds.filter((id) => !userIds.includes(id)));
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedUserIds, userId]);
    } else {
      onSelectionChange(selectedUserIds.filter((id) => id !== userId));
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || "U";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("userListTable.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label={t("table.selectAll", { ns: "common" })}
                />
              </TableHead>
              <TableHead>{t("userListTable.headerUser")}</TableHead>
              <TableHead>{t("userListTable.headerEmail")}</TableHead>
              <TableHead>{t("userListTable.headerRole")}</TableHead>
              <TableHead>{t("userListTable.headerStatus")}</TableHead>
              <TableHead>{t("userListTable.headerLastActive")}</TableHead>
              <TableHead className="w-12">{t("table.actions", { ns: "common" })}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className={cn(
                  user.status === "SUSPENDED" && "opacity-50 bg-muted/50"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={(checked) =>
                      handleSelectUser(user.id, checked as boolean)
                    }
                    disabled={user.role === "OWNER"}
                    aria-label={t("userListTable.selectUser", { user: user.name || user.email })}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatarUrl ?? undefined}
                        alt={user.name ?? "User"}
                      />
                      <AvatarFallback>
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "font-medium",
                        user.status === "SUSPENDED" && "line-through"
                      )}
                    >
                      {user.name || t("userListTable.noName")}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={cn(user.status === "SUSPENDED" && "line-through")}>
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge className={roleBadgeVariants[user.role]} variant="outline">
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        user.status === "ACTIVE" && "bg-green-500",
                        user.status === "SUSPENDED" && "bg-gray-400",
                        user.status === "INVITED" && "bg-yellow-500"
                      )}
                    />
                    <span className="text-sm capitalize">
                      {user.status.toLowerCase()}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.lastActiveAt
                    ? formatDistanceToNow(new Date(user.lastActiveAt), {
                        addSuffix: true,
                      })
                    : t("userListTable.neverActive")}
                </TableCell>
                <TableCell>
                  <UserActionsDropdown user={user} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("userListTable.pagination", { current: currentPage, total: totalPages })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
