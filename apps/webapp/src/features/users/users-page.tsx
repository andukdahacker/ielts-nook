import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import type { UserListQuery } from "@workspace/types";
import { InviteUserModal } from "./components/InviteUserModal";
import { CsvImportModal } from "./components/CsvImportModal";
import { UserListTable } from "./components/UserListTable";
import { PendingInvitationsTable } from "./components/PendingInvitationsTable";
import { SearchFilterControls } from "./components/SearchFilterControls";
import { BulkActionBar } from "./components/BulkActionBar";
import { ImportHistorySection } from "./components/ImportHistorySection";
import { useUsers } from "./users.api";
import { useAuth } from "@/features/auth/auth-context";

const DEFAULT_LIMIT = 20;

export function UsersPage() {
  const { t } = useTranslation("users");
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>("users");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const { user } = useAuth();

  // Check if user can import (Owner or Admin only)
  const canImport = user?.role === "OWNER" || user?.role === "ADMIN";

  // Parse filters from URL - memoized to prevent unnecessary re-renders
  const filters: UserListQuery = useMemo(() => ({
    page: parseInt(searchParams.get("page") || "1", 10),
    limit: parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10),
    search: searchParams.get("search") || undefined,
    role: (searchParams.get("role") as UserListQuery["role"]) || undefined,
    status: (searchParams.get("status") as UserListQuery["status"]) || undefined,
  }), [searchParams]);

  const { data, isLoading } = useUsers(filters);

  // Update URL when filters change
  const handleFiltersChange = useCallback(
    (newFilters: Partial<UserListQuery>) => {
      const updated = { ...filters, ...newFilters };
      const params = new URLSearchParams();

      if (updated.page && updated.page > 1) params.set("page", String(updated.page));
      if (updated.limit && updated.limit !== DEFAULT_LIMIT) params.set("limit", String(updated.limit));
      if (updated.search) params.set("search", updated.search);
      if (updated.role) params.set("role", updated.role);
      if (updated.status) params.set("status", updated.status);

      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams]
  );

  const handlePageChange = (page: number) => {
    handleFiltersChange({ page });
  };

  const totalPages = data ? Math.ceil(data.total / filters.limit) : 1;

  return (
    <div className="container max-w-7xl py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl">{t("page.title")}</CardTitle>
            <CardDescription>
              {t("page.description")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {canImport && <CsvImportModal />}
            <InviteUserModal onSuccess={() => setActiveTab("invitations")} />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="users">{t("tab.activeUsers")}</TabsTrigger>
              <TabsTrigger value="invitations">{t("tab.pendingInvitations")}</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="mt-4">
              <SearchFilterControls
                filters={filters}
                onFiltersChange={handleFiltersChange}
              />
              <BulkActionBar
                selectedCount={selectedUserIds.length}
                selectedUserIds={selectedUserIds}
                onClear={() => setSelectedUserIds([])}
              />
              <UserListTable
                users={data?.items ?? []}
                isLoading={isLoading}
                selectedUserIds={selectedUserIds}
                onSelectionChange={setSelectedUserIds}
                onPageChange={handlePageChange}
                currentPage={filters.page}
                totalPages={totalPages}
                hasMore={data?.hasMore ?? false}
              />
            </TabsContent>
            <TabsContent value="invitations" className="mt-4">
              <PendingInvitationsTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Import History Section - Owner/Admin only */}
      {canImport && (
        <Card className="mt-6">
          <ImportHistorySection />
        </Card>
      )}
    </div>
  );
}
