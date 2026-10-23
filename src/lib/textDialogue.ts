import type { Character, ConversationTurn, Quest } from '../../types';

export const SOTA_TEXT_MODEL = 'gemini-2.5-flash';

interface BuildTextDialogueRequestArgs {
  character: Character;
  activeQuest: Quest | null;
  transcript: ConversationTurn[];
  userMessage: string;
}

interface TextDialogueRequest {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
  };
}

const MAX_CONTEXT_TURNS = 12;

const formatTranscript = (transcript: ConversationTurn[]): string => {
  const recentTurns = transcript.slice(-MAX_CONTEXT_TURNS);
  if (recentTurns.length === 0) {
    return 'No prior transcript. Start by responding to the student directly.';
  }

  return recentTurns
    .map((turn) => `${turn.speakerName}: ${turn.text}`)
    .join('\n');
};

const buildQuestInstruction = (activeQuest: Quest | null): string => {
  if (!activeQuest) {
    return 'No active quest is selected. Help the learner explore their curiosity and suggest a next quest when useful.';
  }

  return [
    `Active quest: ${activeQuest.title}`,
    `Objective: ${activeQuest.objective}`,
    `Focus points: ${activeQuest.focusPoints.join(', ')}`,
    'Quest protocol: ask focused Socratic questions, track progress toward each focus point, and explicitly say when the learner is ready for the mastery quiz.',
  ].join('\n');
};

export const buildTextDialogueRequest = ({
  character,
  activeQuest,
  transcript,
  userMessage,
}: BuildTextDialogueRequestArgs): TextDialogueRequest => {
  const accentInstruction = character.voiceAccent?.trim()
    ? `When this response is later read aloud, preserve the intended voice style: ${character.voiceAccent}. Keep the written language English unless the learner explicitly asks otherwise.`
    : 'Keep the written language English unless the learner explicitly asks otherwise.';

  const systemInstruction = [
    'TEXT-FIRST DIALOGUE MODE: You are the written reasoning model for School of the Ancients v2. Text is the source of truth; voice and audio are optional presentation layers on top of this response.',
    character.systemInstruction.trim(),
    accentInstruction,
    buildQuestInstruction(activeQuest),
    'Teaching style: respond as the mentor, be concise, Socratic, historically grounded, and end with one strong question or next step. Do not invent transcript content.',
  ].join('\n\n');

  const contents = [
    'Recent transcript:',
    formatTranscript(transcript),
    '',
    `Student: ${userMessage}`,
    '',
    `Reply as ${character.name}:`,
  ].join('\n');

  return {
    model: SOTA_TEXT_MODEL,
    contents,
    config: {
      systemInstruction,
    },
  };
};

export const extractTextDialogueReply = (response: unknown): string => {
  const unknownResponse = response as {
    text?: string | (() => string);
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };

  const directText = typeof unknownResponse.text === 'function'
    ? unknownResponse.text()
    : unknownResponse.text;

  if (typeof directText === 'string' && directText.trim()) {
    return directText.trim();
  }

  const candidateText = unknownResponse.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text)
    .find((text) => typeof text === 'string' && text.trim());

  if (candidateText) {
    return candidateText.trim();
  }

  return 'I could not form a response just now. Please try asking again in a simpler way.';
};
