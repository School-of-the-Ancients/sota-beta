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
      scrollContainer.scrollTo({ top: 0, behavior: 'auto' });
      scrollContainer.scrollTop = 0;
      return;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
