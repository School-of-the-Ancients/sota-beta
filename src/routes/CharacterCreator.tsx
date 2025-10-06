import React from 'react';
import { useNavigate } from 'react-router-dom';

import CharacterCreator from '../components/CharacterCreator';
import links from '../lib/links';
import { useAppState } from '../state/AppStateContext';
import type { Character } from '../types';

const CharacterCreatorRoute: React.FC = () => {
  const navigate = useNavigate();
  const { addCustomCharacter, selectCharacter } = useAppState();

  const handleCharacterCreated = (character: Character) => {
    addCustomCharacter(character);
    selectCharacter(character);
    navigate(links.conversation(character.id));
  };

  return (
    <CharacterCreator
      onCharacterCreated={handleCharacterCreated}
      onBack={() => navigate('/')}
    />
  );
};

export default CharacterCreatorRoute;
