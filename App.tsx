// App.tsx
// Main component for the application.

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import { ClientCommandManager } from './utils/ClientCommands';
import { useLatestRef } from './hooks/useLatestRef';
import { useMudOutputProcessing } from './hooks/useMudOutputProcessing';
import { useViewportHeight } from './hooks/useViewportHeight';
import { useXtermTerminal } from './hooks/useXtermTerminal';
import {
  formatSystemMessageForTerminal,
  formatUserCommandForTerminal,
  htmlChunkToTerminalText,
  formatWebSocketClose,
} from './utils/OutputUtils';

interface StoredAutomation {
  aliases: Alias[];
  triggers: Trigger[];
  scripts: Script[];
}

function readStoredJson<T>(key: string, fallback: T): T {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) return fallback;

  try {
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
}

function loadStoredAutomation(): StoredAutomation {
  return {
    aliases: readStoredJson<Alias[]>('mud_aliases', []),
    triggers: readStoredJson<Trigger[]>('mud_triggers', []),
    scripts: readStoredJson<Script[]>('mud_scripts', []),
  };
}

function StatusBar({
  appVersion,
  selectedProfile,
  status,
  statusAnnouncement,
}: {
  appVersion: string;
  selectedProfile: MudProfile | null;
  status: string;
  statusAnnouncement: string;
}) {
  return (
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
  );
}

function TerminalOutput({
  outputRef,
  screenReaderEnabled,
  srAnnouncement,
  onClick,
}: {
  outputRef: React.RefObject<HTMLDivElement | null>;
  screenReaderEnabled: boolean;
  srAnnouncement: string;
  onClick: () => void;
}) {
  return (
    <>
      <div
        ref={outputRef}
        className={styles.output}
        onClick={onClick}
        tabIndex={screenReaderEnabled ? -1 : 0}
        aria-hidden={screenReaderEnabled ? true : undefined}
      />

      {screenReaderEnabled && (
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
    </>
  );
}

function CommandInputBar({
  canSend,
  inputRef,
  inputDescribedBy,
  onKeyDown,
  onToggleTriggers,
  triggersEnabled,
}: {
  canSend: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputDescribedBy: string;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onToggleTriggers: () => void;
  triggersEnabled: boolean;
}) {
  return (
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
        onKeyDown={onKeyDown}
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
        onClick={onToggleTriggers}
        aria-label={triggersEnabled ? 'Disable triggers' : 'Enable triggers'}
        aria-pressed={triggersEnabled}
        title={triggersEnabled ? 'Disable triggers' : 'Enable triggers'}
      >
        <span aria-hidden='true'>{triggersEnabled ? '🔔' : '🔕'}</span>
      </button>
    </div>
  );
}

function MudClientApp() {
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
  const [triggersEnabled, setTriggersEnabled] = useState(true);
  const terminal = useXtermTerminal(settings);
  const viewportHeight = useViewportHeight({
    inputRef,
    onLayoutChange: terminal.fit,
  });
  const clientCommands = useRef(new ClientCommandManager());
  const [line, setLine] = useState<string>('');
  const aliasesRef = useLatestRef(aliases);
  const variablesRef = useLatestRef(variables);
  const triggersRef = useLatestRef(triggers);
  const settingsRef = useLatestRef(settings);
  const scriptsRef = useLatestRef(scripts);
  const handleTriggerLine = useCallback((textLine: string) => {
    if (textLine) setLine(textLine);
  }, []);
  const {
    srAnnouncement,
    announceUserCommand,
    clearAnnouncements,
    ingestGameChunk,
    resetStreamBuffers,
  } = useMudOutputProcessing({
    settings,
    onTriggerLine: handleTriggerLine,
  });

  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0.0-dev';

  const announceConnection = useCallback(
    (message: string) => {
      if (settings.announceConnectionStatus) {
        setStatusAnnouncement(message);
      }
    },
    [settings.announceConnectionStatus]
  );

  const handleVariableSet = useCallback(
    (name: string, value: string) => {
      setVariables(prev => {
        const existingIndex = prev.findIndex(v => v.name === name);
        if (existingIndex < 0) {
          return [...prev, { name, value, description: '' }];
        }

        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], value };
        return updated;
      });
    },
    [setVariables]
  );

  useEffect(() => {
    const storedAutomation = loadStoredAutomation();
    setAliases(storedAutomation.aliases);
    setTriggers(storedAutomation.triggers);
    setScripts(storedAutomation.scripts);
  }, []);

  useEffect(() => {
    setCommandEngine(
      new CommandEngine(
        aliasesRef.current,
        variablesRef.current,
        triggersRef.current,
        settingsRef.current,
        {
          onCommandSend: (command: string, cmdSettings: Settings) => {
            if (cmdSettings.showCommandInOutput) {
              terminal.write(formatUserCommandForTerminal(command));
            }
            announceUserCommand(command);
            send(command);
          },
          onVariableSet: handleVariableSet,
        },
        scriptsRef.current
      )
    );
  }, [
    wsManager,
    aliasesRef,
    variablesRef,
    triggersRef,
    settingsRef,
    scriptsRef,
    terminal,
    announceUserCommand,
    handleVariableSet,
  ]);

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
        terminal.write(formatSystemMessageForTerminal(closeMessage));
        announceConnection('Disconnected');
      },
      onError: () => {
        setStatus('Error occurred');
        terminal.write(
          formatSystemMessageForTerminal('[ERROR] WebSocket error occurred')
        );
        announceConnection('Connection error');
      },
      onMessage: (data: string) => {
        terminal.write(htmlChunkToTerminalText(data));
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
    terminal,
  ]);

  useEffect(() => {
    clientCommands.current.setClearScreenHandler(() => {
      terminal.clear();
      clearAnnouncements();
      resetStreamBuffers();
    });
  }, [clearAnnouncements, resetStreamBuffers, terminal]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        terminal.scrollToBottom();
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
        <StatusBar
          appVersion={appVersion}
          selectedProfile={selectedProfile}
          status={status}
          statusAnnouncement={statusAnnouncement}
        />
      </header>

      <main className={styles.container}>
        <TerminalOutput
          outputRef={terminal.outputRef}
          screenReaderEnabled={settings.screenReaderEnabled}
          srAnnouncement={srAnnouncement}
          onClick={() => inputRef.current?.focus()}
        />

        <CommandInputBar
          canSend={canSend}
          inputRef={inputRef}
          inputDescribedBy={inputDescribedBy}
          onKeyDown={handleKeyDown}
          onToggleTriggers={() => setTriggersEnabled(!triggersEnabled)}
          triggersEnabled={triggersEnabled}
        />
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
