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
import styles from './App.module.css';
import commonStyles from './styles/common.module.css';
import classNames from 'classnames';
import { CommandEngine } from './engines/CommandEngine';
import { WebSocketManager } from './managers/WebSocketManager';
import { DataManager, type MudData } from './managers/DataManager';
import {
  Alias,
  ListFolder,
  MudProfile,
  Script,
  Settings,
  Trigger,
  Variable,
} from './types';
import { createListItemId } from './utils/listFolders';
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
import {
  emptyProfileData,
  getProfileData,
  loadProfileDataMap,
  loadProfiles,
  saveProfileDataMap,
  saveProfiles,
  updateProfileData,
  type ProfileDataMap,
} from './utils/ProfileDataStore';
import { IconLabel } from './components/icons/IconLabel';
import { Bell, BellOff, BookOpen, Unplug } from 'lucide-react';

function StatusBar({
  appVersion,
  canDisconnect,
  onDisconnect,
  selectedProfile,
  status,
  statusAnnouncement,
}: {
  appVersion: string;
  canDisconnect: boolean;
  onDisconnect: () => void;
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
          <IconLabel icon={BookOpen}>Wiki</IconLabel>
        </a>
        <span
          className={styles.versionText}
          aria-label={`Version ${appVersion}`}
        >
          v{appVersion}
        </span>
        {canDisconnect && (
          <button
            type='button'
            className={styles.disconnectButton}
            onClick={onDisconnect}
          >
            <IconLabel icon={Unplug}>Disconnect</IconLabel>
          </button>
        )}
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
        {triggersEnabled ? (
          <Bell size={18} className={commonStyles.icon} aria-hidden />
        ) : (
          <BellOff size={18} className={commonStyles.icon} aria-hidden />
        )}
      </button>
    </div>
  );
}

function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className={styles.toast} role='status' aria-live='polite'>
      {message}
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
  const [aliasFolders, setAliasFolders] = useState<ListFolder[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [triggerFolders, setTriggerFolders] = useState<ListFolder[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [scriptFolders, setScriptFolders] = useState<ListFolder[]>([]);
  const [variableFolders, setVariableFolders] = useState<ListFolder[]>([]);
  const [profiles, setProfiles] = useState<MudProfile[]>([]);
  const [profileDataMap, setProfileDataMap] = useState<ProfileDataMap>({});
  const { variables, setVariables, settings, setSettings } = useAppContext();
  const [commandEngine, setCommandEngine] = useState<CommandEngine | null>(
    null
  );
  const [wsManager, setWsManager] = useState<WebSocketManager | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [triggersEnabled, setTriggersEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const fallbackProfileDataId = selectedProfile?.id || profiles[0]?.id || '';
  const selectedDataSourceExists = profiles.some(
    profile => profile.id === settings.profileDataSourceId
  );
  const activeProfileDataId =
    settings.profileDataSourceId && selectedDataSourceExists
      ? settings.profileDataSourceId
      : fallbackProfileDataId;
  const activeProfileDataName =
    profiles.find(profile => profile.id === activeProfileDataId)?.name ||
    'current profile';

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      setToastMessage(null);
    }, 3000);
  }, []);

  const announceConnection = useCallback(
    (message: string) => {
      if (settings.announceConnectionStatus) {
        setStatusAnnouncement(message);
      }
    },
    [settings.announceConnectionStatus]
  );
  const announceConnectionRef = useLatestRef(announceConnection);
  const ingestGameChunkRef = useLatestRef(ingestGameChunk);
  const resetStreamBuffersRef = useLatestRef(resetStreamBuffers);

  const handleVariableSet = useCallback(
    (name: string, value: string) => {
      setVariables(prev => {
        const existingIndex = prev.findIndex(v => v.name === name);
        const updated =
          existingIndex < 0
            ? [
                ...prev,
                {
                  id: createListItemId(),
                  name,
                  value,
                  folderId: null,
                },
              ]
            : prev.map((variable, index) =>
                index === existingIndex ? { ...variable, value } : variable
              );

        if (activeProfileDataId) {
          setProfileDataMap(current => {
            const next = updateProfileData(current, activeProfileDataId, {
              variables: updated,
            });
            saveProfileDataMap(next);
            return next;
          });
        }
        return updated;
      });
    },
    [activeProfileDataId, setVariables]
  );

  const saveActiveProfileData = useCallback(
    (data: {
      aliases?: Alias[];
      aliasFolders?: ListFolder[];
      triggers?: Trigger[];
      triggerFolders?: ListFolder[];
      scripts?: Script[];
      scriptFolders?: ListFolder[];
      variables?: Variable[];
      variableFolders?: ListFolder[];
    }) => {
      if (!activeProfileDataId) return;

      setProfileDataMap(prev => {
        const updated = updateProfileData(prev, activeProfileDataId, data);
        saveProfileDataMap(updated);
        return updated;
      });
    },
    [activeProfileDataId]
  );

  const handleAliasesChange = useCallback(
    (updated: Alias[]) => {
      setAliases(updated);
      saveActiveProfileData({ aliases: updated });
    },
    [saveActiveProfileData]
  );

  const handleAliasFoldersChange = useCallback(
    (updated: ListFolder[]) => {
      setAliasFolders(updated);
      saveActiveProfileData({ aliasFolders: updated });
    },
    [saveActiveProfileData]
  );

  const handleTriggersChange = useCallback(
    (updated: Trigger[]) => {
      setTriggers(updated);
      saveActiveProfileData({ triggers: updated });
    },
    [saveActiveProfileData]
  );

  const handleTriggerFoldersChange = useCallback(
    (updated: ListFolder[]) => {
      setTriggerFolders(updated);
      saveActiveProfileData({ triggerFolders: updated });
    },
    [saveActiveProfileData]
  );

  const handleScriptsChange = useCallback(
    (updated: Script[]) => {
      setScripts(updated);
      saveActiveProfileData({ scripts: updated });
    },
    [saveActiveProfileData]
  );

  const handleScriptFoldersChange = useCallback(
    (updated: ListFolder[]) => {
      setScriptFolders(updated);
      saveActiveProfileData({ scriptFolders: updated });
    },
    [saveActiveProfileData]
  );

  const handleVariablesChange = useCallback(
    (updated: Variable[]) => {
      setVariables(updated);
      saveActiveProfileData({ variables: updated });
    },
    [saveActiveProfileData, setVariables]
  );

  const handleVariableFoldersChange = useCallback(
    (updated: ListFolder[]) => {
      setVariableFolders(updated);
      saveActiveProfileData({ variableFolders: updated });
    },
    [saveActiveProfileData]
  );

  const handleClearProfileData = useCallback(() => {
    if (!activeProfileDataId) return;

    setProfileDataMap(prev => {
      const updated = updateProfileData(prev, activeProfileDataId, {
        aliases: [],
        aliasFolders: [],
        triggers: [],
        triggerFolders: [],
        scripts: [],
        scriptFolders: [],
        variables: [],
        variableFolders: [],
      });
      saveProfileDataMap(updated);
      return updated;
    });
    showToast(`Cleared data for ${activeProfileDataName}.`);
  }, [activeProfileDataId, activeProfileDataName, showToast]);

  const handleDataImport = useCallback(
    (data: MudData) => {
      DataManager.saveDataToStorage(data);
      const loadedProfiles = loadProfiles();
      setProfiles(loadedProfiles);
      setProfileDataMap(loadProfileDataMap(loadedProfiles));
      setSettings(prev => ({ ...prev, ...data.mud_settings }));
    },
    [setSettings]
  );

  const handleProfileDataSourceChange = useCallback(
    (profileId: string) => {
      setSettings(prev => ({ ...prev, profileDataSourceId: profileId }));

      if (!profileId) {
        showToast('Profile data source switched to connected profile.');
        return;
      }

      const profileName =
        profiles.find(profile => profile.id === profileId)?.name ||
        '(unnamed)';
      showToast(`Profile data source switched to ${profileName}.`);
    },
    [profiles, setSettings, showToast]
  );

  const handleProfilesChange = useCallback((updatedProfiles: MudProfile[]) => {
    setProfiles(updatedProfiles);
    saveProfiles(updatedProfiles);
    setProfileDataMap(prev => {
      const next: ProfileDataMap = {};
      for (const profile of updatedProfiles) {
        next[profile.id] = prev[profile.id] || emptyProfileData();
      }
      saveProfileDataMap(next);
      return next;
    });
  }, []);

  const handleProfileConnect = useCallback(
    (profile: MudProfile) => {
      setSettings(prev => ({
        ...prev,
        profileDataSourceId: profile.id,
      }));
      setSelectedProfile(profile);
    },
    [setSettings]
  );

  const handleDisconnect = useCallback(() => {
    if (!selectedProfile && !wsManager) return;

    setSelectedProfile(null);
    setWsManager(null);
    setStatus('Disconnected');
    setCanSend(false);
    resetStreamBuffers();
    terminal.write(formatSystemMessageForTerminal('[INFO] Disconnected'));
    announceConnection('Disconnected');
    document.title = 'Swiss Mud Client';
  }, [
    selectedProfile,
    wsManager,
    resetStreamBuffers,
    terminal,
    announceConnection,
  ]);

  useEffect(() => {
    const loadedProfiles = loadProfiles();
    setProfiles(loadedProfiles);
    setProfileDataMap(loadProfileDataMap(loadedProfiles));
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeProfileDataId) {
      setAliases([]);
      setAliasFolders([]);
      setTriggers([]);
      setTriggerFolders([]);
      setScripts([]);
      setScriptFolders([]);
      setVariables([]);
      setVariableFolders([]);
      return;
    }

    const data = getProfileData(profileDataMap, activeProfileDataId);
    setAliases(data.aliases);
    setAliasFolders(data.aliasFolders);
    setTriggers(data.triggers);
    setTriggerFolders(data.triggerFolders);
    setScripts(data.scripts);
    setScriptFolders(data.scriptFolders);
    setVariables(data.variables);
    setVariableFolders(data.variableFolders);
  }, [activeProfileDataId, profileDataMap, setVariables]);

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

    const resetOnCleanup = resetStreamBuffersRef.current;
    const manager = new WebSocketManager({
      onOpen: () => {
        resetStreamBuffersRef.current();
        setStatus('Connected');
        setCanSend(false);
        inputRef.current?.focus();
      },
      onClose: event => {
        resetStreamBuffersRef.current();
        const closeMessage = formatWebSocketClose(event);
        setStatus(`Disconnected (${event.code})`);
        setCanSend(false);
        terminal.write(formatSystemMessageForTerminal(closeMessage));
        announceConnectionRef.current('Disconnected');
      },
      onError: () => {
        setStatus('Error occurred');
        terminal.write(
          formatSystemMessageForTerminal('[ERROR] WebSocket error occurred')
        );
        announceConnectionRef.current('Connection error');
      },
      onMessage: (data: string) => {
        terminal.write(htmlChunkToTerminalText(data));
        ingestGameChunkRef.current(data);
      },
      onConnected: () => {
        setCanSend(true);
        if (selectedProfile) {
          announceConnectionRef.current(`Connected to ${selectedProfile.name}`);
          document.title = `${selectedProfile.name} - Swiss Mud Client`;
        }
      },
    });

    manager.connect(selectedProfile);
    setWsManager(manager);
    setWebSocketManager(manager);

    return () => {
      resetOnCleanup();
      manager.disconnect();
      document.title = 'Swiss Mud Client';
    };
  }, [
    selectedProfile,
    resetStreamBuffersRef,
    ingestGameChunkRef,
    announceConnectionRef,
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
          onProfileConnect={handleProfileConnect}
          onClearProfileData={handleClearProfileData}
          onDataImport={handleDataImport}
          onProfileDataSourceChange={handleProfileDataSourceChange}
          onProfilesChange={handleProfilesChange}
          onToast={showToast}
          activeProfileDataName={activeProfileDataName}
          aliases={aliases}
          aliasFolders={aliasFolders}
          canClearProfileData={Boolean(activeProfileDataId)}
          profiles={profiles}
          onAliasFoldersChange={handleAliasFoldersChange}
          onAliasesChange={handleAliasesChange}
          onScriptFoldersChange={handleScriptFoldersChange}
          onScriptsChange={handleScriptsChange}
          onTriggerFoldersChange={handleTriggerFoldersChange}
          onTriggersChange={handleTriggersChange}
          onVariableFoldersChange={handleVariableFoldersChange}
          onVariablesChange={handleVariablesChange}
          scriptFolders={scriptFolders}
          scripts={scripts}
          triggerFolders={triggerFolders}
          triggers={triggers}
          variableFolders={variableFolders}
          variables={variables}
        />
        <StatusBar
          appVersion={appVersion}
          canDisconnect={selectedProfile !== null || wsManager !== null}
          onDisconnect={handleDisconnect}
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
      <Toast message={toastMessage} />
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
