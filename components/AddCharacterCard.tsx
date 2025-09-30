
import React from 'react';

interface AddCharacterCardProps {
  onClick: () => void;
  className?: string;
}

const AddCharacterCard: React.FC<AddCharacterCardProps> = ({ onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center justify-center text-center text-gray-300 hover:text-amber-200 transition-all duration-300 border-2 border-dashed border-gray-600 hover:border-amber-400 bg-gray-800/60 hover:bg-gray-800/80 rounded-2xl shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 w-[85vw] sm:w-72 md:w-80 h-[22rem] sm:h-96 px-6 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-20 w-20 sm:h-24 sm:w-24 mb-4 text-amber-300 group-hover:scale-110 transition-transform"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <h3 className="text-xl sm:text-2xl font-bold leading-relaxed">
        Bring a new mind to the school.
      </h3>
      <p className="mt-3 text-sm text-gray-400">
        Craft a persona with its own expertise, passions, and voice.
      </p>
    </button>
  );
};

export default AddCharacterCard;