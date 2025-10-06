import React, { useEffect, useMemo, useState } from 'react';

type AuthMode = 'signIn' | 'signUp';

interface AuthDialogProps {
  isOpen: boolean;
  mode: AuthMode;
  prompt?: string | null;
  error?: string | null;
  loading?: boolean;
  isConfigured: boolean;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSignInWithGoogle: () => void;
  onSubmitEmail: (email: string, password: string) => void;
}

const modeLabels: Record<AuthMode, { title: string; cta: string; switchText: string; switchLabel: string }> = {
  signIn: {
    title: 'Sign in',
    cta: 'Sign in',
    switchText: "Need an account?",
    switchLabel: 'Switch to sign up.',
  },
  signUp: {
    title: 'Create an account',
    cta: 'Sign up',
    switchText: 'Already have an account?',
    switchLabel: 'Switch to sign in.',
  },
};

const AuthDialog: React.FC<AuthDialogProps> = ({
  isOpen,
  mode,
  prompt,
  error,
  loading = false,
  isConfigured,
  onClose,
  onSwitchMode,
  onSignInWithGoogle,
  onSubmitEmail,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      return;
    }
    setPassword('');
  }, [isOpen, mode]);

  const disabledReason = useMemo(() => {
    if (!isConfigured) {
      return 'Authentication is not configured.';
    }
    if (loading) {
      return 'Processing...';
    }
    return null;
  }, [isConfigured, loading]);

  if (!isOpen) {
    return null;
  }

  const { title, cta, switchText, switchLabel } = modeLabels[mode];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (disabledReason) {
      return;
    }
    onSubmitEmail(email.trim(), password);
  };

  const handleSignInWithGoogle = () => {
    if (disabledReason) {
      return;
    }
    onSignInWithGoogle();
  };

  const canSubmit = email.trim().length > 0 && password.length >= 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-amber-400/40 bg-[#1f1f1f] shadow-xl">
        <div className="flex items-start justify-between border-b border-amber-400/20 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-amber-200">{title}</h2>
            {prompt && <p className="mt-2 text-sm text-amber-100/80">{prompt}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition hover:text-gray-200"
            aria-label="Close authentication dialog"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSignInWithGoogle}
              disabled={Boolean(disabledReason)}
              className="w-full rounded-md border border-amber-400/40 bg-transparent px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </button>
            {disabledReason && (
              <p className="text-xs text-amber-300/80">{disabledReason}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs uppercase tracking-widest text-gray-500">
            <span className="h-px flex-1 bg-gray-700" />
            <span>or</span>
            <span className="h-px flex-1 bg-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm font-medium text-amber-200/80">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-md border border-amber-400/30 bg-[#141414] px-3 py-2 text-sm text-amber-100 focus:border-amber-400 focus:outline-none"
                placeholder="you@example.com"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm font-medium text-amber-200/80">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-amber-400/30 bg-[#141414] px-3 py-2 text-sm text-amber-100 focus:border-amber-400 focus:outline-none"
                placeholder="••••••••"
                disabled={loading}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait…' : cta}
            </button>
          </form>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="text-center text-sm text-gray-400">
            <span>{switchText} </span>
            <button
              type="button"
              onClick={() => onSwitchMode(mode === 'signIn' ? 'signUp' : 'signIn')}
              className="font-semibold text-amber-200 hover:underline"
            >
              {switchLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthDialog;
