import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filteredSuggestions = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return HISTORICAL_FIGURES_SUGGESTIONS;
    return HISTORICAL_FIGURES_SUGGESTIONS.filter(suggestion =>
      suggestion.toLowerCase().includes(trimmed)
    );
  }, [name]);

  const limitedSuggestions = useMemo(() => filteredSuggestions.slice(0, 8), [filteredSuggestions]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    setHighlightedIndex(limitedSuggestions.length > 0 ? 0 : -1);
  }, [isDropdownOpen, limitedSuggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionSelect = (suggestion: string) => {
    setName(suggestion);
    setError(null);
    setIsDropdownOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleRollSuggestion = () => {
    const randomSuggestion =
      HISTORICAL_FIGURES_SUGGESTIONS[Math.floor(Math.random() * HISTORICAL_FIGURES_SUGGESTIONS.length)];
    handleSuggestionSelect(randomSuggestion);
  };

  const handleInputChange = (value: string) => {
    setName(value);
    setError(null);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || limitedSuggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % limitedSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + limitedSuggestions.length) % limitedSuggestions.length);
    } else if (event.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < limitedSuggestions.length) {
        event.preventDefault();
        handleSuggestionSelect(limitedSuggestions[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    const clean = name.trim();
    if (!clean) return setError('Enter a historical figure’s name.');
    setIsDropdownOpen(false);

    try {
      setLoading(true);
      if (!process.env.API_KEY) throw new Error('API_KEY not set.');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      setMsg('Consulting the academy archives…');

      const verificationPrompt = `You are the registrar of a historical academy. Verify whether the provided name refers to a real, well-documented historical figure (before the 21st century or of significant historical impact). Respond with JSON containing\n- isHistoricalFigure (boolean)\n- canonicalName (the standardized name or empty string)\n- reason (succinct explanation).\nName: ${clean}`;

      const verificationResp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isHistoricalFigure: { type: Type.BOOLEAN },
              canonicalName: { type: Type.STRING },
              reason: { type: Type.STRING },
            },
            required: ['isHistoricalFigure', 'reason'],
          },
        },
        contents: verificationPrompt,
      });

      const verificationRaw = (verificationResp as any)?.text;
      if (!verificationRaw) throw new Error('Verification failed. No response received.');

      const verification = JSON.parse(verificationRaw) as {
        isHistoricalFigure: boolean;
        canonicalName?: string;
        reason: string;
      };

      if (!verification.isHistoricalFigure) {
        setError(verification.reason || `I could not verify ${clean} as a historical figure.`);
        setLoading(false);
        setMsg('');
        return;
      }

      const verifiedName = verification.canonicalName?.trim() || clean;
      setName(verifiedName);

      setMsg('Summoning your mentor…');

      const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const personaPrompt = `Based on the historical figure "${verifiedName}", return JSON with:
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

      const personaRaw = (personaResp as any)?.text;
      if (!personaRaw) throw new Error('Persona generation failed. No response received.');

      const persona: PersonaData = JSON.parse(personaRaw);

      // --- SAFE portrait generation with fallback ---
      let portraitUrl = makeFallbackAvatar(verifiedName, persona.title);
      try {
        const imgResp = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: `A realistic, academic portrait of ${verifiedName}, ${persona.title}. Dignified, historical lighting, 1:1, museum catalogue style.`,
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
        name: verifiedName,
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
    <div
      ref={containerRef}
      className="max-w-3xl w-full mx-auto bg-[#202020] p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700 relative"
    >
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
            <p className="text-gray-400">Whom shall we invite to the academy?</p>
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
              ref={inputRef}
              type="text"
              value={name}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ada Lovelace, Marcus Aurelius, Alhazen, Confucius, ..."
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg"
              aria-autocomplete="list"
              aria-expanded={isDropdownOpen}
              aria-controls="historical-figure-suggestions"
            />
            <button
              type="button"
              onClick={handleRollSuggestion}
              className="flex items-center justify-center h-12 w-12 bg-gray-800 border border-gray-600 rounded-lg text-amber-300 hover:bg-gray-700 transition-colors"
              aria-label="Roll a random historical figure"
            >
              <DiceIcon className="w-6 h-6" />
            </button>
          </div>
          {isDropdownOpen && (
            <div
              id="historical-figure-suggestions"
              role="listbox"
              className="absolute z-10 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto"
            >
              {limitedSuggestions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No matches found. Try another name.</div>
              ) : (
                limitedSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    role="option"
                    onMouseDown={() => handleSuggestionSelect(suggestion)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      index === highlightedIndex
                        ? 'bg-amber-500/20 text-amber-200'
                        : 'text-gray-200 hover:bg-gray-800'
                    }`}
                    aria-selected={index === highlightedIndex}
                  >
                    {suggestion}
                  </button>
                ))
              )}
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
