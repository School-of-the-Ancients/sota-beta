
import React from 'react';

const Instructions: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto mb-12 bg-gray-800/50 p-6 rounded-lg border border-gray-700 text-left animate-fade-in">
      <h2 className="text-2xl font-bold text-amber-200 mb-2">Welcome to the School of the Ancients</h2>
      <p className="text-gray-400 mb-6">
        Engage in real-time voice conversations with legendary minds from history. Here's how to begin your journey:
      </p>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
          <h3 className="font-bold text-lg text-amber-300 mb-2">1. Start a Conversation</h3>
          <p className="text-gray-300">
            Select an ancient from the gallery below or create your own. Grant microphone access when prompted to begin speaking. You can also type messages if you prefer.
          </p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
          <h3 className="font-bold text-lg text-amber-300 mb-2">2. Command Your World</h3>
          <p className="text-gray-300 mb-3">
            This is more than a chat. You can command the environment like a "Matrix Operator":
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>
              <strong className="text-teal-300">Change Scenery:</strong> Say <span className="italic text-teal-200">"Operator, Take me to the Roman Forum"</span> to transport yourself to a new location.
            </li>
            <li>
              <strong className="text-teal-300">Display Artifacts:</strong> Say <span className="italic text-teal-200">"Operator, Show me a diagram of a flying machine"</span> to see a visual aid.
            </li>
          </ul>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
          <h3 className="font-bold text-lg text-amber-300 mb-2">3. Review & Study</h3>
          <p className="text-gray-300">
            Every conversation is automatically saved. Visit your <strong className="text-amber-200">Conversation History</strong> to review transcripts, see AI-generated summaries, and download a complete Study Guide.
          </p>
        </div>
      </div>
      <p className="text-center text-amber-200 font-semibold mt-6">
        Select an ancient below to begin your lesson.
      </p>
    </div>
  );
};

export default Instructions;
