import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, vi, expect, beforeEach } from "vitest";
import { SectionOutline } from "./SectionOutline";
import type { QuestionSection } from "@workspace/types";

// Mock IntersectionObserver
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

let intersectionCallback: IntersectionObserverCallback;

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }
  observe = mockObserve;
  unobserve = mockUnobserve;
  disconnect = mockDisconnect;
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

function makeSection(id: string, sectionType: string, questionCount: number): QuestionSection {
  return {
    id,
    exerciseId: "ex-1",
    centerId: "center-1",
    sectionType: sectionType as QuestionSection["sectionType"],
    instructions: null,
    orderIndex: 0,
    audioSectionIndex: null,
    sectionTimeLimit: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions: Array.from({ length: questionCount }, (_, i) => ({
      id: `q-${id}-${i}`,
      sectionId: id,
      centerId: "center-1",
      questionType: sectionType as QuestionSection["sectionType"],
      questionText: `Question ${i + 1}`,
      options: null,
      correctAnswer: null,
      orderIndex: i,
      explanation: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
  };
}

describe("SectionOutline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when fewer than 3 sections", () => {
    const sections = [
      makeSection("s1", "R1_MCQ_SINGLE", 5),
      makeSection("s2", "R3_TFNG", 8),
    ];
    const { container } = render(
      <SectionOutline sections={sections} skill="READING" />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders outline items with correct labels and question counts for 3+ sections", () => {
    const sections = [
      makeSection("s1", "R1_MCQ_SINGLE", 5),
      makeSection("s2", "R3_TFNG", 8),
      makeSection("s3", "R9_MATCHING_HEADINGS", 6),
    ];
    render(<SectionOutline sections={sections} skill="READING" />);

    expect(screen.getByText("Section 1 — Multiple Choice (Single) (5q)")).toBeInTheDocument();
    expect(screen.getByText("Section 2 — True / False / Not Given (8q)")).toBeInTheDocument();
    expect(screen.getByText("Section 3 — Matching Headings (6q)")).toBeInTheDocument();
  });

  it("click handler scrolls to section with header offset", () => {
    const sections = [
      makeSection("s1", "R1_MCQ_SINGLE", 5),
      makeSection("s2", "R3_TFNG", 8),
      makeSection("s3", "R9_MATCHING_HEADINGS", 6),
    ];

    const mockElement = {
      getBoundingClientRect: () => ({ top: 200 }),
    };
    vi.spyOn(document, "querySelector").mockReturnValue(mockElement as unknown as Element);
    const mockScrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", { value: 100, writable: true });
    window.scrollTo = mockScrollTo;

    render(<SectionOutline sections={sections} skill="READING" />);

    fireEvent.click(screen.getByText("Section 2 — True / False / Not Given (8q)"));

    expect(document.querySelector).toHaveBeenCalledWith('[data-section-id="s2"]');
    // top = 200 (rect.top) + 100 (scrollY) - 56 (header) = 244
    expect(mockScrollTo).toHaveBeenCalledWith({ top: 244, behavior: "smooth" });

    vi.restoreAllMocks();
  });

  it("highlights active section via IntersectionObserver", () => {
    const sections = [
      makeSection("s1", "R1_MCQ_SINGLE", 5),
      makeSection("s2", "R3_TFNG", 8),
      makeSection("s3", "R9_MATCHING_HEADINGS", 6),
    ];

    render(<SectionOutline sections={sections} skill="READING" />);

    // Simulate section 2 becoming visible
    act(() => {
      intersectionCallback(
        [
          {
            isIntersecting: true,
            target: { getAttribute: () => "s2" } as unknown as Element,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    // The button for section 2 should have active styles (font-medium)
    const section2Button = screen.getByText("Section 2 — True / False / Not Given (8q)");
    expect(section2Button.className).toContain("font-medium");
    expect(section2Button.className).toContain("border-primary");
  });

  it("highlights topmost section when multiple are visible", () => {
    const sections = [
      makeSection("s1", "R1_MCQ_SINGLE", 5),
      makeSection("s2", "R3_TFNG", 8),
      makeSection("s3", "R9_MATCHING_HEADINGS", 6),
    ];

    render(<SectionOutline sections={sections} skill="READING" />);

    // Simulate sections 2 and 3 both becoming visible simultaneously
    act(() => {
      intersectionCallback(
        [
          {
            isIntersecting: true,
            target: { getAttribute: () => "s2" } as unknown as Element,
          } as unknown as IntersectionObserverEntry,
          {
            isIntersecting: true,
            target: { getAttribute: () => "s3" } as unknown as Element,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });

    // Section 2 should be highlighted (topmost in DOM order), not section 3
    const section2Button = screen.getByText("Section 2 — True / False / Not Given (8q)");
    const section3Button = screen.getByText("Section 3 — Matching Headings (6q)");
    expect(section2Button.className).toContain("font-medium");
    expect(section3Button.className).not.toContain("font-medium");
  });

  it("sets up IntersectionObserver observing all section elements", () => {
    const sections = [
      makeSection("s1", "R1_MCQ_SINGLE", 5),
      makeSection("s2", "R3_TFNG", 8),
      makeSection("s3", "R9_MATCHING_HEADINGS", 6),
    ];

    // Create DOM elements for sections
    for (const s of sections) {
      const el = document.createElement("div");
      el.setAttribute("data-section-id", s.id);
      document.body.appendChild(el);
    }

    render(<SectionOutline sections={sections} skill="READING" />);

    expect(mockObserve).toHaveBeenCalledTimes(3);

    // Cleanup DOM
    for (const s of sections) {
      document.querySelector(`[data-section-id="${s.id}"]`)?.remove();
    }
  });

  it("renders listening section labels correctly", () => {
    const sections = [
      makeSection("s1", "L1_FORM_NOTE_TABLE", 4),
      makeSection("s2", "L2_MCQ", 3),
      makeSection("s3", "L3_MATCHING", 5),
    ];
    render(<SectionOutline sections={sections} skill="LISTENING" />);

    expect(screen.getByText("Section 1 — Form/Note/Table Completion (4q)")).toBeInTheDocument();
    expect(screen.getByText("Section 2 — Multiple Choice (3q)")).toBeInTheDocument();
    expect(screen.getByText("Section 3 — Matching (5q)")).toBeInTheDocument();
  });
});
