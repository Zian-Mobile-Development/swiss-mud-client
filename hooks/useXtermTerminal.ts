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

interface TerminalSettings {
  fontFamily: string;
  fontSize: number;
}

export function useXtermTerminal(settings: TerminalSettings) {
  const outputRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const pendingOutputRef = useRef('');
  const isLockedToBottomRef = useRef(true);
  const initialSettingsRef = useRef(settings);
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);

  const fit = useCallback(() => {
    fitAddonRef.current?.fit();
    if (isLockedToBottomRef.current) {
      terminalRef.current?.scrollToBottom();
    }
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
  }, []);

  const clear = useCallback(() => {
    terminalRef.current?.clear();
  }, []);

  const scrollToBottom = useCallback(() => {
    terminalRef.current?.scrollToBottom();
  }, []);

  useEffect(() => {
    isLockedToBottomRef.current = isLockedToBottom;
  }, [isLockedToBottom]);

  useLayoutEffect(() => {
    const outputElement = outputRef.current;
    if (!outputElement) return;

    const terminal = new Terminal({
      allowProposedApi: true,
      convertEol: false,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: initialSettingsRef.current.fontFamily,
      fontSize: initialSettingsRef.current.fontSize,
      scrollback: 5000,
      theme: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#2459ff',
      },
    });
    const fitAddon = new FitAddon();
    const unicode11Addon = new Unicode11Addon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(unicode11Addon);
    terminal.unicode.activeVersion = '11';
    terminal.open(outputElement);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const scrollDisposable = terminal.onScroll(() => {
      const buffer = terminal.buffer.active;
      setIsLockedToBottom(buffer.viewportY >= buffer.baseY - 1);
    });

    const resizeObserver = new ResizeObserver(() => fit());
    resizeObserver.observe(outputElement);

    requestAnimationFrame(() => {
      fit();
      if (pendingOutputRef.current) {
        const pending = pendingOutputRef.current;
        pendingOutputRef.current = '';
        terminal.write(pending, () => terminal.scrollToBottom());
      }
    });

    return () => {
      resizeObserver.disconnect();
      scrollDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [fit]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    terminal.options.fontFamily = settings.fontFamily;
    terminal.options.fontSize = settings.fontSize;
    fit();
  }, [fit, settings.fontFamily, settings.fontSize]);

  return useMemo(
    () => ({
      outputRef,
      write,
      clear,
      fit,
      scrollToBottom,
    }),
    [clear, fit, scrollToBottom, write]
  );
}
