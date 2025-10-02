
import React, { useState, useMemo, useEffect } from 'react';
import type { SavedConversation, ConversationTurn } from '../types';
import DownloadIcon from './icons/DownloadIcon';

const ArtifactDisplay: React.FC<{ artifact: NonNullable<ConversationTurn['artifact']> }> = ({ artifact }) => {
  if (!artifact.imageUrl || artifact.loading) return null; // Don't show incomplete artifacts in history
  return (
    <div className="mt-2 border-t border-teal-800/50 pt-3">
      <p className="text-sm font-semibold text-teal-300 mb-2">{artifact.name}</p>
      <img src={artifact.imageUrl} alt={artifact.name} className="w-full rounded-lg" />
    </div>
  );
};


interface HistoryViewProps {
  onBack: () => void;
  history: SavedConversation[];
  onDeleteConversation: (id: string) => void | Promise<void>;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onBack, history, onDeleteConversation }) => {
  const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);

  useEffect(() => {
    if (!selectedConversation) return;
    const updated = history.find((conv) => conv.id === selectedConversation.id) ?? null;
    if (!updated) {
      setSelectedConversation(null);
    } else if (updated !== selectedConversation) {
      setSelectedConversation(updated);
    }
  }, [history, selectedConversation]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      void onDeleteConversation(id);
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
      }
    }
  };

  const handleDownload = () => {
    if (!selectedConversation) return;
  
    let content = `Study Guide: Conversation with ${selectedConversation.characterName}\n`;
    content += `Date: ${new Date(selectedConversation.timestamp).toLocaleString()}\n`;
    content += `==================================================\n\n`;
  
    if (selectedConversation.summary) {
      content += `SUMMARY\n---------------------\n`;
      content += `${selectedConversation.summary.overview}\n\n`;
      content += `Key Takeaways:\n`;
      selectedConversation.summary.takeaways.forEach(item => {
        content += `- ${item}\n`;
      });
      content += `\n==================================================\n\n`;
    }
  
    content += `FULL TRANSCRIPT\n---------------------\n\n`;
    selectedConversation.transcript.forEach(turn => {
      content += `${turn.speakerName}:\n${turn.text}\n\n`;
      if (turn.artifact && turn.artifact.imageUrl && !turn.artifact.loading) {
        content += `[Artifact Displayed: ${turn.artifact.name}]\n\n`;
      }
    });
  
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const characterNameForFile = selectedConversation.characterName.replace(/\s+/g, '-');
    const dateForFile = new Date(selectedConversation.timestamp).toISOString().split('T')[0];
    link.download = `SotA-Guide-${characterNameForFile}-${dateForFile}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => b.timestamp - a.timestamp);
  }, [history]);

  if (selectedConversation) {
    return (
      <div className="max-w-4xl mx-auto bg-cover bg-center bg-[#202020] p-4 md:p-6 rounded-2xl shadow-2xl border border-gray-700 animate-fade-in relative"
        style={{ backgroundImage: selectedConversation.environmentImageUrl ? `url(${selectedConversation.environmentImageUrl})` : 'none' }}
      >
        {selectedConversation.environmentImageUrl && <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-2xl"></div>}
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <img src={selectedConversation.portraitUrl} alt={selectedConversation.characterName} className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mr-4 border-2 border-amber-300" />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-amber-200">Conversation with {selectedConversation.characterName}</h2>
              <p className="text-gray-400 text-sm">{new Date(selectedConversation.timestamp).toLocaleString()}</p>
            </div>
          </div>
          
          {selectedConversation.questTitle && (
            <div
              className={`mb-4 p-4 rounded-lg border ${selectedConversation.questAssessment?.passed ? 'bg-emerald-900/30 border-emerald-700' : 'bg-amber-900/30 border-amber-700'}`}
            >
              <p className="text-xs uppercase tracking-wide text-gray-300 font-semibold mb-1">Quest Review</p>
              <h3 className="text-lg font-bold text-amber-200">{selectedConversation.questTitle}</h3>
              {selectedConversation.questAssessment ? (
                <>
                  <p className="mt-2 text-gray-200">{selectedConversation.questAssessment.summary}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedConversation.questAssessment.evidence.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-emerald-200 uppercase tracking-wide mb-1">Highlights</p>
                        <ul className="list-disc list-inside text-sm text-gray-100 space-y-1">
                          {selectedConversation.questAssessment.evidence.map(item => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedConversation.questAssessment.improvements.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-amber-200 uppercase tracking-wide mb-1">Next Steps</p>
                        <ul className="list-disc list-inside text-sm text-amber-100 space-y-1">
                          {selectedConversation.questAssessment.improvements.map(item => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-2 text-gray-300 text-sm">Quest selected, awaiting knowledge check results.</p>
              )}
            </div>
          )}

          {selectedConversation.summary && (
            <div className="mb-4 bg-gray-900/70 p-4 rounded-lg border border-amber-800">
              <h3 className="text-lg font-bold text-amber-300 mb-2">Key Takeaways</h3>
              <p className="text-gray-300 mb-3">{selectedConversation.summary.overview}</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {selectedConversation.summary.takeaways.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}

          <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 max-h-[60vh] overflow-y-auto space-y-4">
            {selectedConversation.transcript.map((turn, index) => (
              <div key={index} className={`p-3 rounded-lg border ${turn.speaker === 'user' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-teal-900/20 border-teal-800/50'}`}>
                <p className={`font-bold text-sm mb-1 ${turn.speaker === 'user' ? 'text-blue-300' : 'text-teal-300'}`}>{turn.speakerName}</p>
                <p className="text-gray-300 whitespace-pre-wrap">{turn.text}</p>
                {turn.artifact && <ArtifactDisplay artifact={turn.artifact} />}
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button onClick={() => setSelectedConversation(null)} className="bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 px-6 rounded-lg transition-colors">
              Back to History
            </button>
            <button onClick={handleDownload} className="flex items-center justify-center gap-2 bg-blue-800/70 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
              <DownloadIcon className="w-5 h-5" />
              Download Study Guide
            </button>
          </div>
        </div>
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
            <div key={conv.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-center self-start sm:self-center">
                <img src={conv.portraitUrl} alt={conv.characterName} className="w-12 h-12 rounded-full mr-4" />
                <div>
                  <p className="font-bold text-lg text-amber-300">{conv.characterName}</p>
                  <p className="text-sm text-gray-400">{new Date(conv.timestamp).toLocaleString()}</p>
                  {conv.questTitle && (
                    <p className="text-xs text-gray-400 mt-1">
                      Quest: <span className="text-gray-200">{conv.questTitle}</span>{' '}
                      {conv.questAssessment && (
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${conv.questAssessment.passed ? 'bg-emerald-700/40 text-emerald-200' : 'bg-red-700/40 text-red-200'}`}>
                          {conv.questAssessment.passed ? 'Completed' : 'Needs Review'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-center">
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
