
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, character: Character) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectCharacter(character);
    }
  };

  return (
    <div className="grid w-full max-w-6xl mx-auto grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 sm:gap-6 px-2 sm:px-0">
      <AddCharacterCard onClick={onStartCreation} />
      {characters.map((character) => {
        const isCustom = character.id.startsWith('custom_');
        return (
          <div
            key={character.id}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-gray-800/70 border border-gray-700/50 shadow-lg transition-transform duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
            onClick={() => onSelectCharacter(character)}
            onKeyDown={(event) => handleKeyDown(event, character)}
            role="button"
            tabIndex={0}
          >
            {isCustom && (
              <button
                onClick={(e) => handleDelete(e, character.id)}
                className="absolute left-3 top-3 z-10 rounded-full bg-red-800/70 p-2 text-white opacity-0 transition-all duration-300 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-400 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:opacity-100"
                aria-label={`Delete ${character.name}`}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
            <div className="relative h-56 w-full overflow-hidden sm:h-64">
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 filter grayscale group-hover:scale-105 group-hover:grayscale-0 group-focus-within:scale-105 group-focus-within:grayscale-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-300 group-hover:opacity-90 group-focus-within:opacity-90" />
              <div className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-sm font-semibold text-black shadow-lg opacity-90 transition duration-300 group-hover:-translate-y-1 group-hover:opacity-100 group-focus-within:-translate-y-1 group-focus-within:opacity-100">
                Speak
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-3 p-4 text-left text-white">
              <div>
                <h3 className="text-2xl font-bold text-amber-200">{character.name}</h3>
                <p className="text-sm text-gray-300 italic">{character.title}</p>
                <p className="mt-3 text-sm text-gray-300 md:hidden" style={{ maxHeight: '4.5rem', overflow: 'hidden' }}>
                  {character.bio}
                </p>
              </div>
              <div className="hidden text-sm text-gray-300 md:block">
                <div className="overflow-hidden border-t border-gray-700/40 pt-3 transition-all duration-500 ease-in-out max-h-0 group-hover:max-h-64 group-focus-within:max-h-64">
                  <div className="max-h-48 space-y-3 overflow-y-auto pr-1">
                    <p className="text-gray-400">{character.bio}</p>
                    <div className="space-y-1 text-xs text-gray-400">
                      <p><strong className="font-semibold text-gray-200">Timeframe:</strong> {character.timeframe}</p>
                      <p><strong className="font-semibold text-gray-200">Expertise:</strong> {character.expertise}</p>
                      <p><strong className="font-semibold text-gray-200">Passion:</strong> {character.passion}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CharacterSelector;