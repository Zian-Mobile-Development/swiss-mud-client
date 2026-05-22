// components/Menu/index.tsx
// Menu for the application.

import React, { useState, useRef, useEffect } from 'react';
import styles from './styles.module.css';
import type {
  Alias,
  ListFolder,
  MudProfile,
  Script,
  Trigger,
  Variable,
} from '../../types';
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
import { MENU_ITEMS } from '../../config/menuIcons';
import { X } from 'lucide-react';
import { MenuTileButton } from './MenuTileButton';

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
            <X className={styles.tileIcon} size={24} aria-hidden />
          </button>
        </div>
        <div className={styles.popupNav} role='tablist' aria-label='Dialog sections'>
          {MENU_ITEMS.map(({ id, label, icon }) => (
            <MenuTileButton
              key={id}
              id={`${id}-tab`}
              variant='popup'
              icon={icon}
              label={label}
              iconSize={18}
              onClick={() => setActivePopup(id)}
              role='tab'
              aria-selected={activePopup === id}
              aria-controls={`${id}-panel`}
            />
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
  aliasFolders,
  canClearProfileData,
  onAliasFoldersChange,
  onAliasesChange,
  onScriptFoldersChange,
  onScriptsChange,
  onTriggerFoldersChange,
  onTriggersChange,
  onVariableFoldersChange,
  onVariablesChange,
  profiles,
  scriptFolders,
  scripts,
  triggerFolders,
  triggers,
  variableFolders,
  variables,
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
  aliasFolders: ListFolder[];
  onAliasesChange: (aliases: Alias[]) => void;
  onAliasFoldersChange: (folders: ListFolder[]) => void;
  profiles: MudProfile[];
  triggers: Trigger[];
  triggerFolders: ListFolder[];
  onTriggersChange: (triggers: Trigger[]) => void;
  onTriggerFoldersChange: (folders: ListFolder[]) => void;
  scripts: Script[];
  scriptFolders: ListFolder[];
  onScriptsChange: (scripts: Script[]) => void;
  onScriptFoldersChange: (folders: ListFolder[]) => void;
  variables: Variable[];
  variableFolders: ListFolder[];
  onVariablesChange: (variables: Variable[]) => void;
  onVariableFoldersChange: (folders: ListFolder[]) => void;
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
      {MENU_ITEMS.map(({ id, label, icon }) => (
        <MenuTileButton
          key={id}
          variant='menu'
          icon={icon}
          label={label}
          iconSize={22}
          onClick={e => handleButtonClick(id, e.currentTarget)}
          aria-label={label}
          aria-haspopup='dialog'
          aria-expanded={activePopup === id}
        />
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
          folders={triggerFolders}
          onTriggersChange={onTriggersChange}
          onFoldersChange={onTriggerFoldersChange}
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
          folders={aliasFolders}
          onAliasesChange={onAliasesChange}
          onFoldersChange={onAliasFoldersChange}
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
          folders={scriptFolders}
          onScriptsChange={onScriptsChange}
          onFoldersChange={onScriptFoldersChange}
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
          folders={variableFolders}
          onVariablesChange={onVariablesChange}
          onFoldersChange={onVariableFoldersChange}
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
