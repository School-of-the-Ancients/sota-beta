
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 xl:gap-8 w-full px-1 sm:px-0">
      <AddCharacterCard onClick={onStartCreation} />
      {characters.map((character) => {
        const isCustom = character.id.startsWith('custom_');
        return (
          <div
            key={character.id}
            className="group relative w-full h-[26rem] sm:h-96 cursor-pointer overflow-hidden rounded-xl shadow-lg bg-gray-800/80 border border-gray-700 hover:border-amber-400 transition-all duration-300 hover:-translate-y-1"
            onClick={() => onSelectCharacter(character)}
          >
            {isCustom && (
              <button
                onClick={(e) => handleDelete(e, character.id)}
                className="absolute top-2 left-2 z-10 p-2 rounded-full bg-red-800/60 hover:bg-red-700 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 -translate-x-1 md:-translate-x-2 md:group-hover:translate-x-0"
                aria-label={`Delete ${character.name}`}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
            <img
              src={character.portraitUrl}
              alt={character.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 filter grayscale md:group-hover:grayscale-0"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-colors duration-300 md:group-hover:from-black/80" />
            <div className="absolute bottom-0 left-0 p-3 sm:p-4 text-white w-full">
              <h3 className="text-lg sm:text-2xl font-bold text-amber-200">{character.name}</h3>
              <p className="text-xs sm:text-sm text-gray-300 italic mb-2">{character.title}</p>

              <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-40 md:max-h-0 md:group-hover:max-h-64">
                <div className="overflow-y-auto max-h-32 md:max-h-64 pr-1 sm:pr-2">
                  <p className="text-xs sm:text-sm text-gray-300/90 pt-2 border-t border-gray-700/50 mb-3 leading-relaxed">
                    {character.bio}
                  </p>

                  <div className="text-[0.7rem] sm:text-xs text-gray-300 space-y-1 mb-3">
                    <p><strong className="font-semibold text-gray-300">Timeframe:</strong> {character.timeframe}</p>
                    <p><strong className="font-semibold text-gray-300">Expertise:</strong> {character.expertise}</p>
                    <p><strong className="font-semibold text-gray-300">Passion:</strong> {character.passion}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:flex absolute top-4 right-4 bg-amber-400 text-black px-3 py-1 rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-y-2 group-hover:translate-y-0">
              Speak
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CharacterSelector;