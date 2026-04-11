import "@workspace/ui/styles/globals.css";
import "./i18n";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

function I18nLoadingFallback() {
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex h-screen w-screen items-center justify-center bg-background"
        >
            <div className="flex flex-col items-center gap-3">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="sr-only">Loading…</span>
            </div>
        </div>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Suspense fallback={<I18nLoadingFallback />}>
            <App />
        </Suspense>
    </StrictMode>,
);
