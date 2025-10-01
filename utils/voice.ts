export const ensureAccentInstruction = (instruction: string, accent?: string): string => {
  const trimmedInstruction = instruction?.trim() ?? '';
  const trimmedAccent = accent?.trim();
  if (!trimmedAccent) return trimmedInstruction;
  if (/accent/i.test(trimmedInstruction)) {
    return trimmedInstruction;
  }
  const needsPeriod = trimmedInstruction && !/[.!?]\s*$/.test(trimmedInstruction);
  const withPunctuation = needsPeriod ? `${trimmedInstruction}.` : trimmedInstruction;
  return `${withPunctuation}\n\nAlways speak with ${trimmedAccent}`.trim();
};
