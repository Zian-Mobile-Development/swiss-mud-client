import { useCallback, useRef, useState } from 'react';
import { PROMPT_FLUSH_MS, SR_CHUNK_DEBOUNCE_MS } from '../constants';
import type { PatternContext, Settings } from '../types';
import { LineBuffer } from '../utils/LineBuffer';
import { normalizeLineForTrigger } from '../utils/TextUtils';
import {
  isSystemMessage,
  plainTextFromHtmlChunk,
  shouldUseLineBufferForTriggers,
} from '../utils/a11yAnnounce';

interface UseMudOutputProcessingOptions {
  settings: Settings;
  onTriggerLine: (line: string, context?: PatternContext) => void;
}

export function useMudOutputProcessing({
  settings,
  onTriggerLine,
}: UseMudOutputProcessingOptions) {
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const triggerLineBufferRef = useRef(new LineBuffer());
  const triggerHtmlLineBufferRef = useRef(new LineBuffer());
  const srLineBufferRef = useRef(new LineBuffer());
  const promptFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const chunkDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const chunkPendingRef = useRef('');

  const clearPromptFlushTimer = useCallback(() => {
    if (promptFlushTimerRef.current) {
      clearTimeout(promptFlushTimerRef.current);
      promptFlushTimerRef.current = null;
    }
  }, []);

  const clearChunkDebounce = useCallback(() => {
    if (chunkDebounceTimerRef.current) {
      clearTimeout(chunkDebounceTimerRef.current);
      chunkDebounceTimerRef.current = null;
    }
    chunkPendingRef.current = '';
  }, []);

  const resetStreamBuffers = useCallback(() => {
    triggerLineBufferRef.current.reset();
    triggerHtmlLineBufferRef.current.reset();
    srLineBufferRef.current.reset();
    clearPromptFlushTimer();
    clearChunkDebounce();
  }, [clearPromptFlushTimer, clearChunkDebounce]);

  const clearAnnouncements = useCallback(() => {
    setSrAnnouncement('');
  }, []);

  const announceToScreenReader = useCallback((text: string) => {
    if (!text) return;
    setSrAnnouncement(prev => (prev ? `${prev}\n${text}` : text));
  }, []);

  const announceUserCommand = useCallback(
    (command: string) => {
      if (settings.screenReaderEnabled) {
        announceToScreenReader(`> ${command}`);
      }
    },
    [settings.screenReaderEnabled, announceToScreenReader]
  );

  const schedulePromptFlush = useCallback(() => {
    clearPromptFlushTimer();
    if (
      !settings.screenReaderEnabled ||
      !settings.announcePromptLines ||
      settings.screenReaderVerbosity !== 'lines' ||
      !srLineBufferRef.current.hasPending()
    ) {
      return;
    }

    promptFlushTimerRef.current = setTimeout(() => {
      promptFlushTimerRef.current = null;
      const pending = srLineBufferRef.current.flush();
      if (pending) announceToScreenReader(normalizeLineForTrigger(pending));
    }, PROMPT_FLUSH_MS);
  }, [settings, clearPromptFlushTimer, announceToScreenReader]);

  const ingestGameChunk = useCallback(
    (data: string) => {
      if (isSystemMessage(data)) return;

      const plain = plainTextFromHtmlChunk(data);

      if (settings.screenReaderEnabled) {
        if (settings.screenReaderVerbosity === 'lines') {
          const lines = srLineBufferRef.current
            .append(plain)
            .map(normalizeLineForTrigger)
            .filter(Boolean);

          for (const textLine of lines) {
            announceToScreenReader(textLine);
          }

          if (srLineBufferRef.current.hasPending()) {
            schedulePromptFlush();
          } else {
            clearPromptFlushTimer();
          }
        } else {
          chunkPendingRef.current += plain;
          if (chunkDebounceTimerRef.current) {
            clearTimeout(chunkDebounceTimerRef.current);
          }
          chunkDebounceTimerRef.current = setTimeout(() => {
            chunkDebounceTimerRef.current = null;
            const batch = chunkPendingRef.current;
            chunkPendingRef.current = '';
            if (batch) announceToScreenReader(batch);
          }, SR_CHUNK_DEBOUNCE_MS);
        }
      }

      if (
        settings.screenReaderEnabled &&
        shouldUseLineBufferForTriggers(settings)
      ) {
        const lines = triggerLineBufferRef.current
          .append(plain)
          .map(normalizeLineForTrigger)
          .filter(Boolean);
        const htmlLines = triggerHtmlLineBufferRef.current.append(data);

        for (let index = 0; index < lines.length; index += 1) {
          onTriggerLine(lines[index], { rawHtml: htmlLines[index] || '' });
        }
      } else {
        onTriggerLine(normalizeLineForTrigger(plain), { rawHtml: data });
      }
    },
    [
      settings,
      onTriggerLine,
      announceToScreenReader,
      schedulePromptFlush,
      clearPromptFlushTimer,
    ]
  );

  return {
    srAnnouncement,
    announceUserCommand,
    clearAnnouncements,
    ingestGameChunk,
    resetStreamBuffers,
  };
}
