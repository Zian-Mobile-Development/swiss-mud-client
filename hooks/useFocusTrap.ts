import { useEffect, useRef } from 'react';

// Keeps keyboard focus inside an active dialog and restores the previous
// focus target when the dialog closes.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape?: () => void
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    if (first) {
      first.focus();
    } else {
      container.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;

      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstNode) {
          e.preventDefault();
          lastNode.focus();
        }
      } else if (document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [isActive, containerRef, onEscape]);
}
