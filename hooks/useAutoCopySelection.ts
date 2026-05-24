import { useEffect } from 'react';
import { copySelectedText } from '../utils/ClipboardUtils';

function getSelectedInputText(target: EventTarget | null): string {
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLTextAreaElement)
  ) {
    return '';
  }

  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? 0;
  return start === end ? '' : target.value.slice(start, end);
}

function getSelectedDocumentText(): string {
  return window.getSelection()?.toString() ?? '';
}

function isInsideMonacoEditor(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('.monaco-editor'));
}

export function useAutoCopySelection() {
  useEffect(() => {
    const copySelection = (event: Event) => {
      if (isInsideMonacoEditor(event.target)) return;

      const inputText = getSelectedInputText(event.target);
      copySelectedText(inputText || getSelectedDocumentText());
    };

    document.addEventListener('mouseup', copySelection);
    document.addEventListener('keyup', copySelection);
    document.addEventListener('select', copySelection, true);

    return () => {
      document.removeEventListener('mouseup', copySelection);
      document.removeEventListener('keyup', copySelection);
      document.removeEventListener('select', copySelection, true);
    };
  }, []);
}
