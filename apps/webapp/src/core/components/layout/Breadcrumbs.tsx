import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { useLocation, Link } from "react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { breadcrumbConfig } from "@/core/config/breadcrumb-config";
import { useBreadcrumbValues } from "@/core/context/breadcrumb-context";

interface BreadcrumbsProps {
  /**
   * Custom labels for dynamic segments (e.g., user names, IDs).
   * Key is the path segment, value is the display label.
   */
  customLabels?: Record<string, string>;
}

/**
 * Auto-generates breadcrumbs from the current route path.
 * Skips the first two segments (centerId and "dashboard") as they're always present.
 * Returns null if there are no breadcrumbs to show (i.e., on the dashboard root).
 */
export function Breadcrumbs({ customLabels = {} }: BreadcrumbsProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { labels: contextLabels, nonClickableSegments } = useBreadcrumbValues();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Build breadcrumb items from path segments
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    const isLast = index === pathSegments.length - 1;
    // Context labels take precedence, then custom labels, then config (translated), then format
    const configKey = breadcrumbConfig[segment];
    const label =
      contextLabels[segment] ??
      customLabels[segment] ??
      (configKey ? t(configKey) : undefined) ??
      formatSegment(segment);
    const isNonClickable = nonClickableSegments.has(segment);

    return { path, label, isLast, segment, isNonClickable };
  });

  // Don't show breadcrumbs if only 1-2 segments (centerId/dashboard)
  if (breadcrumbItems.length <= 2) return null;

  // Start from 3rd segment (skip centerId and dashboard)
  const visibleItems = breadcrumbItems.slice(2);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visibleItems.map((item, index) => (
          <Fragment key={item.path}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {item.isLast || item.isNonClickable ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Formats a path segment into a human-readable label.
 * Converts kebab-case to Title Case.
 */
function formatSegment(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
