import { AVAILABLE_VOICES, VOICE_CATALOG_PROMPT } from './constants';
import type { VoiceProfile } from './types';

const DEFAULT_VOICE_NAME = 'Zephyr';
const DEFAULT_VOICE = AVAILABLE_VOICES.find(v => v.name === DEFAULT_VOICE_NAME) ?? AVAILABLE_VOICES[0];

export const VOICE_PROMPT_HEADER = `Gemini 2.5 HD voice catalog:\n${VOICE_CATALOG_PROMPT}`;

const FEMALE_KEYWORDS = ['female', 'feminine', 'woman', 'queen', 'empress'];
const MALE_KEYWORDS = ['male', 'masculine', 'man', 'king'];
const NEUTRAL_KEYWORDS = ['neutral', 'androgynous', 'nonbinary', 'non-binary', 'balanced'];

const NORMALIZED_VOICES = AVAILABLE_VOICES.map(voice => ({
  ...voice,
  keywordSet: new Set(voice.keywords.map(keyword => keyword.toLowerCase())),
}));

function matchByKeywords(accentHint?: string): VoiceProfile | undefined {
  if (!accentHint) return undefined;
  const normalized = accentHint.toLowerCase();

  const keywordHit = NORMALIZED_VOICES.find(voice =>
    Array.from(voice.keywordSet).some(keyword => normalized.includes(keyword))
  );
  if (keywordHit) return keywordHit;

  if (FEMALE_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return AVAILABLE_VOICES.find(voice => voice.genderPresentation === 'feminine');
  }

  if (MALE_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return AVAILABLE_VOICES.find(voice => voice.genderPresentation === 'masculine');
  }

  if (NEUTRAL_KEYWORDS.some(keyword => normalized.includes(keyword))) {
    return AVAILABLE_VOICES.find(voice => voice.genderPresentation === 'neutral');
  }

  return undefined;
}

export function selectVoiceProfile(candidateName?: string, accentHint?: string): VoiceProfile {
  if (candidateName) {
    const direct = AVAILABLE_VOICES.find(voice => voice.name === candidateName.trim());
    if (direct) return direct;
  }

  return matchByKeywords(accentHint) ?? DEFAULT_VOICE;
}

export function buildVoiceAccentDirective(accentHint: string | undefined, voice: VoiceProfile): string {
  const trimmed = accentHint?.trim();
  if (trimmed) {
    return `${trimmed} Keep the ${voice.name} voice's ${voice.timbre} timbre and ${voice.style} delivery consistent.`;
  }

  return `${voice.accent}. Speak with a ${voice.genderPresentation} presentation and maintain a ${voice.style} tone using the ${voice.timbre} timbre.`;
}
