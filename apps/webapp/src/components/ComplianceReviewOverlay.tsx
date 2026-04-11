import { Lock, AlertTriangle } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/auth-context";

interface ComplianceReviewOverlayProps {
  flagId: string;
  status: string;
  matchedTerms: string[];
  contentType: string;
  children: React.ReactNode;
}

export function ComplianceReviewOverlay({
  status,
  matchedTerms,
  children,
}: ComplianceReviewOverlayProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  if (status !== "PENDING") {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg border border-destructive/30">
        <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
          <div className="rounded-full bg-destructive/10 p-3">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-semibold text-destructive">
              Compliance Review Required
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            This content has been flagged for compliance review and is locked
            until resolved.
          </p>
          <div className="flex flex-wrap gap-1 justify-center">
            {matchedTerms.slice(0, 3).map((term) => (
              <Badge key={term} variant="destructive" className="text-xs">
                {term}
              </Badge>
            ))}
            {matchedTerms.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{matchedTerms.length - 3} more
              </Badge>
            )}
          </div>
          <Badge variant="secondary">Pending Review</Badge>
          {isAdminOrOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings/compliance")}
            >
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
