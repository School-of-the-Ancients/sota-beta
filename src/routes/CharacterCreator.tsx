import React from 'react';
import type { Character } from '../../types';
import CharacterCreator from '../../components/CharacterCreator';

interface CharacterCreatorRouteProps {
  onCharacterCreated: (character: Character) => void;
  onBack: () => void;
  apiKey: string | null;
}

const CharacterCreatorRoute: React.FC<CharacterCreatorRouteProps> = ({ onCharacterCreated, onBack, apiKey }) => {
  return <CharacterCreator onCharacterCreated={onCharacterCreated} onBack={onBack} apiKey={apiKey} />;
};

export default CharacterCreatorRoute;
