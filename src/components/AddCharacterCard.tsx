
import React from 'react';

interface AddCharacterCardProps {
  onClick: () => void;
}

const AddCharacterCard: React.FC<AddCharacterCardProps> = ({ onClick }) => {
  return (
    <div
      className="w-72 h-96 cursor-pointer rounded-lg shadow-lg bg-gray-800/50 border-2 border-dashed border-gray-600 hover:border-amber-400 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center text-gray-400 hover:text-amber-300"
      onClick={onClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <h3 className="text-2xl font-bold">Bring a new mind to the school.</h3>
     
    </div>
  );
};

export default AddCharacterCard;