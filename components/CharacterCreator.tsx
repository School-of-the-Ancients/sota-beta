import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Character } from '../types';
import { AVAILABLE_VOICES, AMBIENCE_LIBRARY } from '../constants';
import { HISTORICAL_FIGURES_SUGGESTIONS } from '../suggestions';
import DiceIcon from './icons/DiceIcon';
import SoundIcon from './icons/SoundIcon';

interface CharacterCreatorProps {
  onCharacterCreated: (character: Character) => void;
  onBack: () => void;
}

type Step = 'IDENTITY' | 'PERSONA' | 'PORTRAIT';

interface PersonaData {
  title: string;
  bio: string;
  greeting: string;
  timeframe: string;
  expertise: string;
  passion: string;
  systemInstruction: string;
  suggestedPrompts: string[];
  voiceName: string;
  ambienceTag: string;
}

const IDENTITY_PROMPTS = [
  "Whom shall we invite to the academy?",
  "Which great mind will you awaken?",
  "Whose wisdom will you seek?",
  "Name the legend you wish to consult.",
];

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 rounded-lg">
    <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-amber-200 text-lg">{message}</p>
  </div>
);

const Stepper: React.FC<{ currentStep: Step }> = ({ currentStep }) => {
  const steps: { id: Step, title: string }[] = [
    { id: 'IDENTITY', title: 'Identity' },
    { id: 'PERSONA', title: 'Persona' },
    { id: 'PORTRAIT', title: 'Portrait' },
  ];
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between mb-8 w-full">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${index <= currentStepIndex ? 'bg-amber-400 text-black' : 'bg-gray-700 text-gray-400'}`}>
              {index + 1}
            </div>
            <span className={`font-semibold text-center sm:text-left text-sm sm:text-base ${index <= currentStepIndex ? 'text-amber-300' : 'text-gray-500'}`}>{step.title}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-2 sm:mx-4 ${index < currentStepIndex ? 'bg-amber-400' : 'bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};


const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onCharacterCreated, onBack }) => {
  const [step, setStep] = useState<Step>('IDENTITY');
  const [name, setName] = useState('');
  const [focus, setFocus] = useState('');
  const [persona, setPersona] = useState<PersonaData | null>(null);
  const [portraitStyle, setPortraitStyle] = useState('A realistic, academic portrait');
  const [portraitOptions, setPortraitOptions] = useState<string[]>([]);
  const [selectedPortrait, setSelectedPortrait] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [identityPrompt, setIdentityPrompt] = useState('');
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIdentityPrompt(IDENTITY_PROMPTS[Math.floor(Math.random() * IDENTITY_PROMPTS.length)]);

    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value) {
      const filtered = HISTORICAL_FIGURES_SUGGESTIONS.filter(f => f.toLowerCase().includes(value.toLowerCase()));
      setSuggestions(filtered);
      setShowSuggestions(true);
      setActiveSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeSuggestionIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleRandomName = () => {
    setShowSuggestions(false);
    const randomIndex = Math.floor(Math.random() * HISTORICAL_FIGURES_SUGGESTIONS.length);
    setName(HISTORICAL_FIGURES_SUGGESTIONS[randomIndex]);
  };

  const handlePersonaGeneration = async () => {
    if (!name.trim()) {
      setError("Please enter a name for the ancient.");
      return;
    }
    setError(null);
    setIsLoading(true);
    setLoadingMessage('Researching historical figure...');

    try {
      if (!process.env.API_KEY) throw new Error("API_KEY not set.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const prompt = `Based on the historical figure named "${name}" ${focus ? `with a focus on: "${focus}"` : ''}, generate the following details:
        - title: A concise, descriptive title (e.g., The Father of Modern Physics).
        - bio: A short, engaging biography in the first person.
        - greeting: A brief, welcoming opening line for a conversation, in the first person, that invites the user to ask a question. For example, "Greetings. I am Albert Einstein. It is a pleasure to ponder the universe with you. What is on your mind?"
        - timeframe: The centuries they were active in (e.g., 17th and 18th centuries).
        - expertise: A comma-separated list of their key areas of expertise.
        - passion: A short phrase describing their core motivation or passion.
        - systemInstruction: A detailed prompt for an AI voice model. This must instruct the character to act as a conversational mentor. Their teaching style should be a balanced blend of sharing their own knowledge and insights, followed by asking insightful questions to guide the student's thinking and encourage discovery. They should not exclusively ask questions. It must also instruct them to periodically check the student's understanding. Crucially, it must inform them of two special abilities: changeEnvironment(description) to change the scene, and displayArtifact(name, description) to show an image, and encourage them to use these proactively to enhance the lesson. It must also specify a distinct, authentic-sounding accent based on their origin. The tone should match their personality.
        - suggestedPrompts: Three engaging, open-ended questions a user could ask this character. At least one should suggest using a visual ability (e.g., "Take me to...", "Show me...").
        - voiceName: Based on their personality and historical context, suggest the most suitable voice from this list: ${AVAILABLE_VOICES.join(', ')}. Return only the name of the voice.
        - ambienceTag: Based on the character's typical environment, select the most fitting keyword from this list: ${availableAmbienceTags}.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING }, bio: { type: Type.STRING }, greeting: { type: Type.STRING }, timeframe: { type: Type.STRING }, expertise: { type: Type.STRING }, passion: { type: Type.STRING }, systemInstruction: { type: Type.STRING },
              suggestedPrompts: { type: Type.ARRAY, items: { type: Type.STRING } },
              voiceName: { type: Type.STRING },
              ambienceTag: { type: Type.STRING },
            },
            required: ["title", "bio", "greeting", "timeframe", "expertise", "passion", "systemInstruction", "suggestedPrompts", "voiceName", "ambienceTag"]
          },
        },
      });

      const data = JSON.parse(response.text);
      setPersona(data);
      setStep('PERSONA');
    } catch (err) {
      console.error("Failed to generate persona:", err);
      setError("An error occurred while researching this figure. They may be too obscure or there could be a service issue. Please try another name.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePortraitsGeneration = async () => {
    if (!persona) return;
    setError(null);
    setIsLoading(true);
    setLoadingMessage('Painting portraits...');
    setPortraitOptions([]);
    setSelectedPortrait(null);

    try {
      if (!process.env.API_KEY) throw new Error("API_KEY not set.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `${portraitStyle} of ${name}, ${persona.title}. Dignified and historical.`,
        config: { numberOfImages: 2, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
      });

      const urls = response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
      setPortraitOptions(urls);
    } catch (err) {
      console.error("Failed to generate portraits:", err);
      setError("An error occurred while painting the portraits. Please try generating them again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeCharacter = () => {
    if (!persona || !selectedPortrait) return;
    const finalCharacter: Character = {
      id: `custom_${Date.now()}`,
      name: name,
      ...persona,
      portraitUrl: selectedPortrait,
    };
    onCharacterCreated(finalCharacter);
  };

  const renderIdentityStep = () => (
    <div className="space-y-6 animate-fade-in">
        <div>
            <h3 className="text-2xl font-semibold text-amber-300 mb-2">{identityPrompt}</h3>
            <p className="text-gray-400">Start with a name. You can add a focus to guide the AI's research.</p>
        </div>
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Ancient's Name</label>
            <div className="flex items-center gap-2">
                <div ref={suggestionBoxRef} className="relative flex-grow">
                    <input id="name" type="text" placeholder="e.g., Nikola Tesla" value={name} onChange={handleNameChange} onKeyDown={handleKeyDown} autoComplete="off" required className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg" />
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                            {suggestions.map((suggestion, index) => (
                                <li key={suggestion} onClick={() => handleSuggestionClick(suggestion)} className={`px-4 py-2 cursor-pointer hover:bg-amber-600/20 ${index === activeSuggestionIndex ? 'bg-amber-600/20' : ''}`}>
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <button type="button" onClick={handleRandomName} title="Suggest a random ancient" aria-label="Suggest a random ancient" className="flex-shrink-0 p-3 bg-gray-700 hover:bg-gray-600 text-amber-300 rounded-lg transition-colors border border-gray-600 h-[52px]">
                    <DiceIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
        <div>
            <label htmlFor="focus" className="block text-sm font-medium text-gray-300 mb-2">Character Focus <span className="text-gray-500">(Optional)</span></label>
            <textarea id="focus" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g., 'Focus on his later years as an inventor', 'as a young, revolutionary artist'" rows={3} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg" />
        </div>
        <button onClick={handlePersonaGeneration} disabled={!name.trim()} className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg disabled:opacity-50">
            Next: Create Persona
        </button>
    </div>
  );

  const renderPersonaStep = () => {
    if (!persona) return null;
    const handlePersonaChange = (field: keyof PersonaData, value: string | string[]) => {
      setPersona(prev => prev ? { ...prev, [field]: value } : null);
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div>
                <h3 className="text-2xl font-semibold text-amber-300 mb-2">Review Their Persona</h3>
                <p className="text-gray-400">The AI has drafted a personality. Feel free to edit any detail to match your vision.</p>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">Title</label>
                        <input type="text" value={persona.title} onChange={e => handlePersonaChange('title', e.target.value)} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">Greeting</label>
                        <textarea value={persona.greeting} onChange={e => handlePersonaChange('greeting', e.target.value)} rows={3} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">Bio (in first person)</label>
                        <textarea value={persona.bio} onChange={e => handlePersonaChange('bio', e.target.value)} rows={4} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Timeframe</label>
                        <input type="text" value={persona.timeframe} onChange={e => handlePersonaChange('timeframe', e.target.value)} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Expertise</label>
                        <input type="text" value={persona.expertise} onChange={e => handlePersonaChange('expertise', e.target.value)} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Passion</label>
                        <input type="text" value={persona.passion} onChange={e => handlePersonaChange('passion', e.target.value)} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Voice</label>
                        <select value={persona.voiceName} onChange={e => handlePersonaChange('voiceName', e.target.value)} className="mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
                            {AVAILABLE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Suggested Prompts</label>
                        {persona.suggestedPrompts.map((prompt, i) => (
                            <input key={i} type="text" value={prompt} onChange={e => handlePersonaChange('suggestedPrompts', persona.suggestedPrompts.map((p, j) => i === j ? e.target.value : p))} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2" />
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Ambience</label>
                    <div className="space-y-2">
                        {AMBIENCE_LIBRARY.map(ambience => (
                             <button 
                                key={ambience.tag} 
                                onClick={() => handlePersonaChange('ambienceTag', ambience.tag)}
                                className={`w-full text-left p-3 rounded-lg border-2 flex items-center gap-4 transition-colors ${persona.ambienceTag === ambience.tag ? 'bg-amber-900/40 border-amber-400' : 'bg-gray-800 border-gray-600 hover:border-gray-500'}`}
                            >
                                <SoundIcon className={`w-6 h-6 flex-shrink-0 ${persona.ambienceTag === ambience.tag ? 'text-amber-300' : 'text-gray-400'}`} />
                                <span className={`${persona.ambienceTag === ambience.tag ? 'text-amber-200' : 'text-gray-300'}`}>{ambience.description}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button onClick={handlePersonaGeneration} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                    Regenerate Persona
                </button>
                <button onClick={() => setStep('PORTRAIT')} className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                    Next: Create Portrait
                </button>
            </div>
        </div>
    );
  };

  const renderPortraitStep = () => {
    const portraitStyles = [
      { name: 'Portrait', prompt: 'A realistic, academic portrait' },
      { name: 'Oil Painting', prompt: 'An oil painting portrait' },
      { name: 'Sketch', prompt: 'A detailed charcoal sketch portrait' },
      { name: 'Statue', prompt: 'A weathered marble statue' },
    ];
    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h3 className="text-2xl font-semibold text-amber-300 mb-2">Choose Their Appearance</h3>
                <p className="text-gray-400">Select an artistic style, then generate portraits. Pick the one that best fits your ancient.</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Portrait Style</label>
                <div className="flex flex-wrap gap-2">
                    {portraitStyles.map(style => (
                        <button key={style.name} onClick={() => setPortraitStyle(style.prompt)} className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${portraitStyle === style.prompt ? 'bg-amber-400 border-amber-400 text-black' : 'bg-gray-700 border-gray-600 hover:border-gray-500 text-gray-300'}`}>
                            {style.name}
                        </button>
                    ))}
                </div>
            </div>
            <button onClick={handlePortraitsGeneration} className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                Generate Portraits
            </button>
            {portraitOptions.length > 0 && (
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-300">Select a Portrait</label>
                    <div className="grid grid-cols-2 gap-4">
                        {portraitOptions.map((url, i) => (
                            <img key={i} src={url} alt={`Portrait option ${i + 1}`} onClick={() => setSelectedPortrait(url)} className={`w-full h-auto object-cover rounded-lg cursor-pointer border-4 transition-all ${selectedPortrait === url ? 'border-amber-400 scale-105' : 'border-transparent hover:border-gray-600'}`} />
                        ))}
                    </div>
                </div>
            )}
            <button onClick={handleFinalizeCharacter} disabled={!selectedPortrait} className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg disabled:opacity-50">
                Finalize Ancient
            </button>
        </div>
    );
  };

  return (
    <div className="max-w-3xl w-full mx-auto bg-[#202020] p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700 relative">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-amber-200">The Historical Archive</h2>
            <p className="text-gray-400">Bring a new mind to the school, step by step.</p>
          </div>
          <button onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex-shrink-0">
            Back
          </button>
        </div>

        <Stepper currentStep={step} />

        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg mb-6">{error}</div>}

        <div className="mt-6">
            {step === 'IDENTITY' && renderIdentityStep()}
            {step === 'PERSONA' && renderPersonaStep()}
            {step === 'PORTRAIT' && renderPortraitStep()}
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;