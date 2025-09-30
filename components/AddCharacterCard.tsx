
import React from 'react';

interface AddCharacterCardProps {
  onClick: () => void;
}

const AddCharacterCard: React.FC<AddCharacterCardProps> = ({ onClick }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Create a custom ancient"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="group relative flex aspect-[3/4] w-full max-w-sm cursor-pointer select-none flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-700 bg-gray-900/60 p-6 text-center text-gray-400 shadow-lg transition-all duration-300 focus-visible:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:max-w-none sm:aspect-auto sm:h-[24rem] sm:p-8 md:h-[26rem]"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/40 via-gray-900/20 to-gray-900/60 opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-16 w-16 text-amber-300 transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <div className="relative mt-4 space-y-2">
        <h3 className="text-xl font-bold text-gray-200 sm:text-2xl">Bring a new mind to the school.</h3>
        <p className="text-sm text-gray-400 sm:text-base">
          Craft your own guide and tailor their knowledge to your next quest.
        </p>
      </div>
      <span className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-200 transition-all duration-300 group-hover:bg-amber-500/20">
        Tap to begin
      </span>
    </div>
  );
};

export default AddCharacterCard;