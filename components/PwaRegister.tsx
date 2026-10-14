'use client';

import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost')
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SportsDigest PWA ServiceWorker active:', registration.scope);
          })
          .catch((error) => {
            console.warn('PWA ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
