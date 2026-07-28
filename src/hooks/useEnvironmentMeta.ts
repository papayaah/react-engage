import { useMemo } from 'react';
import { EnvironmentMeta } from '../types';

export function useEnvironmentMeta(themeMode: 'light' | 'dark'): EnvironmentMeta {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        url: '',
        path: '',
        referrer: '',
        userAgent: '',
        browser: 'Unknown',
        os: 'Unknown',
        screenResolution: 'Unknown',
        viewportSize: 'Unknown',
        devicePixelRatio: 1,
        timestamp: new Date().toISOString(),
        themeMode,
      };
    }

    const ua = navigator.userAgent;
    
    // Simple UserAgent parsers
    let browser = 'Unknown Browser';
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg/')) browser = 'Edge';

    let os = 'Unknown OS';
    if (ua.includes('Mac OS X')) os = 'macOS';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || 'Direct',
      userAgent: navigator.userAgent,
      browser,
      os,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio || 1,
      timestamp: new Date().toISOString(),
      themeMode,
    };
  }, [themeMode]);
}
