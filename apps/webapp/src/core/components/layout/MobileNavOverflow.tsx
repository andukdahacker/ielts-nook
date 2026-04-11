import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import type { NavItemConfig } from "@/core/config/navigation";

interface MobileNavOverflowProps {
  items: NavItemConfig[];
}

export function MobileNavOverflow({ items }: MobileNavOverflowProps) {
  const { t } = useTranslation();
  const location = useLocation();

  if (items.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          aria-label={t("nav.moreOptions")}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {t("nav.more")}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[50vh]">
        <SheetHeader>
          <SheetTitle>{t("nav.more")}</SheetTitle>
          <SheetDescription>{t("nav.additionalNavigation")}</SheetDescription>
        </SheetHeader>
        <nav className="grid grid-cols-4 gap-4 py-4" aria-label={t("nav.additionalNavigation")}>
          {items.map((item) => {
            const isActive = location.pathname === item.url ||
              location.pathname.startsWith(`${item.url}/`);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-nav-active/10 text-nav-active"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-xs font-medium text-center">{t(item.title)}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
