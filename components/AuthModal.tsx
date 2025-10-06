import React, { useCallback, useEffect, useMemo, useState } from 'react';

type AuthMode = 'signIn' | 'signUp';

interface AuthModalProps {
  open: boolean;
  prompt?: string | null;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<string | void>;
}

const AuthModal: React.FC<AuthModalProps> = ({
  open,
  prompt,
  onClose,
  onGoogleSignIn,
  onEmailSignIn,
  onEmailSignUp,
}) => {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail('');
      setPassword('');
      setFormError(null);
      setFormMessage(null);
      setMode('signIn');
    }
  }, [open]);

  useEffect(() => {
    setFormError(null);
    setFormMessage(null);
  }, [mode]);

  const title = useMemo(() => (mode === 'signIn' ? 'Sign in' : 'Create an account'), [mode]);

  const toggleMode = useCallback(() => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    setFormError(null);
    setFormMessage(null);
    setIsGoogleSubmitting(true);
    try {
      await onGoogleSignIn();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to start Google sign-in.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [onGoogleSignIn]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setFormMessage(null);
      setIsSubmitting(true);
      try {
        if (mode === 'signIn') {
          await onEmailSignIn(email, password);
        } else {
          const message = await onEmailSignUp(email, password);
          if (message) {
            setFormMessage(message);
          }
        }
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Authentication failed.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, mode, onEmailSignIn, onEmailSignUp]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md rounded-xl border border-amber-500/40 bg-[#121212] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-amber-200 transition hover:text-white"
          aria-label="Close sign-in dialog"
        >
          ×
        </button>

        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-amber-200">{title}</h2>
            {prompt && <p className="mt-2 text-sm text-amber-100/80">{prompt}</p>}
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting || isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-white/90 py-2 font-semibold text-gray-900 transition hover:bg-white"
          >
            {isGoogleSubmitting ? 'Connecting…' : 'Continue with Google'}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-px flex-1 bg-gray-700" />
            <span>or</span>
            <span className="h-px flex-1 bg-gray-700" />
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-amber-200" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-amber-200" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-gray-700 bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>

            {formError && <p className="text-sm text-red-400">{formError}</p>}
            {formMessage && <p className="text-sm text-amber-200">{formMessage}</p>}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleSubmitting}
              className="w-full rounded-md bg-amber-500 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isSubmitting ? 'Submitting…' : mode === 'signIn' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400">
            {mode === 'signIn' ? (
              <>
                Need an account?{' '}
                <button type="button" onClick={toggleMode} className="font-semibold text-amber-300 hover:text-amber-200">
                  Switch to sign up.
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" onClick={toggleMode} className="font-semibold text-amber-300 hover:text-amber-200">
                  Switch to sign in.
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
