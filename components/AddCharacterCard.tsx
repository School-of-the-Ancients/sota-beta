
import React from 'react';

interface AddCharacterCardProps {
  onClick: () => void;
}

const AddCharacterCard: React.FC<AddCharacterCardProps> = ({ onClick }) => {
  return (
    <div
      className="group flex min-h-[18rem] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-600 bg-gray-800/40 p-6 text-center text-gray-400 shadow-lg transition-all duration-300 hover:border-amber-400 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:min-h-[20rem]"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-20 w-20 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <h3 className="text-xl font-bold sm:text-2xl">Bring a new mind to the school.</h3>
      <p className="mt-3 max-w-xs text-sm text-gray-400 sm:text-base">
        Craft a custom mentor with your own portrait, voice, and expertise.
      </p>
    </div>
  );
};

export default AddCharacterCard;