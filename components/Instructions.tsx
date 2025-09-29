
import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto mb-12 p-6 bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg text-left animate-fade-in">
      <h2 className="text-2xl font-bold text-amber-300 mb-4 text-center">Welcome to the School of the Ancients</h2>
      <p className="text-gray-400 mb-6 text-center">
        Engage in real-time voice conversations with legendary minds from history. Here’s how to begin your journey:
      </p>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-600">
          <h3 className="font-semibold text-lg text-amber-200 mb-2">1. Start a Conversation</h3>
          <p className="text-gray-300">
            Select an ancient from the gallery below or create your own. Grant microphone access when prompted to begin speaking. You can also type messages if you prefer.
          </p>
        </div>

        <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-600">
          <h3 className="font-semibold text-lg text-amber-200 mb-2">2. Use Special Abilities</h3>
          <p className="text-gray-300">
            This is more than a chat. You can command the environment like a "Matrix Operator":
          </p>
          <ul className="list-disc list-inside mt-2 space-y-2 text-gray-400">
            <li>
              <span className="font-semibold text-teal-300">Change Scenery:</span> Say "<i className="text-teal-400">Operator, Take me to the Roman Forum</i>" to transport yourself to a new location.
            </li>
            <li>
              <span className="font-semibold text-teal-300">Display Artifacts:</span> Say "<i className="text-teal-400">Operator, Show me a diagram of Leonardo's flying machine</i>" to see a visual aid.
            </li>
          </ul>
        </div>
      </div>
      
      <p className="text-center mt-6 text-amber-200 font-semibold">
        Select an ancient below to begin your lesson.
      </p>
    </div>
  );
};

export default Instructions;