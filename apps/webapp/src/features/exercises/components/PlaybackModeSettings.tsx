import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useTranslation } from "react-i18next";

interface PlaybackModeSettingsProps {
  playbackMode: string | null | undefined;
  onPlaybackModeChange: (mode: "TEST_MODE" | "PRACTICE_MODE") => void;
}

export function PlaybackModeSettings({
  playbackMode,
  onPlaybackModeChange,
}: PlaybackModeSettingsProps) {
  const { t } = useTranslation("exercises");
  return (
    <div className="space-y-2">
      <Label>{t("playbackMode.label")}</Label>
      <RadioGroup
        value={playbackMode ?? "PRACTICE_MODE"}
        onValueChange={(value) =>
          onPlaybackModeChange(value as "TEST_MODE" | "PRACTICE_MODE")
        }
        className="space-y-2"
      >
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="PRACTICE_MODE" id="practice-mode" />
          <div className="grid gap-0.5 leading-none">
            <Label htmlFor="practice-mode" className="cursor-pointer">
              {t("playbackMode.practice")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("playbackMode.practiceDesc")}
            </p>
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <RadioGroupItem value="TEST_MODE" id="test-mode" />
          <div className="grid gap-0.5 leading-none">
            <Label htmlFor="test-mode" className="cursor-pointer">
              {t("playbackMode.test")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("playbackMode.testDesc")}
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
