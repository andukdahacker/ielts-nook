import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import type { TimerPosition } from "@workspace/types";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TimerSettingsEditorProps {
  timeLimit: number | null;
  timerPosition: TimerPosition | null;
  warningAlerts: number[] | null;
  autoSubmitOnExpiry: boolean;
  gracePeriodSeconds: number | null;
  enablePause: boolean;
  onTimeLimitChange: (v: number | null) => void;
  onTimerPositionChange: (v: TimerPosition | null) => void;
  onWarningAlertsChange: (v: number[] | null) => void;
  onAutoSubmitOnExpiryChange: (v: boolean) => void;
  onGracePeriodSecondsChange: (v: number | null) => void;
  onEnablePauseChange: (v: boolean) => void;
}

const DEFAULT_WARNINGS_SECONDS = [600, 300]; // 10 min, 5 min

export function TimerSettingsEditor({
  timeLimit,
  timerPosition,
  warningAlerts,
  autoSubmitOnExpiry,
  gracePeriodSeconds,
  enablePause,
  onTimeLimitChange,
  onTimerPositionChange,
  onWarningAlertsChange,
  onAutoSubmitOnExpiryChange,
  onGracePeriodSecondsChange,
  onEnablePauseChange,
}: TimerSettingsEditorProps) {
  const { t } = useTranslation("exercises");
  const hasTimeLimit = timeLimit !== null && timeLimit > 0;
  const timeLimitMinutes = hasTimeLimit ? Math.round(timeLimit / 60) : "";
  const gracePeriodMinutes =
    gracePeriodSeconds !== null ? Math.round(gracePeriodSeconds / 60) : "";

  const handleTimeLimitToggle = (checked: boolean) => {
    if (checked) {
      onTimeLimitChange(3600); // default 60 minutes
      onTimerPositionChange("top-bar");
      onWarningAlertsChange(DEFAULT_WARNINGS_SECONDS);
    } else {
      onTimeLimitChange(null);
      onTimerPositionChange(null);
      onWarningAlertsChange(null);
      onAutoSubmitOnExpiryChange(true);
      onGracePeriodSecondsChange(null);
      onEnablePauseChange(false);
    }
  };

  const handleTimeLimitMinutesChange = (value: string) => {
    const minutes = parseInt(value, 10);
    if (isNaN(minutes) || minutes < 1) {
      return;
    }
    const clamped = Math.min(minutes, 240);
    const seconds = clamped * 60;
    onTimeLimitChange(seconds);

    // Auto-remove warnings that exceed the new time limit
    if (warningAlerts) {
      const filtered = warningAlerts.filter((w) => w < seconds);
      if (filtered.length !== warningAlerts.length) {
        onWarningAlertsChange(filtered.length > 0 ? filtered : null);
      }
    }
  };

  const handleAddWarning = () => {
    const existing = warningAlerts ?? [];
    // Find a default value not already in the list
    const candidates = [60, 120, 180, 300, 600];
    const newWarning = candidates.find((c) => !existing.includes(c) && (!timeLimit || c < timeLimit)) ?? 60;
    if (!existing.includes(newWarning)) {
      const updated = [...existing, newWarning].sort((a, b) => b - a);
      onWarningAlertsChange(updated);
    }
  };

  const handleRemoveWarning = (secondsToRemove: number) => {
    if (!warningAlerts) return;
    const updated = warningAlerts.filter((s) => s !== secondsToRemove);
    onWarningAlertsChange(updated.length > 0 ? updated : null);
  };

  const handleWarningChange = (oldSeconds: number, value: string) => {
    if (!warningAlerts) return;
    const minutes = parseInt(value, 10);
    if (isNaN(minutes) || minutes < 1) return;
    const seconds = minutes * 60;
    if (timeLimit && seconds >= timeLimit) return;
    const updated = warningAlerts.map((s) => (s === oldSeconds ? seconds : s));
    onWarningAlertsChange(updated.sort((a, b) => b - a));
  };

  const handleAutoSubmitToggle = (checked: boolean) => {
    onAutoSubmitOnExpiryChange(checked);
    if (!checked) {
      onGracePeriodSecondsChange(null);
    }
  };

  const handleGracePeriodChange = (value: string) => {
    if (value === "") {
      onGracePeriodSecondsChange(null);
      return;
    }
    const minutes = parseInt(value, 10);
    if (isNaN(minutes) || minutes < 1) return;
    onGracePeriodSecondsChange(minutes * 60);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t("timerSettings.title")}</h3>

      {/* Time Limit Toggle */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="enable-time-limit"
          checked={hasTimeLimit}
          onCheckedChange={(checked) => handleTimeLimitToggle(checked === true)}
        />
        <div className="space-y-1">
          <Label
            htmlFor="enable-time-limit"
            className="text-sm font-medium cursor-pointer"
          >
            {t("timerSettings.enable")}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("timerSettings.enableHelp")}
          </p>
        </div>
      </div>

      {hasTimeLimit && (
        <>
          {/* Time Limit Input */}
          <div className="space-y-2 ml-7">
            <Label htmlFor="time-limit-minutes">
              {t("timerSettings.minutes")}
            </Label>
            <Input
              id="time-limit-minutes"
              type="number"
              min={1}
              max={240}
              value={timeLimitMinutes}
              onChange={(e) => handleTimeLimitMinutesChange(e.target.value)}
              placeholder="60"
              className="w-28"
            />
          </div>

          {/* Timer Position */}
          <div className="space-y-2 ml-7">
            <Label>{t("timerSettings.position")}</Label>
            <RadioGroup
              value={timerPosition ?? "top-bar"}
              onValueChange={(v) => onTimerPositionChange(v as TimerPosition)}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="top-bar" id="timer-pos-top" />
                <Label htmlFor="timer-pos-top" className="cursor-pointer">
                  {t("timerSettings.positionTop")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="floating" id="timer-pos-floating" />
                <Label htmlFor="timer-pos-floating" className="cursor-pointer">
                  {t("timerSettings.positionFloating")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Warning Alerts */}
          <div className="space-y-2 ml-7">
            <Label>{t("timerSettings.warnings")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("timerSettings.warningsHelp")}
            </p>
            <div className="space-y-2">
              {(warningAlerts ?? []).map((seconds) => (
                <div key={seconds} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={timeLimit ? Math.floor(timeLimit / 60) - 1 : 239}
                    value={Math.round(seconds / 60)}
                    onChange={(e) => handleWarningChange(seconds, e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">{t("timerSettings.minutesUnit")}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveWarning(seconds)}
                    className="size-8"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddWarning}
              >
                <Plus className="size-4 mr-1" />
                {t("timerSettings.addWarning")}
              </Button>
            </div>
          </div>

          {/* Auto-Submit */}
          <div className="space-y-3 ml-7">
            <div className="flex items-start gap-3">
              <Checkbox
                id="auto-submit"
                checked={autoSubmitOnExpiry}
                onCheckedChange={(checked) =>
                  handleAutoSubmitToggle(checked === true)
                }
              />
              <div className="space-y-1">
                <Label
                  htmlFor="auto-submit"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t("timerSettings.autoSubmit")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("timerSettings.autoSubmitHelp")}
                </p>
              </div>
            </div>

            {autoSubmitOnExpiry && (
              <div className="space-y-2 ml-7">
                <Label htmlFor="grace-period">
                  {t("timerSettings.gracePeriod")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="grace-period"
                    type="number"
                    min={1}
                    value={gracePeriodMinutes}
                    onChange={(e) => handleGracePeriodChange(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("timerSettings.gracePeriodHelp")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pause Option */}
          <div className="flex items-start gap-3 ml-7">
            <Checkbox
              id="enable-pause"
              checked={enablePause}
              onCheckedChange={(checked) =>
                onEnablePauseChange(checked === true)
              }
            />
            <div className="space-y-1">
              <Label
                htmlFor="enable-pause"
                className="text-sm font-medium cursor-pointer"
              >
                {t("timerSettings.pause")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("timerSettings.pauseHelp")}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
