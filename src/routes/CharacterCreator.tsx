import React from 'react';
import type { Character } from '../../types';
import CharacterCreator from '../../components/CharacterCreator';

interface CharacterCreatorRouteProps {
  onCharacterCreated: (character: Character) => void;
  onBack: () => void;
}

const CharacterCreatorRoute: React.FC<CharacterCreatorRouteProps> = ({ onCharacterCreated, onBack }) => {
  return <CharacterCreator onCharacterCreated={onCharacterCreated} onBack={onBack} />;
};

export default CharacterCreatorRoute;
