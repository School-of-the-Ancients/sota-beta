
import React, { useState, useEffect } from 'react';
import type { Character } from './types';
import CharacterSelector from './components/CharacterSelector';
import ConversationView from './components/ConversationView';
import HistoryView from './components/HistoryView';
import CharacterCreator from './components/CharacterCreator';
import { CHARACTERS } from './constants';
import Instructions from './components/Instructions';

const CUSTOM_CHARACTERS_KEY = 'school-of-the-ancients-custom-characters';

const App: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history' | 'creator'>('selector');
  const [customCharacters, setCustomCharacters] = useState<Character[]>([]);
  const [environmentImageUrl, setEnvironmentImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Load custom characters from local storage
    try {
      const storedCharacters = localStorage.getItem(CUSTOM_CHARACTERS_KEY);
      if (storedCharacters) {
        setCustomCharacters(JSON.parse(storedCharacters));
      }
    } catch (e) {
      console.error("Failed to load custom characters:", e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (characterId) {
      const allCharacters = [...customCharacters, ...CHARACTERS];
      const characterFromUrl = allCharacters.find(c => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
      }
    }
  }, []); // customCharacters dependency is intentionally omitted to avoid re-running on delete

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  };

  const handleCharacterCreated = (newCharacter: Character) => {
    const updatedCharacters = [newCharacter, ...customCharacters];
    setCustomCharacters(updatedCharacters);
    try {
      localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
    } catch (e) {
      console.error("Failed to save custom character:", e);
    }
    handleSelectCharacter(newCharacter);
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm('Are you sure you want to permanently delete this ancient?')) {
      const updatedCharacters = customCharacters.filter(c => c.id !== characterId);
      setCustomCharacters(updatedCharacters);
      try {
        localStorage.setItem(CUSTOM_CHARACTERS_KEY, JSON.stringify(updatedCharacters));
      } catch (e) {
        console.error("Failed to delete custom character:", e);
      }
    }
  };

  const handleEndConversation = () => {
    setSelectedCharacter(null);
    setView('selector');
    setEnvironmentImageUrl(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const renderContent = () => {
    switch (view) {
      case 'conversation':
        return selectedCharacter ? (
          <ConversationView 
            character={selectedCharacter} 
            onEndConversation={handleEndConversation} 
            environmentImageUrl={environmentImageUrl}
            onEnvironmentUpdate={setEnvironmentImageUrl}
          />
        ) : null;
      case 'history':
        return <HistoryView onBack={() => setView('selector')} />;
      case 'creator':
        return <CharacterCreator onCharacterCreated={handleCharacterCreated} onBack={() => setView('selector')} />;
      case 'selector':
      default:
        return (
          <div className="text-center">
            <Instructions />
            <CharacterSelector
              characters={[...customCharacters, ...CHARACTERS]}
              onSelectCharacter={handleSelectCharacter}
              onStartCreation={() => setView('creator')}
              onDeleteCharacter={handleDeleteCharacter}
            />
            <button
              onClick={() => setView('history')}
              className="mt-12 bg-gray-700 hover:bg-gray-600 text-amber-300 font-bold py-3 px-8 rounded-lg transition-colors duration-300 border border-gray-600"
            >
              View Conversation History
            </button>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen bg-[#1a1a1a]">
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 z-0"
        style={{ backgroundImage: environmentImageUrl ? `url(${environmentImageUrl})` : 'none' }}
      />
      {environmentImageUrl && <div className="absolute inset-0 bg-black/50 z-0" />}

      <div 
        className="relative z-10 min-h-screen flex flex-col text-gray-200 font-serif p-4 sm:p-6 lg:p-8"
        style={{ background: environmentImageUrl ? 'transparent' : 'linear-gradient(to bottom right, #1a1a1a, #2b2b2b)' }}
      >
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider" style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}>
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
        </header>
        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
