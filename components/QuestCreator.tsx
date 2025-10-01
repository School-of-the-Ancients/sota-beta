import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Character, PersonaData, Quest } from '../types';
import { AMBIENCE_LIBRARY, AVAILABLE_VOICES } from '../constants';

type QuestDraft = {
  title: string;
  description: string;
  objective: string;
  focusPoints: string[];
  duration: string;
  mentorName: string;
  alternates?: string[];
};

interface QuestCreatorProps {
  characters: Character[];
  onBack: () => void;
  onQuestReady: (quest: Quest, character: Character) => void;
  onCharacterCreated: (character: Character) => void;
}

/** Pretty, branded SVG fallback if portrait generation fails */
function makeFallbackAvatar(name: string, title?: string) {
  const initials = name
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const subtitle = (title || 'Mentor').replace(/"/g, '&quot;');

  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#4b2e1f"/>
          <stop offset="100%" stop-color="#a36b21"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="52%" text-anchor="middle" font-family="serif" font-size="180" fill="#fcd34d">${initials}</text>
      <text x="50%" y="86%" text-anchor="middle" font-family="serif" font-size="28" fill="#fde68a" opacity="0.85">${subtitle}</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

const QuestCreator: React.FC<QuestCreatorProps> = ({
  characters,
  onBack,
  onQuestReady,
  onCharacterCreated,
}) => {
  const [goal, setGoal] = useState('');
  const [prefs, setPrefs] = useState({ difficulty: 'auto', style: 'auto', time: 'auto' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState<string | null>(null);

  const findCharacterByName = (name: string): Character | null => {
    const lower = name.trim().toLowerCase();
    return characters.find(c => c.name.trim().toLowerCase() === lower) ?? null;
  };

  /** Persona generator reused from your character creator, with a SAFE portrait step */
  const createPersonaFor = async (name: string): Promise<Character> => {
    if (!process.env.API_KEY) throw new Error('API_KEY not set.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
    const personaPrompt = `Based on the historical figure "${name}", return JSON with:
- title
- bio (first person)
- greeting (first person, short)
- timeframe (centuries)
- expertise (comma list)
- passion (short phrase)
- systemInstruction (act as mentor; emphasize Socratic prompts; may call changeEnvironment() or displayArtifact() as function-only lines)
- suggestedPrompts (3, one must be environmental/visual)
- voiceName (one of: ${AVAILABLE_VOICES.join(', ')})
- voiceAccent (describe the precise accent, vocal gender, and tone the mentor should maintain)
- ambienceTag (one of: ${availableAmbienceTags})`;

    const personaResp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bio: { type: Type.STRING },
            greeting: { type: Type.STRING },
            timeframe: { type: Type.STRING },
            expertise: { type: Type.STRING },
            passion: { type: Type.STRING },
            systemInstruction: { type: Type.STRING },
            suggestedPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
            voiceName: { type: Type.STRING },
            voiceAccent: { type: Type.STRING },
            ambienceTag: { type: Type.STRING },
          },
          required: [
            'title',
            'bio',
            'greeting',
            'timeframe',
            'expertise',
            'passion',
            'systemInstruction',
            'suggestedPrompts',
            'voiceName',
            'voiceAccent',
            'ambienceTag',
          ],
        },
      },
      contents: personaPrompt,
    });

    const persona: PersonaData = JSON.parse(personaResp.text);

    // --- SAFE portrait generation with fallback ---
    let portraitUrl = makeFallbackAvatar(name, persona.title);
    try {
      const imgResp = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A realistic, academic portrait of ${name}, ${persona.title}. Dignified, historical lighting, 1:1, museum catalogue style.`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
      });

      const maybe = (imgResp as any)?.generatedImages?.[0];
      const bytes =
        maybe?.image?.imageBytes ??
        (maybe as any)?.b64Json ??
        (maybe as any)?.content?.image?.imageBytes;

      if (bytes) {
        portraitUrl = `data:image/jpeg;base64,${bytes}`;
      } else {
        console.warn('Portrait generation returned no bytes; using fallback avatar.');
      }
    } catch (err) {
      console.warn('Portrait generation failed; using fallback avatar.', err);
    }

    const character: Character = {
      id: `custom_${Date.now()}`,
      name,
      title: persona.title,
      bio: persona.bio,
      greeting: persona.greeting,
      timeframe: persona.timeframe,
      expertise: persona.expertise,
      passion: persona.passion,
      systemInstruction: persona.systemInstruction,
      suggestedPrompts: persona.suggestedPrompts,
      voiceName: persona.voiceName,
      voiceAccent: persona.voiceAccent,
      ambienceTag: persona.ambienceTag,
      portraitUrl,
    };
    return character;
  };

  const handleCreate = async () => {
    setError(null);
    const clean = goal.trim();
    if (!clean) {
      setError('Tell me what you want to learn.');
      return;
    }

    try {
      setLoading(true);
      setMsg('Designing your quest…');

      if (!process.env.API_KEY) throw new Error('API_KEY not set.');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const draftPrompt = `You are the Quest Architect. Convert this learner goal into a concise quest and pick the most appropriate historical mentor.

Goal: "${clean}"
Preferences (may be 'auto'):
- Difficulty: ${prefs.difficulty}
- Style (empirical / ethical / canonical / craft / integrative): ${prefs.style}
- Time (e.g., 10–15 min, 1 week): ${prefs.time}

Return JSON with:
{
  "title": string,
  "description": string,
  "objective": string,
  "focusPoints": string[],
  "duration": string,
  "mentorName": string,
  "alternates": string[]
}`;

      const draftResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              objective: { type: Type.STRING },
              focusPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.STRING },
              mentorName: { type: Type.STRING },
              alternates: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'description', 'objective', 'focusPoints', 'duration', 'mentorName'],
          },
        },
        contents: draftPrompt,
      });

      const draft: QuestDraft = JSON.parse(draftResp.text);

      const matcherPrompt = `You are the Mentor Matcher. Your job is to ensure the mentor is a legendary master of the requested learning goal.\n\nGoal: "${clean}"\nDraft mentor: ${draft.mentorName}\nAlternate candidates: ${(draft.alternates && draft.alternates.length > 0 ? draft.alternates.join(', ') : 'none provided')}\n\nRules:\n- Select a historical (or widely known contemporary) person celebrated for deep expertise in this exact topic.\n- If the draft mentor already fits, keep them.\n- If not, replace them with a better-suited mentor. Prefer candidates from the alternate list before suggesting a new one.\n- Never choose someone whose accomplishments are unrelated to the goal.\n- Respond in JSON with { "mentorName": string, "reason": string } and nothing else.`;

      const matcherResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mentorName: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['mentorName'],
          },
        },
        contents: matcherPrompt,
      });

      const mentorDecision = JSON.parse(matcherResp.text) as { mentorName: string; reason?: string };
      const mentorName = mentorDecision.mentorName?.trim() || draft.mentorName;

      setMsg(`Selecting mentor: ${mentorName}…`);

      let mentor = findCharacterByName(mentorName);
      if (!mentor) {
        setMsg(`Creating ${mentorName}…`);
        mentor = await createPersonaFor(mentorName);
        onCharacterCreated(mentor); // persist
      }

      const quest: Quest = {
        id: `quest_${Date.now()}`,
        characterId: mentor.id,
        title: draft.title,
        description: draft.description,
        objective: draft.objective,
        focusPoints: draft.focusPoints,
        duration: draft.duration,
      };

      setMsg('Launching your lesson…');
      onQuestReady(quest, mentor);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to create quest.');
    } finally {
      setLoading(false);
      setMsg('');
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto bg-[#202020] p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700 relative">
      {loading && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 rounded-lg">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-amber-200 text-lg">{msg || 'Working…'}</p>
        </div>
      )}

      <div className={loading ? 'opacity-20 blur-sm' : ''}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-amber-200">Create a Learning Quest</h2>
            <p className="text-gray-400">Describe what you want to learn. We’ll pick (or create) the perfect mentor.</p>
          </div>
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-gray-300 mb-2">Your learning goal</label>
        <textarea
          rows={4}
          placeholder={`e.g., "Understand backpropagation well enough to implement it", "Debate just war ethics", "Sketch like Da Vinci in 7 days"`}
          value={goal}
          onChange={e => setGoal(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg mb-4"
        />

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Difficulty</label>
            <select
              value={prefs.difficulty}
              onChange={e => setPrefs(p => ({ ...p, difficulty: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-200"
            >
              <option value="auto">Auto</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Style</label>
            <select
              value={prefs.style}
              onChange={e => setPrefs(p => ({ ...p, style: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-200"
            >
              <option value="auto">Auto</option>
              <option value="empirical">Empirical</option>
              <option value="ethical">Ethical</option>
              <option value="canonical">Canonical</option>
              <option value="craft">Craft / atelier</option>
              <option value="integrative">Integrative / polymath</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Time</label>
            <select
              value={prefs.time}
              onChange={e => setPrefs(p => ({ ...p, time: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-gray-200"
            >
              <option value="auto">Auto</option>
              <option value="10–15 min">10–15 min</option>
              <option value="30–45 min">30–45 min</option>
              <option value="1–2 hours">1–2 hours</option>
              <option value="multi-day">Multi-day</option>
              <option value="1 week">~1 week</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          Create Quest
        </button>
      </div>
    </div>
  );
};

export default QuestCreator;
