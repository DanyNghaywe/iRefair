'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ParticlesBackground } from './ParticlesBackground';

type NavigationLoaderContextValue = {
  startNavigation: (targetPath?: string) => void;
  stopNavigation: () => void;
  isNavigating: boolean;
};

const NavigationLoaderContext = createContext<NavigationLoaderContextValue | null>(null);

export function NavigationLoaderProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);
  const pendingPathRef = useRef<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const pendingPath = pendingPathRef.current;
    const pathChanged = pathname !== lastPathRef.current;
    const matchedPendingPath = pendingPath ? pathname === pendingPath : pathChanged;

    if (isNavigating && matchedPendingPath) {
      // Necessary to hide the overlay once the navigation target matches; keeping local state change here is intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsNavigating(false);
      pendingPathRef.current = null;
    }

    lastPathRef.current = pathname;
  }, [isNavigating, pathname]);

  const startNavigation = useCallback((targetPath?: string) => {
    pendingPathRef.current = targetPath ?? null;
    setIsNavigating(true);
  }, []);
  const stopNavigation = useCallback(() => setIsNavigating(false), []);

  const value = useMemo(
    () => ({
      startNavigation,
      stopNavigation,
      isNavigating,
    }),
    [isNavigating, startNavigation, stopNavigation],
  );

  return (
    <NavigationLoaderContext.Provider value={value}>
      {children}
      {isNavigating && <RouteLoadingOverlay />}
    </NavigationLoaderContext.Provider>
  );
}

export function useNavigationLoader() {
  const ctx = useContext(NavigationLoaderContext);
  if (!ctx) {
    throw new Error('useNavigationLoader must be used within a NavigationLoaderProvider');
  }
  return ctx;
}

function RouteLoadingOverlay() {
  return (
    <div
      className="route-loading route-loading--overlay"
      role="status"
      aria-live="polite"
      aria-label="Loading next page"
    >
      <ParticlesBackground className="overlay-particles" />
      <div className="route-loading__panel">
        <span className="sr-only">Loading the next page</span>
        <div className="route-loading__animation">
          <div className="wrapper">
            <div className="box-wrap">
              <div className="box one" />
              <div className="box two" />
              <div className="box three" />
              <div className="box four" />
              <div className="box five" />
              <div className="box six" />
            </div>
          </div>
        </div>
        <p className="route-loading__label">Loading your next page...</p>
        <p className="route-loading__sub">Hang tight while we get things ready.</p>
      </div>
    </div>
  );
}
