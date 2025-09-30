
import React from 'react';

interface AddCharacterCardProps {
  onClick: () => void;
}

const AddCharacterCard: React.FC<AddCharacterCardProps> = ({ onClick }) => {
  return (
    <div
      className="w-full sm:w-72 h-60 sm:h-96 cursor-pointer rounded-xl shadow-lg bg-gray-800/60 border-2 border-dashed border-gray-600 hover:border-amber-400 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center justify-center text-gray-300 hover:text-amber-300 p-6 text-center"
      onClick={onClick}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 sm:h-24 sm:w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <h3 className="text-xl sm:text-2xl font-bold leading-snug">
        Bring a new mind to the school.
      </h3>

    </div>
  );
};

export default AddCharacterCard;