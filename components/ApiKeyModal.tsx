import React, { useEffect, useState } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  initialValue?: string | null;
  onClose: () => void;
  onSave: (value: string) => void;
  onClear: () => void;
  requireKey: boolean;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  initialValue,
  onClose,
  onSave,
  onClear,
  requireKey,
}) => {
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue ?? '');
      setError(null);
    }
  }, [initialValue, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter a valid Gemini API key.');
      return;
    }
    onSave(trimmed);
    setValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-xl bg-[#202020] p-6 shadow-2xl border border-gray-700">
        <h2 className="text-2xl font-semibold text-amber-200 mb-2">Connect your Gemini API key</h2>
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
          School of the Ancients runs entirely in your browser. Provide your own Google Gemini API key to chat with mentors,
          craft quests, and generate imagery. Your key is stored locally and never leaves this device.
        </p>

        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-200 mb-2">
          Gemini API key
        </label>
        <input
          id="apiKey"
          type="password"
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder="AIza..."
          className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          autoComplete="off"
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-gray-400">
            Need a key? Visit the{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 hover:text-amber-200 underline"
            >
              Google AI Studio dashboard
            </a>
            .
          </div>
          <div className="flex items-center justify-end gap-2">
            {!requireKey && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-500 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700/60"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
            >
              Save key
            </button>
            {!requireKey && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md border border-red-500 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10"
              >
                Clear stored key
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
