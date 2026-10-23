import { describe, expect, it } from 'vitest';
import { buildTextDialogueRequest, extractTextDialogueReply, SOTA_TEXT_MODEL } from './textDialogue';
import type { Character, ConversationTurn, Quest } from '../../types';

const character: Character = {
  id: 'socrates',
  name: 'Socrates',
  title: 'Philosopher',
  portraitUrl: '/socrates.png',
  bio: 'Athenian philosopher',
  greeting: 'What shall we examine?',
  systemInstruction: 'You are Socrates. Teach through questions.',
  voiceName: 'Orus',
  voiceAccent: 'Athenian Greek-accented English',
  timeframe: 'Classical Athens',
  expertise: 'Ethics',
  passion: 'Inquiry',
  suggestedPrompts: ['What is virtue?'],
  ambienceTag: 'forum',
};

const quest: Quest = {
  id: 'quest-1',
  title: 'Virtue Basics',
  description: 'Learn virtue ethics',
  objective: 'Explain virtue in your own words',
  characterId: 'socrates',
  duration: '20 minutes',
  focusPoints: ['definition', 'example'],
};

const transcript: ConversationTurn[] = [
  { speaker: 'model', speakerName: 'Socrates', text: 'What shall we examine?' },
  { speaker: 'user', speakerName: 'You', text: 'What is virtue?' },
];

describe('textDialogue', () => {
  it('builds a text-first Gemini request with quest and transcript context', () => {
    const request = buildTextDialogueRequest({
      character,
      activeQuest: quest,
      transcript,
      userMessage: 'Give me a practical example.',
    });

    expect(request.model).toBe(SOTA_TEXT_MODEL);
    expect(request.config?.systemInstruction).toContain('TEXT-FIRST DIALOGUE MODE');
    expect(request.config?.systemInstruction).toContain('Athenian Greek-accented English');
    expect(request.config?.systemInstruction).toContain('Explain virtue in your own words');
    expect(request.contents).toContain('Socrates: What shall we examine?');
    expect(request.contents).toContain('You: What is virtue?');
    expect(request.contents).toContain('Student: Give me a practical example.');
  });

  it('extracts a usable reply from several SDK response shapes', () => {
    expect(extractTextDialogueReply({ text: ' Direct text ' })).toBe('Direct text');
    expect(extractTextDialogueReply({ text: () => ' Function text ' })).toBe('Function text');
    expect(extractTextDialogueReply({ candidates: [{ content: { parts: [{ text: ' Candidate text ' }] } }] })).toBe('Candidate text');
  });

  it('falls back to a safe learner-facing message when no text is returned', () => {
    expect(extractTextDialogueReply({})).toMatch(/could not form a response/i);
  });
});
