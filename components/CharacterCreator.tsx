import React, { useMemo, useRef, useState } from 'react';
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
  const [verificationSummary, setVerificationSummary] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  const filteredSuggestions = useMemo(() => {
    const query = name.trim().toLowerCase();
    if (!query) return HISTORICAL_FIGURES_SUGGESTIONS.slice(0, 12);
    return HISTORICAL_FIGURES_SUGGESTIONS.filter(suggestion =>
      suggestion.toLowerCase().includes(query)
    ).slice(0, 12);
  }, [name]);

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
  };

  const handleRandomize = () => {
    if (HISTORICAL_FIGURES_SUGGESTIONS.length === 0) return;
    const randomSuggestion =
      HISTORICAL_FIGURES_SUGGESTIONS[
        Math.floor(Math.random() * HISTORICAL_FIGURES_SUGGESTIONS.length)
      ];
    setName(randomSuggestion);
    setShowSuggestions(false);
  };

  const verifyHistoricalFigure = async (ai: GoogleGenAI, candidate: string) => {
    const prompt = `You are the registrar of the School of the Ancients. Verify that "${candidate}" is a real historical figure who actually lived (not a mythological or purely fictional character). Respond in strict JSON with:
- verified (boolean)
- summary (one sentence about their historical significance)
- era (the main centuries during which they lived)
If you are not at least 80% confident in their historicity, set verified to false.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verified: { type: Type.BOOLEAN },
            summary: { type: Type.STRING },
            era: { type: Type.STRING },
          },
          required: ['verified', 'summary', 'era'],
        },
      },
    });

    const verification = JSON.parse(response.text) as {
      verified: boolean;
      summary: string;
      era: string;
    };

    return verification;
  };

  const handleCreate = async () => {
    setError(null);
    setVerificationSummary(null);
    const clean = name.trim();
    if (!clean) return setError('Enter a historical figure’s name.');

    try {
      setLoading(true);
      setMsg('Verifying historical figure…');

      if (!process.env.API_KEY) throw new Error('API_KEY not set.');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const verification = await verifyHistoricalFigure(ai, clean);

      if (!verification.verified) {
        setError('We could not verify this figure in the historical record. Try another name.');
        setLoading(false);
        return;
      }

      setVerificationSummary(`${verification.summary} (${verification.era})`);
      setMsg('Researching historical figure…');

      const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const voiceOptions = AVAILABLE_VOICES.map(
        voice => `${voice.name} (${voice.gender}; ${voice.description})`
      ).join('; ');
      const personaPrompt = `Based on the historical figure "${clean}", return JSON with:

        - title: A concise, descriptive title (e.g., The Father of Modern Physics).
        - bio: A short, engaging biography in the first person.
        - greeting: A brief, welcoming opening line for a conversation, in the first person, that invites the user to ask a question. For example, "Greetings. I am Albert Einstein. It is a pleasure to ponder the universe with you. What is on your mind?"
        - timeframe: The centuries they were active in (e.g., 17th and 18th centuries).
        - expertise: A comma-separated list of their key areas of expertise.
        - passion: A short phrase describing their core motivation or passion.
        - systemInstruction: act as mentor; emphasize Socratic prompts; may call changeEnvironment() or displayArtifact() as function-only lines. The prompt must also specify a distinct, authentic-sounding accent based on their origin. The tone should match their personality.
        - suggestedPrompts: Three engaging, open-ended questions a user could ask this character. At least one should suggest using a visual ability (e.g., "Take me to...", "Show me...").
        - voiceName: Based on their personality and historical context, suggest the most suitable voice from this list: ${voiceOptions}. Return only the name of the voice.
        - ambienceTag: Based on the character's typical environment, select the most fitting keyword from this list: ${availableAmbienceTags}.`;

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
      let portraitUrl = makeFallbackAvatar(clean, persona.title);
      try {
        setMsg('Painting portrait…');
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

        <label className="block text-sm font-medium text-gray-300 mb-2">Whom shall we invite to the academy?</label>
        <div className="relative mb-4" onFocus={() => setShowSuggestions(true)}>
          <input
            type="text"
            value={name}
            onChange={e => {
              setName(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={event => {
              if (!suggestionsRef.current?.contains(event.relatedTarget as Node)) {
                setShowSuggestions(false);
              }
            }}
            placeholder="Begin typing a historical figure…"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg"
          />
          <button
            type="button"
            onClick={handleRandomize}
            className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-amber-300 hover:text-amber-200 focus:outline-none"
            aria-label="Roll the dice for a random historical figure"
          >
            <DiceIcon className="w-6 h-6" />
          </button>
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-64 overflow-y-auto"
            >
              {filteredSuggestions.map(suggestion => (
                <button
                  key={suggestion}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-2 text-gray-200 hover:bg-amber-500/10 hover:text-amber-200 focus:bg-amber-500/10 focus:text-amber-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {verificationSummary && (
          <div className="bg-emerald-900/40 border border-emerald-700 text-emerald-200 text-sm p-3 rounded-lg mb-4">
            {verificationSummary}
          </div>
        )}

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
