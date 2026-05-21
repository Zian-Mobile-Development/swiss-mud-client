export type Alias = Pattern;
export type Trigger = Pattern;

export interface Pattern {
  name: string;
  pattern: string; // regex string
  command: string; // multi-line, can use $1, $2, ... for capture groups
  enabled: boolean;
}

export interface Variable {
  name: string;
  value: string;
}

export interface MudProfile {
  id: string;
  name: string;
  address: string;
  port: number;
  encoding: string;
}

export interface ProfileData {
  aliases: Alias[];
  triggers: Trigger[];
  scripts: Script[];
  variables: Variable[];
}

export interface Command {
  type: 'command' | 'wait';
  content: string;
  waitTime?: number;
}

export type ScreenReaderVerbosity = 'lines' | 'chunks';

export interface Settings {
  highlightInputOnCommand: boolean; // highlight the input when a command is sent
  showCommandInOutput: boolean; // show the command in the output
  fontFamily: string; // Font family for output
  fontSize: number; // Font size for output in pixels
  screenReaderEnabled: boolean;
  screenReaderVerbosity: ScreenReaderVerbosity;
  announceConnectionStatus: boolean;
  announcePromptLines: boolean;
  profileDataSourceId: string;
}

export const DEFAULT_SETTINGS: Settings = {
  highlightInputOnCommand: true,
  showCommandInOutput: true,
  fontFamily: 'monospace',
  fontSize: 14,
  screenReaderEnabled: true,
  screenReaderVerbosity: 'lines',
  announceConnectionStatus: true,
  announcePromptLines: true,
  profileDataSourceId: '',
};

export interface Script {
  name: string;
  event: string;
  command: string;
  enabled: boolean;
}
