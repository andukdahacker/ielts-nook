import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface StampedAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function StampedAnimation({ isVisible, onComplete }: StampedAnimationProps) {
  const { t } = useTranslation("grading");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => onCompleteRef.current(), 500);
    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-2 animate-stamp-in">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <span className="text-lg font-semibold text-green-700 animate-fade-in">
          {t("stamped.graded")}
        </span>
      </div>
      <style>{`
        @keyframes stamp-in {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-stamp-in {
          animation: stamp-in 300ms ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 400ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
