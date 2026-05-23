import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { copySelectedText } from '../utils/ClipboardUtils';

interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
}

export function useXtermTerminal(settings: TerminalSettings) {
  const outputRef = useRef<HTMLDivElement>(null);
  const liveOutputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const liveTerminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const liveFitAddonRef = useRef<FitAddon | null>(null);
  const pendingOutputRef = useRef('');
  const isLockedToBottomRef = useRef(true);
  const isReviewingScrollbackRef = useRef(false);
  const initialSettingsRef = useRef(settings);
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);
  const [isReviewingScrollback, setIsReviewingScrollback] = useState(false);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
    if (liveOutputRef.current && liveOutputRef.current.clientHeight > 0) {
      liveFitAddonRef.current?.fit();
    }
    if (isLockedToBottomRef.current) {
      terminalRef.current?.scrollToBottom();
    }
    liveTerminalRef.current?.scrollToBottom();
  }, []);

  const write = useCallback((text: string) => {
    if (!text) return;

    const terminal = terminalRef.current;
    if (!terminal) {
      pendingOutputRef.current += text;
      return;
    }

    terminal.write(text, () => {
      if (isLockedToBottomRef.current) {
        terminal.scrollToBottom();
      }
    });
    liveTerminalRef.current?.write(text, () => {
      liveTerminalRef.current?.scrollToBottom();
    });
  }, []);

  const clear = useCallback(() => {
    terminalRef.current?.clear();
    liveTerminalRef.current?.clear();
  }, []);

  const scrollToBottom = useCallback(() => {
    terminalRef.current?.scrollToBottom();
    liveTerminalRef.current?.scrollToBottom();
  }, []);

  useEffect(() => {
    isLockedToBottomRef.current = isLockedToBottom;
    const reviewingScrollback = !isLockedToBottom;
    isReviewingScrollbackRef.current = reviewingScrollback;
    setIsReviewingScrollback(reviewingScrollback);
  }, [isLockedToBottom]);

  useLayoutEffect(() => {
    const outputElement = outputRef.current;
    const liveOutputElement = liveOutputRef.current;
    if (!outputElement || !liveOutputElement) return;

    const createTerminal = (scrollback: number) =>
      new Terminal({
        allowProposedApi: true,
        convertEol: false,
        cursorBlink: false,
        disableStdin: true,
        fontFamily: initialSettingsRef.current.fontFamily,
        fontSize: initialSettingsRef.current.fontSize,
        scrollback,
        theme: {
          background: '#000000',
          foreground: '#ffffff',
          cursor: '#ffffff',
          selectionBackground: '#2459ff',
        },
      });

    const terminal = createTerminal(5000);
    const liveTerminal = createTerminal(500);
    const fitAddon = new FitAddon();
    const liveFitAddon = new FitAddon();
    const unicode11Addon = new Unicode11Addon();
    const liveUnicode11Addon = new Unicode11Addon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = '11';
    terminal.open(outputElement);

    liveTerminal.loadAddon(liveFitAddon);
    liveTerminal.loadAddon(liveUnicode11Addon);
    liveTerminal.unicode.activeVersion = '11';
    liveTerminal.open(liveOutputElement);

    terminalRef.current = terminal;
    liveTerminalRef.current = liveTerminal;
    fitAddonRef.current = fitAddon;
    liveFitAddonRef.current = liveFitAddon;

    const scrollDisposable = terminal.onScroll(() => {
      const buffer = terminal.buffer.active;
      const liveRows = liveTerminalRef.current?.rows ?? 0;
      const lockThreshold = isReviewingScrollbackRef.current
        ? Math.max(0, buffer.baseY - liveRows + 1)
        : buffer.baseY - 1;
      setIsLockedToBottom(buffer.viewportY >= lockThreshold);
    });
    const selectionDisposable = terminal.onSelectionChange(() => {
      copySelectedText(terminal.getSelection());
    });
    const liveSelectionDisposable = liveTerminal.onSelectionChange(() => {
      copySelectedText(liveTerminal.getSelection());
    });

    const resizeObserver = new ResizeObserver(() => fit());
    resizeObserver.observe(outputElement);
    resizeObserver.observe(liveOutputElement);

    requestAnimationFrame(() => {
      fit();
      if (pendingOutputRef.current) {
        const pending = pendingOutputRef.current;
        pendingOutputRef.current = '';
        terminal.write(pending, () => terminal.scrollToBottom());
        liveTerminal.write(pending, () => liveTerminal.scrollToBottom());
      }
    });

    return () => {
      resizeObserver.disconnect();
      scrollDisposable.dispose();
      selectionDisposable.dispose();
      liveSelectionDisposable.dispose();
      terminal.dispose();
      liveTerminal.dispose();
      terminalRef.current = null;
      liveTerminalRef.current = null;
      fitAddonRef.current = null;
      liveFitAddonRef.current = null;
    };
  }, [fit]);

  useEffect(() => {
    const terminal = terminalRef.current;
    const liveTerminal = liveTerminalRef.current;
    if (!terminal || !liveTerminal) return;

    terminal.options.fontFamily = settings.fontFamily;
    terminal.options.fontSize = settings.fontSize;
    liveTerminal.options.fontFamily = settings.fontFamily;
    liveTerminal.options.fontSize = settings.fontSize;
    fit();
  }, [fit, settings.fontFamily, settings.fontSize]);

  useEffect(() => {
    fit();
  }, [fit, isReviewingScrollback]);

  return useMemo(
    () => ({
      outputRef,
      liveOutputRef,
      isReviewingScrollback,
      write,
      clear,
      fit,
      scrollToBottom,
    }),
    [clear, fit, isReviewingScrollback, scrollToBottom, write]
  );
}
