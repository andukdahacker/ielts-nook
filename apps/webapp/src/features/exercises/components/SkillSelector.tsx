import type { ExerciseSkill } from "@workspace/types";
import { Book, Headphones, Mic, Pen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SkillSelectorProps {
  onSelect: (skill: ExerciseSkill) => void;
}

export function SkillSelector({ onSelect }: SkillSelectorProps) {
  const { t } = useTranslation("exercises");

  const SKILLS: {
    value: ExerciseSkill;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "READING",
      label: t("skill.reading", { ns: "common" }),
      description: t("skillSelector.readingDesc"),
      icon: <Book className="size-8" />,
    },
    {
      value: "LISTENING",
      label: t("skill.listening", { ns: "common" }),
      description: t("skillSelector.listeningDesc"),
      icon: <Headphones className="size-8" />,
    },
    {
      value: "WRITING",
      label: t("skill.writing", { ns: "common" }),
      description: t("skillSelector.writingDesc"),
      icon: <Pen className="size-8" />,
    },
    {
      value: "SPEAKING",
      label: t("skill.speaking", { ns: "common" }),
      description: t("skillSelector.speakingDesc"),
      icon: <Mic className="size-8" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          {t("skillSelector.title")}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t("skillSelector.subtitle")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {SKILLS.map((skill) => (
          <button
            key={skill.value}
            onClick={() => onSelect(skill.value)}
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-muted p-6 transition-colors hover:border-primary hover:bg-accent"
          >
            <div className="rounded-full bg-muted p-4">{skill.icon}</div>
            <div className="text-center">
              <div className="font-semibold">{skill.label}</div>
              <div className="text-sm text-muted-foreground">
                {skill.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
