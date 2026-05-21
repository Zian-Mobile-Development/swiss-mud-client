// components/Menu/index.tsx
// Menu for the application.

import React, { useState, useRef, useEffect } from 'react';
import styles from './styles.module.css';
import type { Alias, Trigger, Script, MudProfile, Variable } from '../../types';
import ConnectView from '../ConnectView';
import AliasView from '../AliasView';
import TriggerView from '../TriggerView';
import VariableView from '../VariableView';
import DataView from '../DataView';
import { SettingsView } from '../SettingsView';
import type { MudData } from '../../managers/DataManager';
import { useAppContext } from '../../contexts/AppContext';
import ScriptView from '../ScriptView';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type MenuButton = {
  id: string;
  label: string;
  icon: string;
};

const menuButtons: MenuButton[] = [
  { id: 'connect', label: 'Connect', icon: '🔌' },
  { id: 'triggers', label: 'Triggers', icon: '⚡' },
  { id: 'alias', label: 'Alias', icon: '📝' },
  { id: 'scripts', label: 'Scripts', icon: '📜' },
  { id: 'variables', label: 'Variables', icon: '📊' },
  { id: 'data', label: 'Data', icon: '💾' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

type PopupProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  setActivePopup: (id: string) => void;
  activePopup: string | null;
};

function Popup({
  isOpen,
  onClose,
  title,
  children,
  setActivePopup,
  activePopup,
}: PopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  useFocusTrap(popupRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className={styles.popupOverlay}
      onClick={onClose}
      role='presentation'
    >
      <div
        ref={popupRef}
        className={styles.popup}
        onClick={e => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-labelledby='popup-title'
      >
        <div className={styles.popupHeader}>
          <h3 id='popup-title'>{title}</h3>
          <button
            type='button'
            className={styles.closeButton}
            onClick={onClose}
            aria-label='Close dialog'
          >
            <span className={styles.buttonIcon} aria-hidden='true'>
              ✕
            </span>
          </button>
        </div>
        <div className={styles.popupNav} role='tablist' aria-label='Dialog sections'>
          {menuButtons.map(button => (
            <button
              key={button.id}
              type='button'
              id={`${button.id}-tab`}
              className={styles.popupNavButton}
              onClick={() => setActivePopup(button.id)}
              role='tab'
              aria-selected={activePopup === button.id}
              aria-controls={`${button.id}-panel`}
            >
              <span className={styles.popupNavIcon} aria-hidden='true'>
                {button.icon}
              </span>
              <span className={styles.popupNavLabel}>{button.label}</span>
            </button>
          ))}
        </div>
        <div
          className={styles.popupContent}
          role='tabpanel'
          id={`${activePopup}-panel`}
          aria-labelledby={`${activePopup}-tab`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function Menu({
  onProfileConnect,
  onClearProfileData,
  onDataImport,
  onProfileDataSourceChange,
  onProfilesChange,
  onToast,
  activeProfileDataName,
  aliases,
  canClearProfileData,
  profiles,
  setAliases,
  triggers,
  setTriggers,
  scripts,
  setScripts,
  variables,
  setVariables,
}: {
  onProfileConnect?: (profile: MudProfile) => void;
  onClearProfileData: () => void;
  onDataImport: (data: MudData) => void;
  onProfileDataSourceChange: (profileId: string) => void;
  onProfilesChange: (profiles: MudProfile[]) => void;
  onToast: (message: string) => void;
  activeProfileDataName: string;
  canClearProfileData: boolean;
  aliases: Alias[];
  profiles: MudProfile[];
  setAliases: (aliases: Alias[]) => void;
  triggers: Trigger[];
  setTriggers: (triggers: Trigger[]) => void;
  scripts: Script[];
  setScripts: (scripts: Script[]) => void;
  variables: Variable[];
  setVariables: (variables: Variable[]) => void;
}) {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { settings, setSettings } = useAppContext();
  const lastMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  const aliasSaveRef = useRef<{ save: () => void } | null>(null);
  const triggerSaveRef = useRef<{ save: () => void } | null>(null);
  const scriptSaveRef = useRef<{ save: () => void } | null>(null);
  const variableSaveRef = useRef<{ save: () => void } | null>(null);
  const connectSaveRef = useRef<{ save: () => void } | null>(null);

  useEffect(() => {
    if (!activePopup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setActivePopup(null);
        return;
      }
      if ((e.key === 's' || e.key === 'S') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (activePopup === 'alias' && aliasSaveRef.current) {
          aliasSaveRef.current.save();
        } else if (activePopup === 'triggers' && triggerSaveRef.current) {
          triggerSaveRef.current.save();
        } else if (activePopup === 'scripts' && scriptSaveRef.current) {
          scriptSaveRef.current.save();
        } else if (activePopup === 'variables' && variableSaveRef.current) {
          variableSaveRef.current.save();
        } else if (activePopup === 'connect' && connectSaveRef.current) {
          connectSaveRef.current.save();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePopup]);

  const handleButtonClick = (id: string, button: HTMLButtonElement | null) => {
    lastMenuButtonRef.current = button;
    setActivePopup(id);
  };

  const handleClose = () => {
    setActivePopup(null);
    lastMenuButtonRef.current?.focus();
  };

  const handleProfileConnect = (profile: MudProfile) => {
    onProfileConnect?.(profile);
    setActivePopup(null);
    lastMenuButtonRef.current?.focus();
  };

  return (
    <nav className={styles.menu} aria-label='Main menu'>
      {menuButtons.map(button => (
        <button
          key={button.id}
          type='button'
          className={styles.menuButton}
          onClick={e => handleButtonClick(button.id, e.currentTarget)}
          aria-label={button.label}
          aria-haspopup='dialog'
          aria-expanded={activePopup === button.id}
        >
          <span className={styles.buttonIcon} aria-hidden='true'>
            {button.icon}
          </span>
          <span className={styles.buttonLabel}>{button.label}</span>
        </button>
      ))}

      <Popup
        isOpen={activePopup === 'connect'}
        onClose={handleClose}
        title='Connect'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <ConnectView
          profiles={profiles}
          onConnect={handleProfileConnect}
          onProfilesChange={onProfilesChange}
          saveRef={connectSaveRef}
        />
      </Popup>

      <Popup
        isOpen={activePopup === 'triggers'}
        onClose={handleClose}
        title='Triggers'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <TriggerView
          triggers={triggers}
          onChange={setTriggers}
          saveRef={triggerSaveRef}
        />
      </Popup>

      <Popup
        isOpen={activePopup === 'alias'}
        onClose={handleClose}
        title='Aliases'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <AliasView
          aliases={aliases}
          onChange={setAliases}
          saveRef={aliasSaveRef}
        />
      </Popup>

      <Popup
        isOpen={activePopup === 'scripts'}
        onClose={handleClose}
        title='Scripts'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <ScriptView
          scripts={scripts}
          onChange={setScripts}
          saveRef={scriptSaveRef}
        />
      </Popup>

      <Popup
        isOpen={activePopup === 'variables'}
        onClose={handleClose}
        title='Variables'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <VariableView
          variables={variables}
          onChange={setVariables}
          saveRef={variableSaveRef}
        />
      </Popup>

      <Popup
        isOpen={activePopup === 'data'}
        onClose={handleClose}
        title='Data Management'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <DataView
          activeProfileName={activeProfileDataName}
          canClearProfileData={canClearProfileData}
          onClearProfileData={onClearProfileData}
          onImport={onDataImport}
          onToast={onToast}
        />
      </Popup>

      <Popup
        isOpen={activePopup === 'settings'}
        onClose={handleClose}
        title='Settings'
        setActivePopup={setActivePopup}
        activePopup={activePopup}
      >
        <SettingsView
          settings={settings}
          onChange={setSettings}
          profiles={profiles}
          onProfileDataSourceChange={onProfileDataSourceChange}
        />
      </Popup>
    </nav>
  );
}
