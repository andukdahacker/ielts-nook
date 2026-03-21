import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { SpeakingCueCardEditor } from "./SpeakingCueCardEditor";

// Mock useDiagramUpload for consistent module resolution
vi.mock("../../hooks/use-diagram-upload", () => ({
  useDiagramUpload: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

// --- M2: SpeakingCueCardEditor direct behavior tests ---
describe("SpeakingCueCardEditor", () => {
  it("renders topic and bullet points", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "My Topic", bulletPoints: ["Point 1", "Point 2"] }}
        onChange={onChange}
      />,
    );
    expect(screen.getByDisplayValue("My Topic")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Point 1")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Point 2")).toBeInTheDocument();
  });

  it("calls onChange when topic changes", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "Old Topic", bulletPoints: ["Point 1"] }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("Old Topic"), {
      target: { value: "New Topic" },
    });
    expect(onChange).toHaveBeenCalledWith(
      { topic: "New Topic", bulletPoints: ["Point 1"] },
      null,
    );
  });

  it("adds a bullet point", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "Topic", bulletPoints: ["Existing"] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText("Add Bullet Point"));
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.bulletPoints).toEqual(["Existing", ""]);
  });

  it("removes a bullet point", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "Topic", bulletPoints: ["A", "B", "C"] }}
        onChange={onChange}
      />,
    );
    // Each bullet row has: 2 move buttons + 1 input + 1 trash button
    // The trash buttons are the last button in each row, and they are icon-only ghost buttons
    // Find all buttons, filter out the chevron (move) buttons and the "Add Bullet Point" button
    const allButtons = screen.getAllByRole("button");
    // Trash buttons: buttons that are NOT move buttons and NOT "Add Bullet Point"
    const trashButtons = allButtons.filter((btn) => {
      const hasChevron = btn.querySelector("svg.lucide-chevron-up") || btn.querySelector("svg.lucide-chevron-down");
      const isAdd = btn.textContent?.includes("Add Bullet Point");
      return !hasChevron && !isAdd;
    });
    fireEvent.click(trashButtons[0]);
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.bulletPoints).toEqual(["B", "C"]);
  });

  it("moves a bullet point down", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "Topic", bulletPoints: ["First", "Second", "Third"] }}
        onChange={onChange}
      />,
    );
    // Find move-down buttons (ChevronDown icons)
    const moveDownButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg.lucide-chevron-down"),
    );
    // Click move-down on the first bullet
    fireEvent.click(moveDownButtons[0]);
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.bulletPoints).toEqual(["Second", "First", "Third"]);
  });

  it("moves a bullet point up", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "Topic", bulletPoints: ["First", "Second", "Third"] }}
        onChange={onChange}
      />,
    );
    // Find move-up buttons (ChevronUp icons)
    const moveUpButtons = screen.getAllByRole("button").filter((btn) =>
      btn.querySelector("svg.lucide-chevron-up"),
    );
    // Click move-up on the second bullet (index 1)
    fireEvent.click(moveUpButtons[1]);
    expect(onChange).toHaveBeenCalled();
    const [options] = onChange.mock.calls[0];
    expect(options.bulletPoints).toEqual(["Second", "First", "Third"]);
  });

  it("does not add beyond 6 bullet points", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor
        options={{ topic: "Topic", bulletPoints: ["1", "2", "3", "4", "5", "6"] }}
        onChange={onChange}
      />,
    );
    expect(screen.queryByText("Add Bullet Point")).not.toBeInTheDocument();
  });

  it("handles null options gracefully", () => {
    const onChange = vi.fn();
    render(
      <SpeakingCueCardEditor options={null} onChange={onChange} />,
    );
    expect(screen.getByText("Cue Card Topic")).toBeInTheDocument();
    expect(screen.getByText("Add Bullet Point")).toBeInTheDocument();
  });
});
