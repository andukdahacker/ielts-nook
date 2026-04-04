import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { AppSidebar } from "../common/app-sidebar";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/features/auth/auth-context";
import {
  getNavigationConfig,
  getMobileNavItems,
  getOverflowNavItems,
} from "@/core/config/navigation";
import { NotificationBell } from "@/features/dashboard/components/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Separator } from "@workspace/ui/components/separator";
import { MobileNavOverflow } from "./MobileNavOverflow";
import { Breadcrumbs } from "./Breadcrumbs";
import { GracePeriodBanner } from "@/features/settings/components/GracePeriodBanner";
import { BreadcrumbProvider } from "@/core/context/breadcrumb-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(true);
  const location = useLocation();
  const { user } = useAuth();
  const centerId = user?.centerId;

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsAISidebarOpen(false);
      } else {
        setIsAISidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navConfig = getNavigationConfig(centerId || "default");
  const filteredNavItems = navConfig
    .filter((item) => user?.role && item.allowedRoles.includes(user.role))
    .sort((a, b) => a.order - b.order);

  // Mobile bottom bar: top 4 mobileVisible items + overflow
  const mobileNavItems = getMobileNavItems(filteredNavItems);
  const overflowNavItems = getOverflowNavItems(filteredNavItems);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background font-sans">
        <div className="flex flex-1 overflow-hidden relative">
          <div className="hidden md:flex">
            <AppSidebar />
          </div>

          <SidebarInset>
            <BreadcrumbProvider>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center justify-between gap-2 px-4 w-full">
                <div className="gap-2 items-center flex">
                  <SidebarTrigger className="-ml-1" />
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <Breadcrumbs />
                </div>
                <div className="flex items-center gap-2">
                  <NotificationBell />
                </div>
              </div>
            </header>
            {user?.role === "OWNER" && <GracePeriodBanner />}
            <main className="flex-1 overflow-y-auto relative">
              <div className="container mx-auto max-w-7xl px-4 py-6 pb-24 md:pb-6">
                {children}
              </div>
            </main>
            </BreadcrumbProvider>
          </SidebarInset>

          {/* AI Sidebar - Desktop (Fixed Right) */}
          <AnimatePresence>
            {isAISidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="hidden border-l bg-muted/30 xl:block overflow-hidden"
              >
                <div className="flex h-full w-[320px] flex-col">
                  <AISidebarContent onClose={() => setIsAISidebarOpen(false)} />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* AI Sidebar - Mobile/Tablet (Sheet) */}
          <div className="xl:hidden">
            <Sheet
              open={isAISidebarOpen}
              onOpenChange={(open) => setIsAISidebarOpen(open)}
            >
              <SheetContent side="right" className="w-[320px] p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>AI Assistant</SheetTitle>
                  <SheetDescription>AI chat assistant</SheetDescription>
                </SheetHeader>
                <AISidebarContent onClose={() => setIsAISidebarOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Floating Toggle Button */}
          {!isAISidebarOpen && (
            <div className="fixed right-4 bottom-20 z-40 md:bottom-4">
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                onClick={() => setIsAISidebarOpen(true)}
              >
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Bottom Bar */}
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-4 md:hidden"
          aria-label="Main navigation"
        >
          {mobileNavItems.map((item) => {
            const isActive =
              location.pathname === item.url ||
              location.pathname.startsWith(`${item.url}/`);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={`flex flex-col items-center gap-1 transition-colors ${
                  isActive
                    ? "text-nav-active"
                    : "text-muted-foreground hover:text-primary"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {item.title}
                </span>
              </Link>
            );
          })}
          {overflowNavItems.length > 0 && (
            <MobileNavOverflow items={overflowNavItems} />
          )}
        </nav>
      </div>
    </SidebarProvider>
  );
}

function AISidebarContent(_: { onClose: () => void }) {
  void _; // Satisfy unused param lint
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-heading">AI Assistant</span>
        </div>
      </div>
      <div className="flex-1 p-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Hello! I&apos;m your ClassLite AI assistant. How can I help you today?
          </p>
        </div>
      </div>
    </div>
  );
}
