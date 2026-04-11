import { useState, type ErrorInfo } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { useTranslation } from "react-i18next";

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
}

function ErrorFallback({
  error,
  errorInfo,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{t("errors.somethingWentWrong")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t("errors.unexpectedOccurred")}
          </p>
          {(error || errorInfo) && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                aria-expanded={showDetails}
              >
                {showDetails ? t("errors.hideDetails") : t("errors.showDetails")}
              </Button>
              {showDetails && (
                <pre className="mt-2 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
                  {error?.message}
                  {"\n"}
                  {errorInfo?.componentStack}
                </pre>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Button onClick={resetErrorBoundary}>{t("errors.tryAgain")}</Button>
          <Button variant="outline" asChild>
            <a href="/">{t("errors.goToDashboard")}</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export { ErrorFallback };
