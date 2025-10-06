import React, { useEffect, useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  onClear: () => void;
  existingKey: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, onClear, existingKey }) => {
  const [inputValue, setInputValue] = useState(existingKey ?? '');
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue(existingKey ?? '');
      setHasSubmittedOnce(false);
    }
  }, [isOpen, existingKey]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setHasSubmittedOnce(true);
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    onSave(trimmed);
  };

  const handleClear = () => {
    onClear();
    setInputValue('');
  };

  if (!isOpen) {
    return null;
  }

  const showError = hasSubmittedOnce && !inputValue.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-gray-900/95 p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold text-amber-200">Connect your Gemini API key</h2>
        <p className="mt-2 text-sm text-gray-300">
          Each visitor brings their own Google Gemini API key to enable conversations, quest authoring, and visuals. Your key
          stays in your browser&apos;s local storage.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-gray-200">
              Gemini API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Paste your API key"
              className={`mt-1 w-full rounded-lg border bg-gray-800/70 px-4 py-3 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                showError ? 'border-red-500 focus:ring-red-400' : 'border-gray-700'
              }`}
              autoFocus
              autoComplete="off"
            />
            {showError && <p className="mt-2 text-sm text-red-400">Please enter an API key to continue.</p>}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {existingKey && (
              <button
                type="button"
                onClick={handleClear}
                className="order-2 rounded-lg border border-red-500/60 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 sm:order-1"
              >
                Remove key
              </button>
            )}
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-700/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-400"
              >
                Save key
              </button>
            </div>
          </div>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          Tip: You can create a key in Google AI Studio. We never transmit your key to our servers.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyModal;
