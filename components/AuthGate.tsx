import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthGate: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setMessage('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (mode === 'signUp') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw error;
        }
        setMessage('Account created. Check your email to confirm your address if required.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-6">
      <div className="w-full max-w-md bg-gray-900/80 border border-gray-700 rounded-2xl p-8 shadow-2xl text-gray-200">
        <h1 className="text-3xl font-bold text-center text-amber-300 mb-6">School of the Ancients</h1>
        <p className="text-center text-gray-400 mb-8">
          Sign in with your email to continue your conversations with the Ancients.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          {message && (
            <p className="text-sm text-center text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-lg px-3 py-2">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : mode === 'signIn' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-gray-400">
          {mode === 'signIn' ? (
            <button
              onClick={() => setMode('signUp')}
              className="text-amber-300 hover:text-amber-200 font-semibold"
            >
              Need an account? Sign up
            </button>
          ) : (
            <button
              onClick={() => setMode('signIn')}
              className="text-amber-300 hover:text-amber-200 font-semibold"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
