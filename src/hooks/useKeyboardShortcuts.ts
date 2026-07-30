import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside input/textarea/select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.shiftKey && e.key.toUpperCase() === 'N') {
        e.preventDefault();
        navigate('/trades/new');
      } else if (e.shiftKey && e.key.toUpperCase() === 'D') {
        e.preventDefault();
        navigate('/');
      } else if (e.shiftKey && e.key.toUpperCase() === 'T') {
        e.preventDefault();
        navigate('/trades');
      } else if (e.shiftKey && e.key.toUpperCase() === 'A') {
        e.preventDefault();
        navigate('/analytics');
      } else if (e.shiftKey && e.key.toUpperCase() === 'P') {
        e.preventDefault();
        navigate('/prop-firm');
      } else if (e.shiftKey && e.key.toUpperCase() === 'R') {
        e.preventDefault();
        navigate('/risk-calculator');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}
