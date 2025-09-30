
import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div className="mx-auto mb-12 w-full max-w-4xl rounded-2xl border border-gray-700 bg-gray-800/60 p-5 text-left shadow-lg backdrop-blur-sm animate-fade-in sm:p-8">
      <h2 className="text-xl font-bold text-amber-200 sm:text-2xl">Welcome to the School of the Ancients</h2>
      <p className="mt-3 text-sm text-gray-400 sm:text-base">
        Engage in real-time voice conversations with legendary minds from history. Here's how to begin your journey:
      </p>
      <div className="mt-6 grid gap-4 sm:gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-600 bg-gray-900/60 p-4">
          <h3 className="mb-2 text-lg font-semibold text-amber-300">1. Start a Conversation</h3>
          <p className="text-sm text-gray-300 sm:text-base">
            Select an ancient from the gallery below or create your own. Grant microphone access when prompted to begin speaking. You can also type messages if you prefer.
          </p>
        </div>
        <div className="rounded-xl border border-gray-600 bg-gray-900/60 p-4">
          <h3 className="mb-2 text-lg font-semibold text-amber-300">2. Command Your World</h3>
          <p className="mb-3 text-sm text-gray-300 sm:text-base">
            This is more than a chat. You can command the environment like a "Matrix Operator":
          </p>
          <ul className="space-y-2 text-sm text-gray-300 sm:text-base">
            <li className="rounded-lg bg-gray-800/60 p-3">
              <strong className="text-teal-300">Change Scenery:</strong> Say <span className="italic text-teal-200">"Operator, Take me to the Roman Forum"</span> to transport yourself to a new location.
            </li>
            <li className="rounded-lg bg-gray-800/60 p-3">
              <strong className="text-teal-300">Display Artifacts:</strong> Say <span className="italic text-teal-200">"Operator, Show me a diagram of a flying machine"</span> to see a visual aid.
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-gray-600 bg-gray-900/60 p-4">
          <h3 className="mb-2 text-lg font-semibold text-amber-300">3. Review & Study</h3>
          <p className="text-sm text-gray-300 sm:text-base">
            Every conversation is automatically saved. Visit your <strong className="text-amber-200">Conversation History</strong> to review transcripts, see AI-generated summaries, and download a complete Study Guide.
          </p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm font-semibold text-amber-200 sm:text-base">
        Select an ancient below to begin your lesson.
      </p>
    </div>
  );
};

export default Instructions;
