
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Character, Quest } from '../types';
import { AVAILABLE_VOICES, AMBIENCE_LIBRARY } from '../constants';
import DiceIcon from './icons/DiceIcon';

interface QuestCreatorProps {
  onQuestCreated: (quest: Quest, character: Character) => void;
  onBack: () => void;
}

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
  voiceAccent: string;
  ambienceTag: string;
}

const QUEST_PROMPTS = [
  "What new knowledge do you seek?",
  "Describe the lesson you wish to learn.",
  "What subject will you master today?",
  "Tell us what you want to explore.",
];

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 rounded-lg">
    <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    <p className="mt-4 text-amber-200 text-lg">{message}</p>
  </div>
);

const QuestCreator: React.FC<QuestCreatorProps> = ({ onQuestCreated, onBack }) => {
  const [learningObjective, setLearningObjective] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [questPrompt, setQuestPrompt] = useState('');

  useEffect(() => {
    setQuestPrompt(QUEST_PROMPTS[Math.floor(Math.random() * QUEST_PROMPTS.length)]);
  }, []);

  const handleCreateQuest = async () => {
    if (!learningObjective.trim()) {
      setError("Please enter a learning objective.");
      return;
    }
    setError(null);
    setIsLoading(true);

    let characterName = '';
    let personaData: PersonaData | null = null;
    let portraitUrl = '';

    try {
      // Step 1: Find the best historical figure
      setLoadingMessage('Finding the perfect mentor...');
      if (!process.env.API_KEY) throw new Error("API_KEY not set.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const figureResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `A user wants to learn about: "${learningObjective}". Suggest the single best historical figure to teach this topic. The figure must be a widely recognized historical figure (e.g., a philosopher, scientist, artist, ruler, inventor, or writer from the past). Return only the name of the person.`,
      });
      characterName = figureResponse.text.trim();

      if (!characterName) {
        throw new Error("Could not identify a suitable historical figure.");
      }

      // Step 2: Generate the character's persona
      setLoadingMessage(`Researching ${characterName}...`);
      const availableAmbienceTags = AMBIENCE_LIBRARY.map(a => a.tag).join(', ');
      const personaPrompt = `Based on the historical figure named "${characterName}", generate the following details:
        - title: A concise, descriptive title (e.g., The Father of Modern Physics).
        - bio: A short, engaging biography in the first person.
        - greeting: A brief, welcoming opening line for a conversation, in the first person, that invites the user to ask a question.
        - timeframe: The centuries they were active in (e.g., 17th and 18th centuries).
        - expertise: A comma-separated list of their key areas of expertise.
        - passion: A short phrase describing their core motivation or passion.
        - systemInstruction: A detailed prompt for an AI voice model to act as a conversational mentor, balancing knowledge sharing with guiding questions and periodically checking understanding. It must mention the special abilities
changeEnvironment(description)
 and

displayArtifact(name, description)
, instructing the AI to only generate the function call when using them. It must also specify an authentic accent and tone.
        - suggestedPrompts: Three engaging, open-ended questions a user could ask this character.
        - voiceName: Suggest the most suitable voice from this list: ${AVAILABLE_VOICES.join(', ')}.
        - voiceAccent: Describe the exact accent and vocal qualities they should maintain (e.g., "Measured classical Greek cadence").
        - ambienceTag: Select the most fitting keyword from this list: ${availableAmbienceTags}.`;

      const personaResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, bio: { type: Type.STRING }, greeting: { type: Type.STRING }, timeframe: { type: Type.STRING }, expertise: { type: Type.STRING }, passion: { type: Type.STRING }, systemInstruction: { type: Type.STRING }, suggestedPrompts: { type: Type.ARRAY, items: { type: Type.STRING } }, voiceName: { type: Type.STRING }, voiceAccent: { type: Type.STRING }, ambienceTag: { type: Type.STRING } }, required: ["title", "bio", "greeting", "timeframe", "expertise", "passion", "systemInstruction", "suggestedPrompts", "voiceName", "voiceAccent", "ambienceTag"] } },
        contents: personaPrompt,
      });
      personaData = JSON.parse(personaResponse.text);

      // Step 3: Generate the character's portrait
      setLoadingMessage(`Painting ${characterName}'s portrait...`);
      const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A realistic, academic portrait of ${characterName}, ${personaData.title}. Dignified and historical.`,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
      });
      portraitUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;

      const character: Character = {
        id: `custom_${Date.now()}`,
        name: characterName,
        ...personaData,
        portraitUrl: portraitUrl,
      };

      // Step 4: Generate the quest details
      setLoadingMessage('Designing your quest...');
      const questPrompt = `Based on the learning objective "${learningObjective}" and the historical figure "${characterName}", generate the following details for a learning quest:
        - title: A concise, engaging title for the quest.
        - description: A short, compelling description of what the user will learn.
        - objective: A clear, measurable learning objective for the quest.
        - duration: An estimated duration for the quest (e.g., "15 minutes").
        - focusPoints: A list of 3-5 key topics or questions that will be covered in the quest.`;

      const questResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, objective: { type: Type.STRING }, duration: { type: Type.STRING }, focusPoints: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["title", "description", "objective", "duration", "focusPoints"] } },
        contents: questPrompt,
      });
      const questData = JSON.parse(questResponse.text);

      const quest: Quest = {
        id: `quest_${Date.now()}`,
        characterId: character.id,
        ...questData,
      };

      onQuestCreated(quest, character);

    } catch (err) {
      console.error("Failed to create quest:", err);
      setError("An error occurred while creating the quest. The topic might be too obscure, or there could be a service issue. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto bg-[#202020] p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl border border-gray-700 relative">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-amber-200">Quest Design</h2>
            <p className="text-gray-400">Chart a new course for your learning.</p>
          </div>
          <button onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex-shrink-0">
            Back
          </button>
        </div>

        {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-lg mb-6">{error}</div>}

        <div className="mt-8 space-y-6">
            <div>
                <h3 className="text-2xl font-semibold text-amber-300 mb-2">{questPrompt}</h3>
                <p className="text-gray-400">Describe what you want to learn, and we will find the perfect historical mentor to guide you on a custom quest.</p>
            </div>
            <div>
                <label htmlFor="learning-objective" className="block text-sm font-medium text-gray-300 mb-2">Learning Objective</label>
                <textarea id="learning-objective" value={learningObjective} onChange={(e) => setLearningObjective(e.target.value)} placeholder="e.g., 'The principles of flight', 'The basics of stoic philosophy', 'How black holes are formed'" rows={4} className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 text-lg" />
            </div>
            <button onClick={handleCreateQuest} disabled={!learningObjective.trim()} className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-3 px-6 rounded-lg transition-colors text-lg disabled:opacity-50">
                Design My Quest
            </button>
        </div>
      </div>
    </div>
  );
};

export default QuestCreator;
