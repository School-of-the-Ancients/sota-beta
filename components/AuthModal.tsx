import React, { useEffect, useMemo, useState } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  prompt?: string | null;
  onClose: () => void;
}

type AuthMode = 'sign-in' | 'sign-up';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, prompt, onClose }) => {
  const { isConfigured, signInWithGoogle, signInWithPassword, signUpWithPassword } = useSupabaseAuth();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setMode('sign-in');
    setEmail('');
    setPassword('');
    setError(null);
    setInfo(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const heading = useMemo(() => (mode === 'sign-in' ? 'Sign in' : 'Create an account'), [mode]);

  if (!isOpen) {
    return null;
  }

  const disabled = !isConfigured || isSubmitting;

  const handleEmailSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!isConfigured) {
      setError('Authentication is not configured. Provide Supabase credentials to enable sign in.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Enter both email and password.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const trimmedEmail = email.trim();
      if (mode === 'sign-in') {
        await signInWithPassword(trimmedEmail, password);
        onClose();
      } else {
        const data = await signUpWithPassword(trimmedEmail, password);
        if (data.session) {
          onClose();
        } else {
          setInfo('Check your email to verify your account, then return to sign in.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!isConfigured) {
      setError('Authentication is not configured. Provide Supabase credentials to enable sign in.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to start Google sign in.');
    }
  };

  const switchMode = () => {
    setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
    setError(null);
    setInfo(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-amber-500/40 bg-[#1f1f1f] p-6 shadow-2xl text-amber-50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-amber-300">{heading}</h2>
            {prompt && <p className="mt-1 text-sm text-amber-100/80">{prompt}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-amber-500/40 px-2 py-1 text-xs uppercase tracking-wide text-amber-200 hover:bg-amber-500/10"
          >
            Close
          </button>
        </div>

        {!isConfigured && (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            Authentication is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign in.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>
        )}

        {info && (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">{info}</p>
        )}

        <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium text-amber-200">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-amber-500/40 bg-[#131313] px-3 py-2 text-amber-100 placeholder:text-amber-100/40 focus:border-amber-400 focus:outline-none"
              disabled={disabled}
              required
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium text-amber-200">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-amber-500/40 bg-[#131313] px-3 py-2 text-amber-100 placeholder:text-amber-100/40 focus:border-amber-400 focus:outline-none"
              disabled={disabled}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
          >
            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-amber-500/30" />
          <span className="text-xs uppercase tracking-[0.2em] text-amber-300/70">or</span>
          <div className="h-px flex-1 bg-amber-500/30" />
        </div>

        <button
          type="button"
          onClick={handleGoogleClick}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-amber-100/80">
          {mode === 'sign-in' ? 'Need an account?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={switchMode}
            className="font-semibold text-amber-300 underline-offset-4 hover:underline"
            disabled={isSubmitting}
          >
            {mode === 'sign-in' ? 'Switch to sign up.' : 'Switch to sign in.'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
