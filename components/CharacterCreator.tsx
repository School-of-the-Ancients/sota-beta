import React, { useMemo, useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Character, PersonaData } from '../types';
import { AMBIENCE_LIBRARY, AVAILABLE_VOICES } from '../constants';
import { HISTORICAL_FIGURES_SUGGESTIONS } from '../suggestions';
import DiceIcon from './icons/DiceIcon';

interface CharacterCreatorProps {
  onCharacterCreated: (character: Character) => void;
  onBack: () => void;
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
          <stop offset="0%" stop-color="#2a3240"/>
          <stop offset="100%" stop-color="#5b7c99"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="52%" text-anchor="middle" font-family="serif" font-size="180" fill="#dbeafe">${initials}</text>
      <text x="50%" y="86%" text-anchor="middle" font-family="serif" font-size="28" fill="#e0f2fe" opacity="0.9">${subtitle}</text>
    </svg>`
  );
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCharacterCreated, onBack }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [verificationSummary, setVerificationSummary] = useState<string | null>(null);

  const filteredSuggestions = useMemo(() => {
    const clean = name.trim().toLowerCase();
    if (!clean) {
      return HISTORICAL_FIGURES_SUGGESTIONS.slice(0, 8);
    }
    return HISTORICAL_FIGURES_SUGGESTIONS.filter(suggestion =>
      suggestion.toLowerCase().includes(clean)
    ).slice(0, 8);
  }, [name]);

  const handleNameChange = (value: string) => {
    setName(value);
    setError(null);
    setVerificationSummary(null);
  };

  const handlePickSuggestion = (value: string) => {
    handleNameChange(value);
    setDropdownOpen(false);
  };

  const handleRandomize = () => {
    if (HISTORICAL_FIGURES_SUGGESTIONS.length === 0) return;
    const randomIndex = Math.floor(Math.random() * HISTORICAL_FIGURES_SUGGESTIONS.length);
    handlePickSuggestion(HISTORICAL_FIGURES_SUGGESTIONS[randomIndex]);
  };

  const handleCreate = async () => {
    setError(null);
    const clean = name.trim();
    if (!clean) return setError('Enter a historical figure’s name.');

    try {
      setLoading(true);
      setMsg('Consulting the academy archivists…');

      if (!process.env.API_KEY) throw new Error('API_KEY not set.');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const verificationPrompt = `Answer in JSON whether "${clean}" is a well-documented, non-fictional historical figure. Use this schema: {"isHistorical": boolean, "summary": string}. Treat mythological or fictional names as not historical. Keep summary to one sentence.`;

      const verificationResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isHistorical: { type: Type.BOOLEAN },
              summary: { type: Type.STRING },
            },
            required: ['isHistorical', 'summary'],
          },
        },
        contents: verificationPrompt,
      });

      const verificationData = JSON.parse(verificationResp.text || '{}');
      if (!verificationData.isHistorical) {
        setError(
          verificationData.summary
            ? verificationData.summary
            : `We could not verify ${clean} as a historical figure. Try another name.`
        );
        return;
      }

      setVerificationSummary(verificationData.summary);
      setMsg('Summoning your mentor…');

      const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const personaPrompt = `Based on the historical figure "${clean}", return JSON with:
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

      const personaText = personaResp.text;
      if (!personaText) {
        throw new Error('The persona service returned no data.');
      }

      const persona: PersonaData = JSON.parse(personaText);

      // --- SAFE portrait generation with fallback ---
      let portraitUrl = makeFallbackAvatar(clean, persona.title);
      try {
        const imgResp = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: `A realistic, academic portrait of ${clean}, ${persona.title}. Dignified, historical lighting, 1:1, museum catalogue style.`,
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
        name: clean,
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

      onCharacterCreated(character);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to create character.');
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
            <h2 className="text-3xl font-bold text-amber-200">Create an Ancient</h2>
            <p className="text-gray-400">Type any historical figure’s name. We’ll craft a mentor persona.</p>
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

        <label className="block text-sm font-medium text-gray-300 mb-2">Historical figure</label>
        <div className="relative mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              placeholder="Ada Lovelace, Marcus Aurelius, Alhazen, Confucius, ..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg"
              aria-autocomplete="list"
              aria-expanded={dropdownOpen}
              aria-controls="character-suggestion-list"
            />
            <button
              type="button"
              onClick={handleRandomize}
              className="shrink-0 p-3 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 text-amber-300 transition-colors"
              aria-label="Roll the dice for a historical figure"
            >
              <DiceIcon className="w-5 h-5" />
            </button>
          </div>

          {dropdownOpen && filteredSuggestions.length > 0 && (
            <div
              id="character-suggestion-list"
              className="absolute z-10 mt-2 w-full bg-[#161616] border border-gray-700 rounded-lg shadow-xl overflow-hidden"
            >
              <p className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-700">
                Suggested figures
              </p>
              <ul className="max-h-60 overflow-y-auto">
                {filteredSuggestions.map(suggestion => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onMouseDown={() => handlePickSuggestion(suggestion)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-amber-500/20 hover:text-amber-200"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {verificationSummary && (
          <div className="mb-4 text-sm text-emerald-300 bg-emerald-900/40 border border-emerald-700 px-4 py-3 rounded-lg">
            {verificationSummary}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800/60 disabled:text-amber-200/70 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          {loading ? 'Creating…' : 'Create Ancient'}
        </button>
      </div>
    </div>
  );
};

export default CharacterCreator;
