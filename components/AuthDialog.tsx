import React, { useEffect, useMemo, useState } from 'react';

interface AuthDialogProps {
  isOpen: boolean;
  promptMessage?: string | null;
  onClose: () => void;
  onSignInWithGoogle: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
}

type AuthMode = 'signIn' | 'signUp';

const initialState = {
  email: '',
  password: '',
};

const AuthDialog: React.FC<AuthDialogProps> = ({
  isOpen,
  promptMessage,
  onClose,
  onSignInWithGoogle,
  onEmailSignIn,
  onEmailSignUp,
}) => {
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [formState, setFormState] = useState(initialState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<'google' | 'email' | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setAuthMode('signIn');
    setFormState(initialState);
    setErrorMessage(null);
    setStatusMessage(null);
    setSubmitting(null);
  }, [isOpen]);

  const title = useMemo(() => (authMode === 'signIn' ? 'Sign in' : 'Create an account'), [authMode]);

  if (!isOpen) {
    return null;
  }

  const handleGoogleSignIn = async () => {
    setSubmitting('google');
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await onSignInWithGoogle();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to continue with Google.';
      setErrorMessage(message);
    } finally {
      setSubmitting(null);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting('email');
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      if (authMode === 'signIn') {
        await onEmailSignIn(formState.email, formState.password);
        onClose();
      } else {
        const result = await onEmailSignUp(formState.email, formState.password);
        if (result.requiresEmailConfirmation) {
          setStatusMessage('Check your email to confirm your account, then sign in.');
        } else {
          onClose();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete the request.';
      setErrorMessage(message);
    } finally {
      setSubmitting(null);
    }
  };

  const toggleMode = () => {
    setAuthMode((mode) => (mode === 'signIn' ? 'signUp' : 'signIn'));
    setErrorMessage(null);
    setStatusMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#1f1f1f] border border-amber-500/40 shadow-xl">
        <div className="flex items-center justify-between border-b border-amber-500/20 px-6 py-4">
          <h2 className="text-xl font-semibold text-amber-200">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-amber-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pt-4 pb-6 space-y-4">
          {promptMessage && (
            <p className="text-sm text-amber-200/80">{promptMessage}</p>
          )}

          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
          {statusMessage && <p className="text-sm text-emerald-400">{statusMessage}</p>}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 text-black font-semibold py-2.5 hover:bg-amber-400 transition-colors"
            disabled={submitting === 'google'}
          >
            {submitting === 'google' ? 'Connecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-grow h-px bg-gray-700" />
            <span className="text-xs uppercase tracking-widest text-gray-500">or</span>
            <div className="flex-grow h-px bg-gray-700" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={formState.email}
                onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-md border border-gray-700 bg-[#161616] px-3 py-2 text-sm text-gray-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={authMode === 'signIn' ? 'current-password' : 'new-password'}
                required
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-md border border-gray-700 bg-[#161616] px-3 py-2 text-sm text-gray-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-gray-400 hover:text-amber-200"
              >
                {authMode === 'signIn' ? 'Need an account? Switch to sign up.' : 'Already have an account? Switch to sign in.'}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-700/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={submitting === 'email'}
                >
                  {submitting === 'email' ? 'Working…' : authMode === 'signIn' ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthDialog;
