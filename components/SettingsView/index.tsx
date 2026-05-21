// components/SettingsView/index.tsx
// View for the settings.

import React from 'react';
import type { MudProfile, Settings, ScreenReaderVerbosity } from '../../types';
import styles from './styles.module.css';
import commonStyles from '../../styles/common.module.css';

interface SettingsViewProps {
  profiles: MudProfile[];
  settings: Settings;
  onChange: (settings: Settings) => void;
  onProfileDataSourceChange: (profileId: string) => void;
}

const FONT_FAMILIES = [
  { value: 'monospace', label: 'Monospace' },
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: 'Courier New, monospace', label: 'Courier New' },
  { value: 'Menlo, Monaco, monospace', label: 'Menlo / Monaco' },
  { value: 'Source Code Pro, monospace', label: 'Source Code Pro' },
  {
    value:
      "'Noto Sans Mono CJK SC', 'Noto Sans Mono', 'Noto Sans CJK SC', 'Microsoft YaHei Mono', 'monospace'",
    label: 'Noto Sans Mono CJK SC',
  },
  {
    value:
      "'Noto Sans Mono CJK TC', 'Noto Sans Mono', 'Noto Sans CJK TC', 'PingFang TC', 'monospace'",
    label: 'Noto Sans Mono CJK TC',
  },
  {
    value:
      "'Noto Sans Mono CJK JP', 'Noto Sans Mono', 'Noto Sans CJK JP', 'Meiryo', 'monospace'",
    label: 'Noto Sans Mono CJK JP',
  },
  {
    value:
      "'Noto Sans Mono CJK KR', 'Noto Sans Mono', 'Noto Sans CJK KR', 'Malgun Gothic', 'monospace'",
    label: 'Noto Sans Mono CJK KR',
  },
  { value: "'SimSun', 'NSimSun', 'monospace'", label: 'SimSun' },
  { value: "'MS Mincho', 'monospace'", label: 'MS Mincho' },
  { value: "'Batang', 'monospace'", label: 'Batang' },
  { value: "'MingLiU', 'PMingLiU', 'monospace'", label: 'MingLiU' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Times New Roman, Times, serif', label: 'Times New Roman' },
  {
    value: 'Palatino Linotype, Book Antiqua, Palatino, serif',
    label: 'Palatino',
  },
  { value: 'Garamond, serif', label: 'Garamond' },
  {
    value: "'PingFang SC', 'Noto Sans CJK SC', 'Microsoft YaHei', 'monospace'",
    label: 'PingFang SC',
  },
  {
    value:
      "'PingFang TC', 'Noto Sans CJK TC', 'Microsoft JhengHei', 'monospace'",
    label: 'PingFang TC',
  },
  {
    value:
      "'PingFang HK', 'Noto Sans CJK HK', 'Microsoft JhengHei', 'monospace'",
    label: 'PingFang HK',
  },
];

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.settingItem}>
      <label>
        {label}
        <div className={styles.toggleSwitch}>
          <input
            type='checkbox'
            checked={checked}
            onChange={onChange}
            disabled={disabled}
          />
          <span className={styles.toggleSlider} aria-hidden='true' />
        </div>
      </label>
    </div>
  );
}

export function SettingsView({
  profiles,
  settings,
  onChange,
  onProfileDataSourceChange,
}: SettingsViewProps) {
  const handleToggle = (
    key:
      | 'highlightInputOnCommand'
      | 'showCommandInOutput'
      | 'screenReaderEnabled'
      | 'announceConnectionStatus'
      | 'announcePromptLines'
  ) => {
    onChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  return (
    <div className={commonStyles.viewContainer}>
      <div className={commonStyles.detailsPanel}>
        <ToggleRow
          label='Highlight input on command'
          checked={settings.highlightInputOnCommand}
          onChange={() => handleToggle('highlightInputOnCommand')}
        />
        <ToggleRow
          label='Show command in output'
          checked={settings.showCommandInOutput}
          onChange={() => handleToggle('showCommandInOutput')}
        />
        <div className={styles.settingItem}>
          <label>
            Profile data source
            <select
              value={settings.profileDataSourceId}
              onChange={e => onProfileDataSourceChange(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              <option value=''>Use connected profile</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name || '(unnamed)'}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.settingItem}>
          <label>
            Output font family
            <select
              value={settings.fontFamily}
              onChange={e =>
                onChange({ ...settings, fontFamily: e.target.value })
              }
              style={{ marginLeft: 8 }}
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.settingItem}>
          <label>
            Output font size
            <input
              type='number'
              min='8'
              max='32'
              value={settings.fontSize}
              onChange={e =>
                onChange({
                  ...settings,
                  fontSize: parseInt(e.target.value) || 14,
                })
              }
              style={{ marginLeft: 8, width: '60px' }}
            />
          </label>
        </div>

        <section
          className={styles.settingsSection}
          aria-labelledby='screen-reader-settings-heading'
        >
          <h4
            id='screen-reader-settings-heading'
            className={styles.sectionHeading}
          >
            Screen reader
          </h4>
          <p className={styles.sectionDescription}>
            Controls how game text is spoken. Visual output is unchanged.
          </p>

          <ToggleRow
            label='Enable screen reader support'
            checked={settings.screenReaderEnabled}
            onChange={() => handleToggle('screenReaderEnabled')}
          />
          <div className={styles.settingItem}>
            <label>
              Announce game output
              <select
                value={settings.screenReaderVerbosity}
                disabled={!settings.screenReaderEnabled}
                onChange={e =>
                  onChange({
                    ...settings,
                    screenReaderVerbosity: e.target
                      .value as ScreenReaderVerbosity,
                  })
                }
                style={{ marginLeft: 8 }}
              >
                <option value='lines'>Full lines only</option>
                <option value='chunks'>As text arrives</option>
              </select>
            </label>
          </div>
          <ToggleRow
            label='Announce connection changes'
            checked={settings.announceConnectionStatus}
            onChange={() => handleToggle('announceConnectionStatus')}
            disabled={!settings.screenReaderEnabled}
          />
          <ToggleRow
            label='Announce prompts without newline'
            checked={settings.announcePromptLines}
            onChange={() => handleToggle('announcePromptLines')}
            disabled={
              !settings.screenReaderEnabled ||
              settings.screenReaderVerbosity !== 'lines'
            }
          />
        </section>
      </div>
    </div>
  );
}
