
import React from 'react';
import type { Character } from '../types';
import AddCharacterCard from './AddCharacterCard';
import TrashIcon from './icons/TrashIcon';

interface CharacterSelectorProps {
  characters: Character[];
  onSelectCharacter: (character: Character) => void;
  onStartCreation: () => void;
  onDeleteCharacter: (characterId: string) => void;
}

const CharacterSelector: React.FC<CharacterSelectorProps> = ({ characters, onSelectCharacter, onStartCreation, onDeleteCharacter }) => {
  const handleDelete = (e: React.MouseEvent, characterId: string) => {
    e.stopPropagation(); // Prevent card click
    onDeleteCharacter(characterId);
  };
  
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8">
      <AddCharacterCard onClick={onStartCreation} />
      {characters.map((character) => {
        const isCustom = character.id.startsWith('custom_');
        return (
          <div
            key={character.id}
            className="group relative w-full max-w-sm sm:w-72 h-96 cursor-pointer overflow-hidden rounded-lg shadow-lg bg-gray-800 border-2 border-transparent hover:border-amber-400 transition-all duration-300 transform hover:scale-105"
            onClick={() => onSelectCharacter(character)}
          >
            {isCustom && (
              <button
                onClick={(e) => handleDelete(e, character.id)}
                className="absolute top-2 left-2 z-10 p-2 rounded-full bg-red-800/60 hover:bg-red-700 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0"
                aria-label={`Delete ${character.name}`}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
            <img 
              src={character.portraitUrl} 
              alt={character.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 filter grayscale group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-colors duration-300 group-hover:bg-black/70" />
            <div className="absolute bottom-0 left-0 p-3 sm:p-4 text-white w-full">
              <h3 className="text-xl sm:text-2xl font-bold text-amber-200">{character.name}</h3>
              <p className="text-sm text-gray-300 italic mb-2">{character.title}</p>
              
              <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-0 group-hover:max-h-64">
                <div className="overflow-y-auto max-h-64 pr-2">
                  <p className="text-sm text-gray-400 pt-2 border-t border-gray-700/50 mb-3">
                    {character.bio}
                  </p>

                  <div className="text-xs text-gray-400 space-y-1 mb-3">
                    <p><strong className="font-semibold text-gray-300">Timeframe:</strong> {character.timeframe}</p>
                    <p><strong className="font-semibold text-gray-300">Expertise:</strong> {character.expertise}</p>
                    <p><strong className="font-semibold text-gray-300">Passion:</strong> {character.passion}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-amber-400 text-black px-3 py-1 rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-y-2 group-hover:translate-y-0">
              Speak
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CharacterSelector;