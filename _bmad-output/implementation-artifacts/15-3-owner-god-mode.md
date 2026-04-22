# Story 15.3: Owner = God Mode

Status: review

## Story

As a Center Owner,
I want access to everything in the platform with a well-organized navigation,
so that I can oversee all operations without restrictions and quickly find any feature.

## Context

The RBAC audit (Story 15-1) and Admin cleanup (Story 15-2) confirmed that Owner already has backend and frontend route access to ALL features. This story's primary work is **AC2: structured sidebar navigation** — grouping the flat 10-item list into logical sections so Owners can efficiently navigate the full feature set. AC1 (full access) is already satisfied but needs verification. AC3 (Owner-only labels) requires visual indicators on billing/settings sections.

**Current State:**
- Owner sees all 10 nav items in a flat, unsorted sidebar list
- Mobile bottom bar shows first 4 items, overflow menu has the rest (no grouping)
- No visual distinction between Owner-only sections and shared sections
- Backend: Owner is in ALL ~125+ endpoint `requireRole` arrays (verified in 15-1 audit)
- Frontend: Owner is in ALL `ProtectedRoute` `allowedRoles` arrays

## Acceptance Criteria

1. **AC1: Owner has access to all routes, features, and data within their tenant**
   - GIVEN I am logged in as OWNER
   - WHEN I navigate to any route in the application
   - THEN I can access it without restriction
   - AND no 403 errors occur on any endpoint
   - NOTE: Already satisfied — this AC requires verification test coverage, not new route changes

2. **AC2: Sidebar shows nested/structured navigation that organizes the full feature set**
   - GIVEN I am logged in as OWNER
   - WHEN I view the sidebar
   - THEN navigation items are grouped into logical collapsible sections:
     - **Overview**: Dashboard, Schedule
     - **Teaching**: Classes, Exercises, Mock Tests, Assignments, Grading
     - **People**: Students
     - **Administration**: Settings (with sub-items: General, Billing, Moderation, etc.)
   - AND each section has a group label/header
   - AND sections are collapsible (click to expand/collapse)
   - AND the active route's section is auto-expanded
   - AND mobile bottom bar still shows top-level quick-access items (Dashboard, Schedule, Classes, more...)

3. **AC3: Owner-only sections (billing, center settings) are clearly labeled**
   - GIVEN I am logged in as OWNER
   - WHEN I view the sidebar
   - THEN navigation items where `allowedRoles` is exclusively `["OWNER"]` show an "Owner" badge/indicator (e.g., Billing sub-route if Settings is expanded)
   - AND the badge is NOT shown on the Administration group label itself (since ADMIN also sees Settings)
   - AND the badge is not shown for items accessible to other roles

## Tasks / Subtasks

- [x] Task 1: Restructure navigation config for grouped sections (AC: #2)
  - [x] 1.1: In `navigation.ts`, change from flat `NavigationItem[]` to a grouped structure: `NavigationGroup[]` where each group has `label`, `items`, `collapsible` properties
  - [x] 1.2: Define groups: Overview (Dashboard, Schedule), Teaching (Classes, Exercises, Mock Tests, Assignments, Grading), People (Students), Administration (Settings)
  - [x] 1.3: For AC3, the "Owner" badge is derived at render time: if an item's `allowedRoles` is exactly `["OWNER"]`, show badge. No new flag needed on the config — the data is already there
  - [x] 1.4: Preserve existing `allowedRoles` per-item filtering — groups should filter out entirely if user has no access to any item in the group
  - [x] 1.5: Keep ALL existing exports (`NavItemConfig`, `getNavigationConfig`, `getMobileNavItems`, `getOverflowNavItems`) unchanged — `DashboardShell.tsx`, `MobileNavOverflow.tsx`, and their tests depend on them. Add new `NavGroupConfig` interface + `getNavigationGroups()` export alongside

- [x] Task 2: Update sidebar component for grouped navigation (AC: #2, #3)
  - [x] 2.1: In `app-sidebar.tsx`, replace flat `SidebarMenu` with grouped `SidebarGroup` sections using Shadcn sidebar primitives (`SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`)
  - [x] 2.2: Add collapsible behavior using Shadcn `Collapsible` component — each group wraps items in `CollapsibleContent`
  - [x] 2.3: Auto-expand the group containing the current active route (use `useLocation()` to match)
  - [x] 2.4: Render "Owner" badge next to individual nav items where `item.allowedRoles` is exactly `["OWNER"]` (use Shadcn `Badge` component, variant="outline", small size). Do NOT badge the group label
  - [x] 2.5: Mobile bottom bar lives in `DashboardShell.tsx` (not app-sidebar) — update mobile overflow (via `MobileNavOverflow.tsx`) to optionally show grouped sections matching desktop. Bottom bar itself (4 icons) can remain flat

- [x] Task 3: Add Owner access verification tests (AC: #1)
  - [x] 3.1: In `navigation.test.ts`, add test: "OWNER sees all 10 navigation items across all groups"
  - [x] 3.2: In `navigation.test.ts`, add test: "OWNER sees all groups including Administration"
  - [x] 3.3: In `route-protection.test.tsx`, add test: "OWNER can access all protected routes without redirect"

- [x] Task 4: Update sidebar tests for grouped navigation (AC: #2, #3)
  - [x] 4.1: Update existing sidebar/navigation tests to work with grouped structure
  - [x] 4.2: Add test: "Sidebar renders grouped sections with labels"
  - [x] 4.3: Add test: "Active route's group is auto-expanded"
  - [x] 4.4: Add test: "Owner-only badge shown on items where allowedRoles is exactly ['OWNER']"
  - [x] 4.5: Add test: "Owner-only badge NOT shown on items accessible to multiple roles"
  - [x] 4.6: Add test: "Groups with no accessible items are hidden for restricted roles"

- [x] Task 5: Verify no regression on other roles (AC: #1, #2)
  - [x] 5.1: Run full test suite — `pnpm --filter=webapp test` must pass
  - [x] 5.2: Verify ADMIN sees 8 items (per navigation.test.ts:70-87), now in grouped format
  - [x] 5.3: Verify TEACHER sees 9 items in grouped format
  - [x] 5.4: Verify STUDENT sees 3 items (Dashboard, Schedule, Profile per navigation.test.ts:108-123) in grouped format

## Dev Notes

### Key Decision: Navigation Restructure, Not Access Changes

Owner already has full access to all routes and endpoints. This story does NOT change any `requireRole()` calls or `ProtectedRoute` `allowedRoles`. The entire scope is **sidebar UX** — grouping, collapsibility, and Owner-only visual indicators.

### Architecture Patterns to Follow

**Navigation config** — Current flat structure in `navigation.ts`:
```typescript
// CURRENT interface (DO NOT RENAME — used by DashboardShell, MobileNavOverflow, tests):
export interface NavItemConfig { ... }  // title, url, icon, allowedRoles, order, mobileVisible, badge

// CURRENT exports (KEEP ALL — backward compat):
export function getNavigationConfig(centerId: string): NavItemConfig[] { ... }
export function getMobileNavItems(items: NavItemConfig[]): NavItemConfig[] { ... }
export function getOverflowNavItems(items: NavItemConfig[]): NavItemConfig[] { ... }

// NEW — add alongside existing exports:
export interface NavGroupConfig {
  label: string;           // i18n key for group header
  items: NavItemConfig[];  // reuses existing NavItemConfig
  collapsible: boolean;
}

export function getNavigationGroups(centerId: string): NavGroupConfig[] {
  const allItems = getNavigationConfig(centerId);
  // Profile is excluded from groups — handled separately in sidebar footer
  const grouped = allItems.filter(i => i.title !== "nav.profile");
  return [
    { label: "nav.group.overview", collapsible: true, items: grouped.filter(/* Dashboard, Schedule */) },
    { label: "nav.group.teaching", collapsible: true, items: grouped.filter(/* Classes, Exercises, Mock Tests, Assignments, Grading */) },
    { label: "nav.group.people", collapsible: true, items: grouped.filter(/* Students */) },
    { label: "nav.group.administration", collapsible: true, items: grouped.filter(/* Settings */) },
  ];
}
```

**Sidebar component** — Use existing Shadcn sidebar primitives:
```tsx
// Shadcn sidebar already provides (in packages/ui):
// SidebarGroup, SidebarGroupLabel, SidebarGroupContent
// Collapsible, CollapsibleTrigger, CollapsibleContent (from @radix-ui/react-collapsible)
// Badge (packages/ui/src/components/badge.tsx)

// Helper: check if item is Owner-exclusive
const isOwnerOnly = (item: NavItemConfig) =>
  item.allowedRoles.length === 1 && item.allowedRoles[0] === "OWNER";

<SidebarGroup>
  <Collapsible defaultOpen={isGroupActive}>
    <CollapsibleTrigger asChild>
      <SidebarGroupLabel>
        {t(group.label)}
        <ChevronDown className="ml-auto h-4 w-4" />
      </SidebarGroupLabel>
    </CollapsibleTrigger>
    <CollapsibleContent>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.filter(roleFilter).map(item => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <Link to={item.url}>
                  <item.icon />
                  <span>{t(item.title)}</span>
                  {isOwnerOnly(item) && <Badge variant="outline" className="ml-auto text-xs">Owner</Badge>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </CollapsibleContent>
  </Collapsible>
</SidebarGroup>
```

### Files to Modify

| File | Change |
|------|--------|
| `apps/webapp/src/core/config/navigation.ts` | Add `NavGroupConfig` interface + `getNavigationGroups(centerId)` export. Keep existing `NavItemConfig`, `getNavigationConfig`, `getMobileNavItems`, `getOverflowNavItems` exports unchanged for backward compat |
| `apps/webapp/src/core/components/common/app-sidebar.tsx` | Update desktop sidebar to render grouped navigation with collapsible sections (imports `getNavigationGroups`) |
| `apps/webapp/src/core/components/layout/DashboardShell.tsx` | Update mobile overflow to use grouped structure if desired, or keep flat — this file renders the mobile bottom bar via `getMobileNavItems()` and overflow via `MobileNavOverflow` |
| `apps/webapp/src/core/components/layout/MobileNavOverflow.tsx` | May need grouped sections in the overflow sheet to match desktop grouping |
| `apps/webapp/src/core/config/navigation.test.ts` | Update tests for grouped structure + add Owner verification tests |
| `apps/webapp/src/core/components/layout/MobileNavOverflow.test.tsx` | Update if MobileNavOverflow changes |
| `apps/webapp/src/features/auth/route-protection.test.tsx` | Add Owner full-access verification test |

### Anti-Patterns to Avoid

- **DO NOT** change any `requireRole()` calls on backend routes — Owner access is already complete
- **DO NOT** change any `ProtectedRoute` `allowedRoles` in `App.tsx` — all routes already include Owner
- **DO NOT** break the existing role-based filtering — each group must still filter items by `allowedRoles`
- **DO NOT** remove the flat `navConfig` export without checking if other components depend on it (search for usages first)
- **DO NOT** hardcode role checks in the sidebar — use the existing `allowedRoles` arrays from navigation config
- **DO NOT** add new backend routes or endpoints — this is a frontend-only story
- **DO NOT** change mobile bottom bar to show all items — keep it minimal (4 items max) with overflow menu
- **DO NOT** rename `NavItemConfig` to `NavigationItem` or create a duplicate interface — the existing name is used by DashboardShell, MobileNavOverflow, and their tests
- **DO NOT** put Profile into any navigation group — it is handled separately (NavUser dropdown on desktop, overflow menu on mobile)

### Previous Story Intelligence (15-2)

Story 15-2 modified these same files:
- `navigation.ts`: Removed ADMIN from `allowedRoles` for grading + assignments nav items
- `App.tsx`: Removed ADMIN from `ProtectedRoute` for grading + assignment routes
- `navigation.test.ts`: Updated ADMIN nav item count to 8 (was 10)
- `route-protection.test.tsx`: Added ADMIN redirect from grading test

**Key patterns established:**
- `allowedRoles` array on each nav item controls visibility
- `ProtectedRoute` wraps route components with role-based redirect
- Navigation tests verify item counts per role
- Frontend 1103 tests + backend 1195 tests passing after 15-2

### Existing Sidebar & Mobile Implementation

**Desktop sidebar** (`app-sidebar.tsx`):
- `filteredNavItems` = filter navConfig by `user.role` + sort by `order`
- Renders: `SidebarGroup` → `SidebarMenu` → map items to `SidebarMenuItem`
- Active state: `isActive()` checks `location.pathname` against item URL
- Teacher gets "Read-only" badge on Classes item
- Footer: `NavUser` component with dropdown (includes Profile link, theme toggle, logout)

**Mobile bottom bar** (`DashboardShell.tsx` — NOT app-sidebar):
- Uses `getMobileNavItems(filteredNavItems)` → max 4 items with `mobileVisible: true`
- Uses `getOverflowNavItems(filteredNavItems)` → remaining items in `MobileNavOverflow` sheet
- `MobileNavOverflow.tsx` renders a sheet/modal with overflow nav items
- The sidebar itself is `hidden md:flex` — not visible on mobile at all

### Shadcn Sidebar Components Available

The project uses Shadcn UI. Available sidebar primitives in `packages/ui`:
- `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`
- `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`
- `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` (from Radix)
- `Badge` component for Owner-only indicators

### Role Item Counts (for test assertions)

These counts come from `navigation.test.ts` — match them exactly:

| Role | Nav Items | Groups Visible | Details |
|------|-----------|----------------|---------|
| OWNER | 10 | 4 | Overview (2), Teaching (5), People (1), Administration (1: Settings) + Profile in footer |
| ADMIN | 8 | 4 | Overview (2), Teaching (3: Classes, Exercises, Mock Tests), People (1), Administration (1: Settings) + Profile in footer |
| TEACHER | 9 | 3 | Overview (2), Teaching (5), People (1) — no Administration (no Settings access) + Profile in footer |
| STUDENT | 3 | 1 | Overview (2: Dashboard, Schedule) + Profile in footer — only 1 group visible |

**Profile item decision:** Profile is NOT placed in any navigation group. On desktop, NavUser (sidebar footer dropdown) already provides profile access. On mobile, Profile appears in the overflow menu via `getOverflowNavItems()`. Keep Profile as a standalone item rendered outside the grouped sections — either in the sidebar footer area or as the last overflow item on mobile. Do NOT add Profile to any group.

### Git Intelligence

Recent commits:
- `89b1f42` feat(rbac): remove Admin from grading/assignment views (story 15-2) — most recent, touches same files
- `f8a9847` feat: story 17-03 — timezone combobox, moderation page, nav-user polish — recent sidebar area changes
- Test counts: frontend 1103 passed, backend 1195 passed (as of 15-2)

### Project Structure Notes

- Monorepo: TurboRepo + pnpm
- Frontend: `apps/webapp/src/features/<domain>/` and `apps/webapp/src/core/`
- Navigation: `apps/webapp/src/core/config/navigation.ts`
- Sidebar: `apps/webapp/src/core/components/common/app-sidebar.tsx`
- Routes: `apps/webapp/src/App.tsx`
- Shadcn UI: `packages/ui/src/components/`
- Testing: Vitest, co-located `*.test.ts` files
- Run tests: `pnpm --filter=webapp test`

### References

- [Source: _bmad-output/implementation-artifacts/15-2-admin-remove-grading-assignment-views.md] — Previous story patterns, file locations
- [Source: _bmad-output/implementation-artifacts/15-1-rbac-audit.md] — Full RBAC audit findings
- [Source: _bmad-output/planning-artifacts/rbac-permissions-matrix.md] — Permissions matrix confirming Owner has full access
- [Source: _bmad-output/planning-artifacts/epics.md#Epic15] — Epic context and story ACs
- [Source: _bmad-output/planning-artifacts/architecture.md] — Auth/RBAC architecture, Shadcn UI patterns
- [Source: project-context.md] — Project conventions, testing rules, tech stack

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Task 1: Added `NavGroupConfig` interface and `getNavigationGroups()` to `navigation.ts`. All existing exports preserved (backward compat). Added i18n keys for group labels in en/vi.
- Task 2: Rewrote `nav-main.tsx` for grouped collapsible navigation with Owner badge (AC2, AC3). Updated `app-sidebar.tsx` to pass groups. Updated `MobileNavOverflow.tsx` for grouped overflow with ungrouped items (Profile) fallback. Updated `DashboardShell.tsx` to pass groups/userRole to overflow. Updated DashboardPage.test.tsx — Profile is now in NavUser dropdown, not in nav groups.
- Task 3: Added 13 new tests in `navigation.test.ts` for grouped structure + Owner verification. Added 1 test in `route-protection.test.tsx` for Owner full-access verification.
- Task 4: Created `nav-main.test.tsx` with 6 tests covering grouped sections, auto-expand, Owner badge, role filtering.
- Task 5: Full regression passed — 109 test files, 1122 tests (up from 1103), zero failures.

### Change Log

- 2026-04-22: Story 15-3 implementation complete — grouped sidebar navigation with collapsible sections and Owner badge

### File List

- `apps/webapp/src/core/config/navigation.ts` — Added `NavGroupConfig` + `getNavigationGroups()`
- `apps/webapp/src/core/config/navigation.test.ts` — Added 13 tests for grouped navigation + Owner verification
- `apps/webapp/src/core/components/common/nav-main.tsx` — Rewritten for grouped collapsible navigation with Owner badge
- `apps/webapp/src/core/components/common/nav-main.test.tsx` — NEW: 6 tests for sidebar grouped rendering
- `apps/webapp/src/core/components/common/app-sidebar.tsx` — Updated to use `getNavigationGroups()` and pass groups to NavMain
- `apps/webapp/src/core/components/layout/DashboardShell.tsx` — Pass `groups` and `userRole` to MobileNavOverflow
- `apps/webapp/src/core/components/layout/MobileNavOverflow.tsx` — Added grouped rendering with ungrouped items fallback
- `apps/webapp/src/features/auth/route-protection.test.tsx` — Added Owner full-access verification test
- `apps/webapp/src/features/dashboard/DashboardPage.test.tsx` — Updated: Profile now via NavUser dropdown, not nav groups
- `apps/webapp/src/locales/en/common.json` — Added nav group labels + Owner badge i18n key
- `apps/webapp/src/locales/vi/common.json` — Added nav group labels + Owner badge i18n key
