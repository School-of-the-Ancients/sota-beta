
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

const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  characters,
  onSelectCharacter,
  onStartCreation,
  onDeleteCharacter,
}) => {
  const handleDelete = (event: React.MouseEvent, characterId: string) => {
    event.stopPropagation();
    onDeleteCharacter(characterId);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, character: Character) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectCharacter(character);
    }
  };

  return (
    <section aria-label="Select an ancient to converse with" className="mx-auto w-full max-w-6xl">
      <div className="grid grid-cols-1 gap-4 px-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6 md:gap-8 sm:px-0">
        <AddCharacterCard onClick={onStartCreation} />
        {characters.map(character => {
          const isCustom = character.id.startsWith('custom_');
          return (
            <div
              key={character.id}
              role="button"
              tabIndex={0}
              aria-label={`Speak with ${character.name}`}
              onClick={() => onSelectCharacter(character)}
              onKeyDown={event => handleCardKeyDown(event, character)}
              className="group relative flex aspect-[3/4] w-full cursor-pointer select-none flex-col overflow-hidden rounded-2xl border border-gray-700/70 bg-gray-900/70 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 focus-visible:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:aspect-[3/4]"
            >
              {isCustom && (
                <button
                  onClick={event => handleDelete(event, character.id)}
                  className="absolute left-3 top-3 z-20 rounded-full bg-red-800/70 p-2 text-white opacity-100 transition-all duration-300 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:opacity-0 sm:-translate-x-2 sm:group-hover:translate-x-0 sm:group-hover:opacity-100"
                  aria-label={`Delete ${character.name}`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
              <img
                src={character.portraitUrl}
                alt={character.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70" />
              <div className="relative mt-auto flex h-full flex-col justify-end p-4 text-left text-white sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-bold text-amber-200 sm:text-3xl">{character.name}</h3>
                    <p className="mt-1 text-sm italic text-gray-200/90 sm:text-base">{character.title}</p>
                  </div>
                  <div className="hidden sm:inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-black shadow-md transition-opacity duration-300 sm:opacity-0 sm:group-hover:opacity-100">
                    Speak
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-xs text-gray-200 sm:max-h-0 sm:overflow-hidden sm:pr-2 sm:text-sm sm:transition-[max-height] sm:duration-500 sm:ease-in-out sm:group-hover:max-h-64">
                  <p className="leading-relaxed text-gray-200/90">
                    {character.bio}
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-[0.7rem] uppercase tracking-wide text-gray-300/80 sm:text-xs">
                    <p>
                      <span className="font-semibold text-gray-100">Timeframe:</span> {character.timeframe}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-100">Expertise:</span> {character.expertise}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-100">Passion:</span> {character.passion}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CharacterSelector;