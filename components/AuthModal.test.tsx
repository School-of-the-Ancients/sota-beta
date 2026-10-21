import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import AuthModal from './AuthModal';

vi.mock('../hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({ isConfigured: true, signInWithGoogle: vi.fn(),
    signInWithPassword: vi.fn(), signUpWithPassword: vi.fn() }),
}));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
describe('private deployment login', () => {
  it('hides unsupported account creation and Google login', () => {
    vi.stubEnv('VITE_ALLOW_SIGNUP', 'false');
    vi.stubEnv('VITE_GOOGLE_AUTH_ENABLED', 'false');
    render(<AuthModal isOpen onClose={() => {}} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByText('Switch to sign up.')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument();
  });
  it('preserves the existing public-deployment options by default', () => {
    render(<AuthModal isOpen onClose={() => {}} />);
    expect(screen.getByText('Switch to sign up.')).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });
});
