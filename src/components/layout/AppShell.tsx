import React from 'react';
import { useLocation } from 'react-router-dom';

interface AppShellProps {
  environmentImageUrl: string | null;
  children: React.ReactNode;
}

const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
};

const AppShell: React.FC<AppShellProps> = ({ environmentImageUrl, children }) => {
  return (
    <div className="relative min-h-screen bg-[#1a1a1a]">
      <ScrollToTop />
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 z-0"
        style={{ backgroundImage: environmentImageUrl ? `url(${environmentImageUrl})` : 'none' }}
      />
      {environmentImageUrl && <div className="absolute inset-0 bg-black/50 z-0" />}

      <div
        className="relative z-10 min-h-screen flex flex-col text-gray-200 font-serif p-4 sm:p-6 lg:p-8"
        style={{ background: environmentImageUrl ? 'transparent' : 'linear-gradient(to bottom right, #1a1a1a, #2b2b2b)' }}
      >
        <header className="text-center mb-8">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-amber-300 tracking-wider"
            style={{ textShadow: '0 0 10px rgba(252, 211, 77, 0.5)' }}
          >
            School of the Ancients
          </h1>
          <p className="text-gray-400 mt-2 text-lg">Old world wisdom. New world classroom.</p>
        </header>

        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
