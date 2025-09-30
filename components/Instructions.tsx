
import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto mb-10 sm:mb-12 bg-gray-800/60 p-4 sm:p-6 rounded-xl border border-gray-700 text-left animate-fade-in space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-amber-200">Welcome to the School of the Ancients</h2>
      <p className="text-sm sm:text-base text-gray-400">
        Engage in real-time voice conversations with legendary minds from history. Here's how to begin your journey:
      </p>
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="bg-gray-900/60 p-4 sm:p-5 rounded-lg border border-gray-600 shadow-sm">
          <h3 className="font-bold text-lg text-amber-300 mb-2">1. Start a Conversation</h3>
          <p className="text-sm sm:text-base text-gray-300">
            Select an ancient from the gallery below or create your own. Grant microphone access when prompted to begin speaking. You can also type messages if you prefer.
          </p>
        </div>
        <div className="bg-gray-900/60 p-4 sm:p-5 rounded-lg border border-gray-600 shadow-sm">
          <h3 className="font-bold text-lg text-amber-300 mb-2">2. Command Your World</h3>
          <p className="text-sm sm:text-base text-gray-300 mb-3">
            This is more than a chat. You can command the environment like a "Matrix Operator":
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-300">
            <li>
              <strong className="text-teal-300">Change Scenery:</strong> Say <span className="italic text-teal-200">"Operator, Take me to the Roman Forum"</span> to transport yourself to a new location.
            </li>
            <li>
              <strong className="text-teal-300">Display Artifacts:</strong> Say <span className="italic text-teal-200">"Operator, Show me a diagram of a flying machine"</span> to see a visual aid.
            </li>
          </ul>
        </div>
        <div className="bg-gray-900/60 p-4 sm:p-5 rounded-lg border border-gray-600 shadow-sm">
          <h3 className="font-bold text-lg text-amber-300 mb-2">3. Review & Study</h3>
          <p className="text-sm sm:text-base text-gray-300">
            Every conversation is automatically saved. Visit your <strong className="text-amber-200">Conversation History</strong> to review transcripts, see AI-generated summaries, and download a complete Study Guide.
          </p>
        </div>
      </div>
      <p className="text-center text-amber-200 font-semibold text-sm sm:text-base pt-2">
        Select an ancient below to begin your lesson.
      </p>
    </div>
  );
};

export default Instructions;
