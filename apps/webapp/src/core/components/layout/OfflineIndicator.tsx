import { motion } from "framer-motion";
import { Feather } from "lucide-react";
import {
  onlineManager,
  useIsFetching,
  useIsMutating,
} from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

function useIsOnline() {
  return useSyncExternalStore(
    (callback) => onlineManager.subscribe(callback),
    () => onlineManager.isOnline(),
    () => onlineManager.isOnline(),
  );
}

export function OfflineIndicator() {
  const isOnline = useIsOnline();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isSyncing = isFetching > 0 || isMutating > 0;
  const { t } = useTranslation();

  if (isOnline) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-xs font-medium uppercase tracking-wider">
            {t("status.live")}
          </span>
        </div>

        <motion.div
          animate={
            isSyncing
              ? {
                  rotate: [0, 10, -10, 10, 0],
                  x: [0, 1, -1, 1, 0],
                  y: [0, -1, 1, -1, 0],
                }
              : {}
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={isSyncing ? "text-primary" : "text-muted-foreground/40"}
        >
          {isSyncing ? (
            <div className="flex items-center gap-2">
              <Feather className="h-4 w-4" />
              <span className="text-[10px] animate-pulse">{t("status.syncing")}</span>
            </div>
          ) : (
            <Feather className="h-4 w-4" />
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-orange-500 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
      <Feather className="h-4 w-4 opacity-50" />
      <span className="text-xs font-semibold uppercase tracking-wider">
        {t("status.offline")}
      </span>
    </div>
  );
}
