
import React, { useState, useEffect } from 'react';
import type { Character } from './types';
import CharacterSelector from './components/CharacterSelector';
import ConversationView from './components/ConversationView';
import HistoryView from './components/HistoryView';
import { CHARACTERS } from './constants';

const App: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [view, setView] = useState<'selector' | 'conversation' | 'history'>('selector');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const characterId = urlParams.get('character');
    if (characterId) {
      const characterFromUrl = CHARACTERS.find(c => c.id === characterId);
      if (characterFromUrl) {
        setSelectedCharacter(characterFromUrl);
        setView('conversation');
      }
    }
  }, []);

  const handleSelectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setView('conversation');
    const url = new URL(window.location.href);
    url.searchParams.set('character', character.id);
    window.history.pushState({}, '', url);
  };

  const handleEndConversation = () => {
    setSelectedCharacter(null);
    setView('selector');
    window.history.pushState({}, '', window.location.pathname);
  };

  const renderContent = () => {
    switch (view) {
      case 'conversation':
        return selectedCharacter ? (
          <ConversationView character={selectedCharacter} onEndConversation={handleEndConversation} />
        ) : null;
      case 'history':
        return <HistoryView onBack={() => setView('selector')} />;
      case 'selector':
      default:
        return (
          <div className="text-center">
            <CharacterSelector characters={CHARACTERS} onSelectCharacter={handleSelectCharacter} />
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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#2b2b2b] text-gray-200 font-serif p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-amber-300 tracking-wider" style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}>
          School of the Ancients
        </h1>
        <p className="text-gray-400 mt-2 text-lg">Learn something today.</p>
      </header>
      <main className="max-w-7xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
