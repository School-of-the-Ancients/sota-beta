import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const scrollContainer = document.querySelector(
      '[data-app-scroll-container]'
    ) as HTMLElement | null;

    if (scrollContainer) {
      if (typeof scrollContainer.scrollTo === 'function') {
        scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        scrollContainer.scrollTop = 0;
      }
      return;
    }

    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    if (document?.documentElement) {
      document.documentElement.scrollTop = 0;
    }
  }, [pathname]);

  return null;
};

export default ScrollToTop;
