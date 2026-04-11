import type { ExerciseSkill, QuestionSection } from "@workspace/types";
import { useEffect, useRef, useState } from "react";
import { QUESTION_TYPES_BY_SKILL } from "./QuestionSectionEditor";

interface SectionOutlineProps {
  sections: QuestionSection[];
  skill: ExerciseSkill;
}

function getSectionLabel(
  section: QuestionSection,
  index: number,
  skill: ExerciseSkill,
): string {
  const types = QUESTION_TYPES_BY_SKILL[skill];
  const match = types?.find((t) => t.value === section.sectionType);
  const typeLabel = match?.label ?? section.sectionType;
  const qCount = section.questions?.length ?? 0;
  return `Section ${index + 1} — ${typeLabel} (${qCount}q)`;
}

export function SectionOutline({ sections, skill }: SectionOutlineProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Cleanup previous observer
    observerRef.current?.disconnect();

    if (sections.length < 3) {
      observerRef.current = null;
      setActiveSectionId(null);
      return;
    }

    const sectionIds = sections.map((s) => s.id);

    const observer = new IntersectionObserver(
      (entries) => {
        setActiveSectionId((prev) => {
          const visibleSet = new Set(prev ? [prev] : []);
          for (const entry of entries) {
            const id = entry.target.getAttribute("data-section-id");
            if (!id) continue;
            if (entry.isIntersecting) {
              visibleSet.add(id);
            } else {
              visibleSet.delete(id);
            }
          }
          // Pick the first visible section in DOM order
          return sectionIds.find((id) => visibleSet.has(id)) ?? prev;
        });
      },
      { rootMargin: "-56px 0px 0px 0px", threshold: 0.1 },
    );

    observerRef.current = observer;

    for (const section of sections) {
      const el = document.querySelector(
        `[data-section-id="${CSS.escape(section.id)}"]`,
      );
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 3) return null;

  const handleClick = (sectionId: string) => {
    const el = document.querySelector(
      `[data-section-id="${CSS.escape(sectionId)}"]`,
    );
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 56;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="Section outline"
      className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] w-52 shrink-0 overflow-y-auto bg-muted/30 border-r"
    >
      <ul className="py-3 space-y-0.5">
        {sections.map((section, idx) => {
          const isActive = activeSectionId === section.id;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => handleClick(section.id)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "text-foreground font-medium border-l-2 border-primary bg-muted/50"
                    : "text-muted-foreground border-l-2 border-transparent hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {getSectionLabel(section, idx, skill)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
