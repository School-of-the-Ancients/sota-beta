
import React, { useState, useEffect, useMemo } from 'react';
import type { SavedConversation } from '../types';

const HISTORY_KEY = 'school-of-the-ancients-history';

const loadConversations = (): SavedConversation[] => {
  try {
    const rawHistory = localStorage.getItem(HISTORY_KEY);
    return rawHistory ? JSON.parse(rawHistory) : [];
  } catch (error) {
    console.error("Failed to load conversation history:", error);
    return [];
  }
};

const deleteConversationFromLocalStorage = (id: string) => {
  try {
    let history = loadConversations();
    history = history.filter(c => c.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to delete conversation:", error);
  }
};

interface HistoryViewProps {
  onBack: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack }) => {
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);

  useEffect(() => {
    setHistory(loadConversations());
  }, []);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      deleteConversationFromLocalStorage(id);
      setHistory(loadConversations());
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
      }
    }
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  if (selectedConversation) {
    return (
      <div className="max-w-4xl mx-auto bg-[#202020] p-6 rounded-2xl shadow-2xl border border-gray-700 animate-fade-in">
        <div className="flex items-center mb-4">
          <img src={selectedConversation.portraitUrl} alt={selectedConversation.characterName} className="w-16 h-16 rounded-full mr-4 border-2 border-amber-300" />
          <div>
            <h2 className="text-2xl font-bold text-amber-200">Conversation with {selectedConversation.characterName}</h2>
            <p className="text-gray-400 text-sm">{new Date(selectedConversation.timestamp).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-[60vh] overflow-y-auto space-y-4">
          {selectedConversation.transcript.map((turn, index) => (
            <div key={index} className={`p-3 rounded-lg border ${turn.speaker === 'user' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-teal-900/20 border-teal-800/50'}`}>
              <p className={`font-bold text-sm mb-1 ${turn.speaker === 'user' ? 'text-blue-300' : 'text-teal-300'}`}>{turn.speakerName}</p>
              <p className="text-gray-300 whitespace-pre-wrap">{turn.text}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setSelectedConversation(null)} className="mt-6 bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 px-6 rounded-lg transition-colors">
          Back to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-amber-200">Conversation History</h2>
        <button onClick={onBack} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          Back to Ancients
        </button>
      </div>
      {sortedHistory.length === 0 ? (
        <p className="text-center text-gray-400 bg-gray-800/50 p-8 rounded-lg">No saved conversations yet.</p>
      ) : (
        <div className="space-y-4">
          {sortedHistory.map((conv) => (
            <div key={conv.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center">
                <img src={conv.portraitUrl} alt={conv.characterName} className="w-12 h-12 rounded-full mr-4" />
                <div>
                  <p className="font-bold text-lg text-amber-300">{conv.characterName}</p>
                  <p className="text-sm text-gray-400">{new Date(conv.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedConversation(conv)} className="bg-blue-800/70 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">View</button>
                <button onClick={() => handleDelete(conv.id)} className="bg-red-800/70 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;