import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [verificationNote, setVerificationNote] = useState<string | null>(null);

  const suggestionsToShow = useMemo(() => {
    const normalized = name.trim().toLowerCase();
    const pool = HISTORICAL_FIGURES_SUGGESTIONS;

    if (!normalized) {
      return pool.slice(0, 10);
    }

    return pool.filter(entry => entry.toLowerCase().includes(normalized)).slice(0, 10);
  }, [name]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [name, showSuggestions]);

  const handleSuggestionSelect = useCallback((value: string) => {
    setName(value);
    setShowSuggestions(false);
    setVerificationNote(null);
  }, []);

  const handleRandomSuggestion = useCallback(() => {
    const random =
      HISTORICAL_FIGURES_SUGGESTIONS[Math.floor(Math.random() * HISTORICAL_FIGURES_SUGGESTIONS.length)];
    handleSuggestionSelect(random);
  }, [handleSuggestionSelect]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestionsToShow.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev + 1;
        return next >= suggestionsToShow.length ? 0 : next;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(prev => {
        const next = prev - 1;
        return next < 0 ? suggestionsToShow.length - 1 : next;
      });
    } else if (event.key === 'Enter' && highlightedIndex > -1) {
      event.preventDefault();
      handleSuggestionSelect(suggestionsToShow[highlightedIndex]);
    }
  };

  const handleCreate = async () => {
    setError(null);
    const clean = name.trim();
    if (!clean) return setError('Enter a historical figure’s name.');

    try {
      setLoading(true);
      setVerificationNote(null);
      setMsg('Consulting the academy rolls…');

      if (!process.env.API_KEY) throw new Error('API_KEY not set.');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const verificationResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              valid: { type: Type.BOOLEAN },
              canonicalName: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['valid', 'canonicalName', 'reason'],
          },
        },
        contents: `Verify that "${clean}" is a real, well-documented historical figure from any culture or era. If the name is an alias, return the best-known canonical name. Respond with JSON: { "valid": boolean, "canonicalName": string, "reason": string }. Use "valid": false if the person is fictional, purely mythological without historical basis, or not sufficiently documented. Keep reason to one sentence.`,
      });

      let verificationData: { valid: boolean; canonicalName: string; reason: string };
      try {
        verificationData = JSON.parse(verificationResp.text);
      } catch (parseError) {
        throw new Error('The academy scribes returned an unreadable record. Try again.');
      }

      if (!verificationData.valid) {
        setError(
          verificationData.reason
            ? `We could not verify ${clean}. ${verificationData.reason}`
            : `We could not verify ${clean} as a historical figure.`
        );
        setVerificationNote(null);
        return;
      }

      const canonicalName = verificationData.canonicalName?.trim() || clean;
      setName(canonicalName);
      setVerificationNote(verificationData.reason);
      setShowSuggestions(false);
      setMsg('Summoning your mentor…');

      const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const personaPrompt = `Based on the historical figure "${canonicalName}", return JSON with:
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
      let portraitUrl = makeFallbackAvatar(canonicalName, persona.title);
      try {
        const imgResp = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: `A realistic, academic portrait of ${canonicalName}, ${persona.title}. Dignified, historical lighting, 1:1, museum catalogue style.`,
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
        name: canonicalName,
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
            <p className="text-amber-300 uppercase tracking-wide text-xs font-semibold mt-2">
              Whom shall we invite to the academy?
            </p>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setShowSuggestions(true);
                setVerificationNote(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={handleKeyDown}
              placeholder="Ada Lovelace, Marcus Aurelius, Alhazen, Confucius, ..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg"
              aria-autocomplete="list"
              aria-expanded={showSuggestions}
              aria-controls="historical-figure-suggestions"
            />
            <button
              type="button"
              onClick={handleRandomSuggestion}
              className="flex-shrink-0 bg-gray-800 border border-gray-600 hover:border-amber-400 text-amber-300 hover:text-amber-200 rounded-lg px-3 transition-colors flex items-center justify-center"
              title="Roll the dice for inspiration"
            >
              <DiceIcon className="w-6 h-6" />
            </button>
          </div>
          {verificationNote && (
            <p className="mt-2 text-sm text-teal-300">{verificationNote}</p>
          )}
          {showSuggestions && suggestionsToShow.length > 0 && (
            <div
              id="historical-figure-suggestions"
              role="listbox"
              className="absolute z-10 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-auto"
            >
              <p className="px-4 py-2 text-xs uppercase tracking-wide text-amber-300/80 border-b border-gray-700">
                Popular invitations
              </p>
              <ul className="divide-y divide-gray-800">
                {suggestionsToShow.map((suggestion, index) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onMouseDown={() => handleSuggestionSelect(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        highlightedIndex === index
                          ? 'bg-amber-500/20 text-amber-200'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                      role="option"
                      aria-selected={highlightedIndex === index}
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2 text-xs text-gray-500 bg-gray-900/80">
                Tip: press ↑ or ↓ to navigate, Enter to choose.
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCreate}
          className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          Create Ancient
        </button>
      </div>
    </div>
  );
};

export default CharacterCreator;
