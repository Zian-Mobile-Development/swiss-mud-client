// App.tsx
// Main component for the application.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Menu } from './components/Menu';
import { WikiPage } from './components/WikiPage';
import type { MudProfile } from './components/ConnectView';
import styles from './App.module.css';
import commonStyles from './styles/common.module.css';
import classNames from 'classnames';
import { CommandEngine } from './engines/CommandEngine';
import { WebSocketManager } from './managers/WebSocketManager';
import { Alias, Trigger, Settings, Script } from './types';
import { handleCommandInput } from './utils/CommandHandler';
import { setWebSocketManager, send } from './utils/CommandAction';
import { useAppContext } from './contexts/AppContext';
import { normalizeLineForTrigger } from './utils/TextUtils';
import { PROMPT_FLUSH_MS, SR_CHUNK_DEBOUNCE_MS } from './constants';
import { ClientCommandManager } from './utils/ClientCommands';
import { LineBuffer } from './utils/LineBuffer';
import {
  isSystemMessage,
  plainTextFromHtmlChunk,
  shouldUseLineBufferForTriggers,
} from './utils/a11yAnnounce';
import { formatWebSocketClose, trimOutput } from './utils/OutputUtils';
import { escapeHtml } from './utils/TextUtils';

function MudClientApp() {
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('Disconnected');
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<MudProfile | null>(
    null
  );
  const [canSend, setCanSend] = useState(false);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const { variables, setVariables, settings } = useAppContext();
  const [commandEngine, setCommandEngine] = useState<CommandEngine | null>(
    null
  );
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [outputHtml, setOutputHtml] = useState('');
  const [srAnnouncement, setSrAnnouncement] = useState('');
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [triggersEnabled, setTriggersEnabled] = useState(true);
  const clientCommands = useRef(new ClientCommandManager());
  const triggerLineBufferRef = useRef(new LineBuffer());
  const srLineBufferRef = useRef(new LineBuffer());
  const promptFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const chunkDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const chunkPendingRef = useRef('');

  const [line, setLine] = useState<string>('');

  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0.0-dev';

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
    srLineBufferRef.current.reset();
    clearPromptFlushTimer();
    clearChunkDebounce();
  }, [clearPromptFlushTimer, clearChunkDebounce]);

  const announceToScreenReader = useCallback((text: string) => {
    if (!text) return;
    setSrAnnouncement(prev => (prev ? `${prev}\n${text}` : text));
  }, []);

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
        for (const textLine of lines) {
          if (textLine) setLine(textLine);
        }
      } else {
        setLine(normalizeLineForTrigger(plain));
      }
    },
    [
      settings,
      announceToScreenReader,
      schedulePromptFlush,
      clearPromptFlushTimer,
    ]
  );

  const announceConnection = useCallback(
    (message: string) => {
      if (settings.announceConnectionStatus) {
        setStatusAnnouncement(message);
      }
    },
    [settings.announceConnectionStatus]
  );

  const announceUserCommand = useCallback(
    (command: string) => {
      if (settings.screenReaderEnabled) {
        announceToScreenReader(`> ${command}`);
      }
    },
    [settings.screenReaderEnabled, announceToScreenReader]
  );

  useEffect(() => {
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content =
      'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0';
    document.head.appendChild(viewportMeta);

    const handleResize = () => {
      setTimeout(() => {
        setViewportHeight(window.innerHeight);
        if (isLockedToBottom && outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }, 100);
    };

    const handleOrientationChange = () => {
      setTimeout(handleResize, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    if (inputRef.current) {
      inputRef.current.addEventListener('focus', () => {
        setTimeout(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }, 300);
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.head.removeChild(viewportMeta);
    };
  }, [isLockedToBottom]);

  useEffect(() => {
    const storedAliases = localStorage.getItem('mud_aliases');
    const storedTriggers = localStorage.getItem('mud_triggers');
    const storedScripts = localStorage.getItem('mud_scripts');
    let parsedAliases: Alias[] = [];
    let parsedTriggers: Trigger[] = [];
    let parsedScripts: Script[] = [];

    if (storedAliases) {
      try {
        parsedAliases = JSON.parse(storedAliases);
        setAliases(parsedAliases);
      } catch (e) {
        console.error('Failed to parse aliases:', e);
      }
    }

    if (storedTriggers) {
      try {
        parsedTriggers = JSON.parse(storedTriggers);
        setTriggers(parsedTriggers);
      } catch (e) {
        console.error('Failed to parse triggers:', e);
      }
    }

    if (storedScripts) {
      try {
        parsedScripts = JSON.parse(storedScripts);
        setScripts(parsedScripts);
      } catch (e) {
        console.error('Failed to parse scripts:', e);
      }
    }

    setCommandEngine(
      new CommandEngine(
        parsedAliases,
        variables,
        parsedTriggers,
        settings,
        {
          onCommandSend: (command: string, cmdSettings: Settings) => {
            if (cmdSettings.showCommandInOutput) {
              setOutputHtml(prev =>
                trimOutput(
                  prev + `<div class="user-cmd">&gt; ${command}</div>`
                )
              );
            }
            announceUserCommand(command);
            send(command);
          },
          onVariableSet: (name: string, value: string) => {
            setVariables(prev => {
              const existingIndex = prev.findIndex(v => v.name === name);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], value };
                return updated;
              } else {
                return [...prev, { name, value, description: '' }];
              }
            });
          },
        },
        scripts
      )
    );
  }, [wsManager]);

  useEffect(() => {
    if (commandEngine) {
      commandEngine.setAliases(aliases);
    }
  }, [aliases, commandEngine]);

  useEffect(() => {
    if (commandEngine) {
      commandEngine.setVariables(variables);
    }
  }, [variables, commandEngine]);

  useEffect(() => {
    if (commandEngine) {
      commandEngine.setTriggers(triggers);
    }
  }, [triggers, commandEngine]);

  useEffect(() => {
    if (commandEngine) {
      commandEngine.setScripts(scripts);
    }
  }, [scripts, commandEngine]);

  useEffect(() => {
    if (commandEngine) {
      commandEngine.setSettings(settings);
    }
  }, [settings, commandEngine]);

  useEffect(() => {
    if (line && commandEngine && triggersEnabled) {
      commandEngine.processPattern(line, 'trigger');
    }
  }, [line, triggersEnabled, commandEngine]);

  useEffect(() => {
    if (!selectedProfile) return;

    const manager = new WebSocketManager({
      onOpen: () => {
        resetStreamBuffers();
        setStatus('Connected');
        setCanSend(false);
        inputRef.current?.focus();
      },
      onClose: event => {
        resetStreamBuffers();
        const closeMessage = formatWebSocketClose(event);
        setStatus(`Disconnected (${event.code})`);
        setCanSend(false);
        setOutputHtml(prev =>
          trimOutput(
            prev + `<div class="system-message">${escapeHtml(closeMessage)}</div>`
          )
        );
        announceConnection('Disconnected');
      },
      onError: () => {
        setStatus('Error occurred');
        setOutputHtml(prev =>
          trimOutput(
            prev +
              '<div class="system-message">[ERROR] WebSocket error occurred</div>'
          )
        );
        announceConnection('Connection error');
      },
      onMessage: (data: string) => {
        setOutputHtml(prev => trimOutput(prev + data));
        ingestGameChunk(data);
      },
      onConnected: () => {
        setCanSend(true);
        if (selectedProfile) {
          announceConnection(`Connected to ${selectedProfile.name}`);
          document.title = `${selectedProfile.name} - Swiss Mud Client`;
        }
      },
    });

    manager.connect(selectedProfile);
    setWsManager(manager);
    setWebSocketManager(manager);

    return () => {
      resetStreamBuffers();
      manager.disconnect();
      document.title = 'Swiss Mud Client';
    };
  }, [
    selectedProfile,
    resetStreamBuffers,
    ingestGameChunk,
    announceConnection,
  ]);

  const handleOutputScroll = () => {
    if (!outputRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setIsLockedToBottom(true);
    } else {
      setIsLockedToBottom(false);
    }
  };

  useEffect(() => {
    if (isLockedToBottom && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputHtml, isLockedToBottom]);

  useEffect(() => {
    clientCommands.current.setClearScreenHandler(() => {
      setOutputHtml('');
      setSrAnnouncement('');
      resetStreamBuffers();
    });
  }, [resetStreamBuffers]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!commandEngine || !wsManager) return;

    if (e.key === 'Enter') {
      const command = e.currentTarget.value.trim();
      if (clientCommands.current.executeCommand(command)) {
        e.currentTarget.value = '';
        return;
      }
    }

    handleCommandInput(e, {
      commandEngine,
      wsManager,
      canSend,
      onCommandHistoryUpdate: command => {
        setCommandHistory(prev => {
          if (prev.length === 0 || prev[0] !== command) {
            return [command, ...prev];
          }
          return prev;
        });
      },
      onHistoryIndexUpdate: setHistoryIndex,
      historyIndex,
      commandHistory,
    });

    if (e.key === 'Enter') {
      setTimeout(() => {
        if (settings.highlightInputOnCommand) {
          inputRef.current?.select();
        } else {
          inputRef.current!.value = '';
        }
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  const inputDescribedBy = canSend
    ? 'command-input-hint'
    : 'command-input-hint input-status-hint';

  return (
    <div
      className={styles.main}
      style={{ height: `${viewportHeight}px` }}
    >
      <a href='#command-input' className={styles.skipLink}>
        Skip to command input
      </a>

      <header>
        <Menu
          onProfileConnect={setSelectedProfile}
          aliases={aliases}
          setAliases={setAliases}
          triggers={triggers}
          setTriggers={setTriggers}
          scripts={scripts}
          setScripts={setScripts}
        />
        <div
          className={classNames(styles.status, {
            [styles.statusConnected]: status === 'Connected',
          })}
        >
          <span className={styles.statusText} role='status' aria-live='polite'>
            {selectedProfile
              ? `${status} (${selectedProfile.name})`
              : 'No profile selected'}
          </span>
          <span
            className={commonStyles.visuallyHidden}
            role='status'
            aria-live='polite'
          >
            {statusAnnouncement}
          </span>
          <span className={styles.headerMeta}>
            <a className={styles.wikiLink} href='/wiki'>
              Wiki
            </a>
            <span
              className={styles.versionText}
              aria-label={`Version ${appVersion}`}
            >
              v{appVersion}
            </span>
          </span>
        </div>
      </header>

      <main className={styles.container}>
        <div
          ref={outputRef}
          className={styles.output}
          style={{
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`,
          }}
          onClick={() => inputRef.current?.focus()}
          onScroll={handleOutputScroll}
          tabIndex={settings.screenReaderEnabled ? -1 : 0}
          aria-hidden={settings.screenReaderEnabled ? true : undefined}
        >
          <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
        </div>

        {settings.screenReaderEnabled && (
          <div
            className={commonStyles.visuallyHidden}
            role='log'
            aria-live='polite'
            aria-relevant='additions'
            aria-atomic='false'
            aria-label='Game output for screen readers'
          >
            {srAnnouncement}
          </div>
        )}

        <div className={styles.inputContainer}>
          <span id='command-input-hint' className={styles.inputHint}>
            Press Enter to send. Up and Down arrow keys recall command history.
          </span>
          <span id='input-status-hint' className={styles.inputHint}>
            Connect to a MUD profile to send commands.
          </span>
          <input
            ref={inputRef}
            id='command-input'
            type='text'
            className={styles.input}
            placeholder='Type your command here...'
            onKeyDown={handleKeyDown}
            disabled={!canSend}
            aria-label='Command input'
            aria-describedby={inputDescribedBy}
            aria-disabled={!canSend}
            autoCorrect='off'
            autoComplete='off'
            spellCheck='false'
          />
          <button
            type='button'
            className={classNames(styles.triggerToggle, {
              [styles.triggerToggleDisabled]: !triggersEnabled,
            })}
            onClick={() => setTriggersEnabled(!triggersEnabled)}
            aria-label={
              triggersEnabled ? 'Disable triggers' : 'Enable triggers'
            }
            aria-pressed={triggersEnabled}
            title={triggersEnabled ? 'Disable triggers' : 'Enable triggers'}
          >
            <span aria-hidden='true'>{triggersEnabled ? '🔔' : '🔕'}</span>
          </button>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (path === '/wiki' || path.startsWith('/wiki/')) {
    return <WikiPage path={path} />;
  }

  return <MudClientApp />;
}

export default App;
