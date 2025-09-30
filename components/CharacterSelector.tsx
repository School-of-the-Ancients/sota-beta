
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
    <div className="w-full">
      <div className="flex flex-nowrap sm:flex-wrap justify-start sm:justify-center gap-4 md:gap-8 overflow-x-auto sm:overflow-visible pb-6 sm:pb-0 -mx-4 sm:mx-0 px-4 sm:px-0 snap-x snap-mandatory">
        <AddCharacterCard onClick={onStartCreation} className="flex-shrink-0 snap-center" />
        {characters.map((character) => {
          const isCustom = character.id.startsWith('custom_');
          return (
            <div
              key={character.id}
              className="group relative flex-shrink-0 snap-center w-[82vw] sm:w-72 md:w-80 h-[24rem] sm:h-96 cursor-pointer overflow-hidden rounded-2xl shadow-2xl bg-gray-900/70 border border-gray-700 hover:border-amber-400 transition-all duration-300 hover:-translate-y-1 backdrop-blur"
              onClick={() => onSelectCharacter(character)}
            >
              {isCustom && (
                <button
                  onClick={(e) => handleDelete(e, character.id)}
                  className="absolute top-2 left-2 z-10 p-2 rounded-full bg-red-800/70 hover:bg-red-700 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 md:-translate-x-2 md:group-hover:translate-x-0 shadow-lg"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20 transition-opacity duration-300 group-hover:opacity-90" />
              <div className="absolute bottom-0 left-0 p-4 sm:p-5 text-white w-full space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h3 className="text-2xl font-bold text-amber-200">{character.name}</h3>
                  <span className="text-xs uppercase tracking-wide text-amber-300/80 bg-black/40 px-2 py-1 rounded-full w-max">
                    {character.timeframe}
                  </span>
                </div>
                <p className="text-sm text-gray-300 italic">{character.title}</p>

                <div className="overflow-hidden transition-all duration-500 ease-in-out max-h-32 md:max-h-0 md:group-hover:max-h-64">
                  <div className="overflow-y-auto max-h-48 pr-1 md:pr-2">
                    <p className="text-sm text-gray-300/90 border-t border-gray-700/50 pt-3 mt-3 leading-relaxed">
                      {character.bio}
                    </p>

                    <div className="text-xs text-gray-400 space-y-1 mt-3">
                      <p><strong className="font-semibold text-gray-200">Expertise:</strong> {character.expertise}</p>
                      <p><strong className="font-semibold text-gray-200">Passion:</strong> {character.passion}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-amber-400 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 md:-translate-y-2 md:group-hover:translate-y-0">
                Speak
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CharacterSelector;