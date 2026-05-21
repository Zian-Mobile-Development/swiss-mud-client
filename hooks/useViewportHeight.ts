import React, { useEffect, useState } from 'react';

interface UseViewportHeightOptions {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onLayoutChange: () => void;
}

export function useViewportHeight({
  inputRef,
  onLayoutChange,
}: UseViewportHeightOptions): number {
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEffect(() => {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content =
      'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0';
    document.head.appendChild(viewportMeta);

    const refreshLayout = (delay: number) => {
      setTimeout(() => {
        setViewportHeight(window.innerHeight);
        onLayoutChange();
      }, delay);
    };

    const handleResize = () => refreshLayout(100);
    const handleOrientationChange = () => refreshLayout(300);
    const handleInputFocus = () => refreshLayout(300);
    const inputElement = inputRef.current;

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    inputElement?.addEventListener('focus', handleInputFocus);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      inputElement?.removeEventListener('focus', handleInputFocus);
      document.head.removeChild(viewportMeta);
    };
  }, [inputRef, onLayoutChange]);

  return viewportHeight;
}
