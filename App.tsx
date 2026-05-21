// App.tsx
// Main component for the application.

import React, { useEffect, useRef, useState } from 'react';
import { Menu } from './components/Menu';
import type { MudProfile } from './components/ConnectView';
import styles from './App.module.css';
import classNames from 'classnames';
import { CommandEngine } from './engines/CommandEngine';
import { WebSocketManager } from './managers/WebSocketManager';
import { Alias, Trigger, Settings, Script } from './types';
import { handleCommandInput } from './utils/CommandHandler';
import { setWebSocketManager, send } from './utils/CommandAction';
import { useAppContext } from './contexts/AppContext';
import { stripHtmlTags } from './utils/TextUtils';
import { ON_SCREEN_CMD_LIMIT } from './constants';
import { ClientCommandManager } from './utils/ClientCommands';

const OUTPUT_CHAR_LIMIT = ON_SCREEN_CMD_LIMIT * 2000;

function trimOutput(html: string): string {
  return html.length > OUTPUT_CHAR_LIMIT
    ? html.slice(-OUTPUT_CHAR_LIMIT)
    : html;
}

function App() {
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('Disconnected');
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
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [triggersEnabled, setTriggersEnabled] = useState(true);
  const clientCommands = useRef(new ClientCommandManager());

  const [line, setLine] = useState<string>('');

  // Retrieve app version from environment variables
  const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.0.0-dev';

  // Add iOS viewport adjustment
  useEffect(() => {
    // Set viewport meta tag for mobile devices
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content =
      'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0';
    document.head.appendChild(viewportMeta);

    // Add viewport height listener for iOS
    const handleResize = () => {
      // Small delay to let Safari UI settle
      setTimeout(() => {
        setViewportHeight(window.innerHeight);
        // Force scroll to bottom if locked
        if (isLockedToBottom && outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }, 100);
    };

    // Handle orientation changes specifically
    const handleOrientationChange = () => {
      // Longer delay for orientation changes
      setTimeout(handleResize, 300);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // iOS-specific fix for virtual keyboard
    if (inputRef.current) {
      inputRef.current.addEventListener('focus', () => {
        // Small delay to let keyboard appear
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

  // Initialize command engine
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
          onCommandSend: (command: string, settings: Settings) => {
            if (settings.showCommandInOutput) {
              setOutputHtml(prev =>
                trimOutput(
                  prev + `<div class="user-cmd">&gt; ${command}</div>`
                )
              );
            }

            // Send the command to the MUD server
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

  // Update the CommandEngine when aliases change
  useEffect(() => {
    if (commandEngine) {
      commandEngine.setAliases(aliases);
    }
  }, [aliases]);

  // Update the CommandEngine when variables change
  useEffect(() => {
    if (commandEngine) {
      commandEngine.setVariables(variables);
    }
  }, [variables]);

  // Update the CommandEngine when triggers change
  useEffect(() => {
    if (commandEngine) {
      commandEngine.setTriggers(triggers);
    }
  }, [triggers]);

  // Update the CommandEngine when scripts change
  useEffect(() => {
    if (commandEngine) {
      commandEngine.setScripts(scripts);
    }
  }, [scripts]);

  useEffect(() => {
    if (commandEngine) {
      commandEngine.setSettings(settings);
    }
  }, [settings]);

  // Process incoming line with triggers
  useEffect(() => {
    if (line && commandEngine && triggersEnabled) {
      commandEngine.processPattern(line, 'trigger');
    }
  }, [line, triggersEnabled]);

  // Setup WebSocket connection when a profile is selected
  useEffect(() => {
    if (!selectedProfile) return;

    const manager = new WebSocketManager({
      onOpen: () => {
        setStatus('Connected');
        setCanSend(false);
        inputRef.current?.focus();
      },
      onClose: () => {
        setStatus('Disconnected');
        setCanSend(false);
      },
      onError: () => setStatus('Error occurred'),
      onMessage: (data: string) => {
        setOutputHtml(prev => trimOutput(prev + data));

        const msgData = stripHtmlTags(data);
        setLine(msgData);
      },
      onConnected: () => setCanSend(true),
    });

    manager.connect(selectedProfile);
    setWsManager(manager);

    // Set the WebSocketManager in commands.ts
    setWebSocketManager(manager);

    return () => {
      manager.disconnect();
    };
  }, [selectedProfile]);

  // Handle scrolling behavior
  const handleOutputScroll = () => {
    if (!outputRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = outputRef.current;

    // If the user is within 300px of the bottom, consider it locked
    if (scrollHeight - scrollTop - clientHeight < 300) {
      setIsLockedToBottom(true);
    } else {
      setIsLockedToBottom(false);
    }
  };

  // Auto-scroll to bottom when messages update (if locked)
  useEffect(() => {
    if (isLockedToBottom && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputHtml, isLockedToBottom]);

  // Initialize client commands
  useEffect(() => {
    clientCommands.current.setClearScreenHandler(() => {
      setOutputHtml('');
    });
  }, []);

  // Handle keyboard input
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!commandEngine || !wsManager) return;

    if (e.key === 'Enter') {
      const command = e.currentTarget.value.trim();

      // Try to execute client command first
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
          // Only add the command if it's different from the previous one
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

    // After handling the command, re-focus/select the input if Enter was pressed
    if (e.key === 'Enter') {
      setTimeout(() => {
        // Highlight input if enabled
        if (settings.highlightInputOnCommand) {
          inputRef.current?.select();
        } else {
          //clear the input
          inputRef.current!.value = '';
        }

        // Snap to bottom when Enter is pressed
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }, 0);
    }
  };

  return (
    <div
      className={styles.main}
      style={{ height: `${viewportHeight}px` }}
      role='application'
      aria-label='Swiss Mud Client'
    >
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
        role='status'
      >
        <span className={styles.statusText}>
          {selectedProfile
            ? `${status} (${selectedProfile.name})`
            : 'No profile selected'}
        </span>
        <span className={styles.versionText}>v{appVersion}</span>
      </div>
      <div className={styles.container} role='main'>
        <div
          ref={outputRef}
          className={styles.output}
          style={{
            fontFamily: settings.fontFamily,
            fontSize: `${settings.fontSize}px`,
          }}
          onClick={() => {
            inputRef.current?.focus();
          }}
          onScroll={handleOutputScroll}
          role='log'
          aria-label='Game output'
          aria-live='polite'
          tabIndex={0}
        >
          <div dangerouslySetInnerHTML={{ __html: outputHtml }} />
        </div>
        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type='text'
            className={styles.input}
            placeholder='Type your command here...'
            onKeyDown={handleKeyDown}
            disabled={!canSend}
            aria-label='Command input'
            aria-disabled={!canSend}
            autoCorrect='off'
            autoComplete='off'
            spellCheck='false'
          />
          <button
            className={classNames(styles.triggerToggle, {
              [styles.triggerToggleDisabled]: !triggersEnabled,
            })}
            onClick={() => setTriggersEnabled(!triggersEnabled)}
            aria-label={
              triggersEnabled ? 'Disable triggers' : 'Enable triggers'
            }
            title={triggersEnabled ? 'Disable triggers' : 'Enable triggers'}
          >
            {triggersEnabled ? '🔔' : '🔕'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
