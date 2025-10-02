import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthGate: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (signUpError) throw signUpError;
        setMessage('Account created! Check your inbox for a confirmation email.');
        setMode('sign-in');
      }
    } catch (err: any) {
      console.error('Authentication failed:', err);
      setError(err?.message || 'Unable to complete the request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111] p-4 text-gray-200">
      <div className="w-full max-w-md bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl p-6">
        <h1 className="text-3xl font-bold text-amber-300 text-center mb-2">School of the Ancients</h1>
        <p className="text-center text-gray-400 mb-6">
          {mode === 'sign-in' ? 'Sign in to access your mentors and quests.' : 'Create an account to save your progress across devices.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          <button
            type="submit"
            className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Please wait…' : mode === 'sign-in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'sign-in' ? (
            <button
              onClick={() => {
                setMode('sign-up');
                setError(null);
                setMessage('');
              }}
              className="text-amber-300 hover:text-amber-200 font-semibold"
            >
              Need an account? Sign up
            </button>
          ) : (
            <button
              onClick={() => {
                setMode('sign-in');
                setError(null);
                setMessage('');
              }}
              className="text-amber-300 hover:text-amber-200 font-semibold"
            >
              Already registered? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
