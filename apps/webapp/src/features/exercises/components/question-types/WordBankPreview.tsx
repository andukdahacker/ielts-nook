import { splitByBlanks, formatBlankDisplay } from "./blank-format";

interface WordBankPreviewProps {
  questionIndex: number;
  options: {
    wordBank: string[];
    summaryText: string;
  } | null;
}

export function WordBankPreview({
  questionIndex,
  options,
}: WordBankPreviewProps) {
  const summaryText = options?.summaryText ?? "";

  // Split text by ___N___ blanks and interleave with blank indicators
  const parts = splitByBlanks(summaryText);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{questionIndex + 1}.</p>
      <div className="pl-4 text-sm leading-relaxed">
        {parts.map((part, idx) => {
          // Even indices are text, odd indices are blank numbers
          if (idx % 2 === 0) {
            return <span key={idx}>{part}</span>;
          }
          return (
            <span
              key={idx}
              className="inline-flex items-center justify-center mx-1 font-medium text-primary"
            >
              {formatBlankDisplay(part)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
