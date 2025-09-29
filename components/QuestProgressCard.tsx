import React from 'react';
import type { Quest } from '../types';

interface QuestProgressCardProps {
  quest: Quest;
  completed: boolean;
  onComplete: () => void;
}

const QuestProgressCard: React.FC<QuestProgressCardProps> = ({ quest, completed, onComplete }) => {
  return (
    <div className="animate-fade-in bg-amber-900/40 border border-amber-800/80 rounded-xl p-4 text-left shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">Active Quest</p>
      <h3 className="mt-1 text-lg font-bold text-amber-100">{quest.title}</h3>
      <p className="mt-3 text-sm text-amber-100/80 leading-relaxed">{quest.objective}</p>

      {completed ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-emerald-300 text-sm font-semibold">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Quest Completed</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 w-full rounded-lg bg-amber-500/90 py-2 text-sm font-semibold text-black transition-colors duration-200 hover:bg-amber-400"
        >
          Mark Quest Complete
        </button>
      )}
    </div>
  );
};

export default QuestProgressCard;
