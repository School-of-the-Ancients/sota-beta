export function ensureAccentInSystemInstruction(systemInstruction: string, voiceAccent?: string): string {
  const trimmedAccent = voiceAccent?.trim();
  if (!trimmedAccent) {
    return systemInstruction;
  }

  const normalizedInstruction = systemInstruction.toLowerCase();
  const normalizedAccent = trimmedAccent.toLowerCase();

  if (normalizedInstruction.includes(normalizedAccent)) {
    return systemInstruction;
  }

  if (normalizedInstruction.includes('accent')) {
    return systemInstruction;
  }

  const accentSentence = `You MUST speak with ${trimmedAccent}.`;
  const trimmedInstruction = systemInstruction.trim();

  if (!trimmedInstruction) {
    return accentSentence;
  }

  return `${trimmedInstruction}\n\n${accentSentence}`;
}
