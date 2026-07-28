import { useState, useEffect } from 'react';
import { WidgetTheme } from '../types';

export function useFeedbackTheme(requestedTheme: WidgetTheme = 'inherit'): 'light' | 'dark' {
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const determineTheme = (): 'light' | 'dark' => {
      if (requestedTheme === 'light') return 'light';
      if (requestedTheme === 'dark') return 'dark';

      // Handle 'inherit' or 'system'
      if (requestedTheme === 'inherit') {
        const rootElement = document.documentElement;
        if (rootElement.classList.contains('dark') || rootElement.classList.contains('dark-theme')) {
          return 'dark';
        }
        if (rootElement.classList.contains('light')) {
          return 'light';
        }
      }

      // Check system prefers-color-scheme
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    setResolvedTheme(determineTheme());

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (requestedTheme === 'system' || requestedTheme === 'inherit') {
        setResolvedTheme(determineTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [requestedTheme]);

  return resolvedTheme;
}
