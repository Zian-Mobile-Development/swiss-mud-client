// contexts/AppContext.tsx
// Context for the application.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Variable, Settings, DEFAULT_SETTINGS } from '../types';

interface AppContextType {
  variables: Variable[];
  setVariables: React.Dispatch<React.SetStateAction<Variable[]>>;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [variables, setVariables] = useState<Variable[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // Load variables from localStorage on mount
  useEffect(() => {
    const storedVariables = localStorage.getItem('mud_variables');
    if (storedVariables) {
      try {
        const parsedVariables = JSON.parse(storedVariables);
        setVariables(parsedVariables);
      } catch (e) {
        console.error('Failed to parse variables:', e);
      }
    }

    const storeSettings = localStorage.getItem('mud_settings');
    if (storeSettings) {
      try {
        const parsedSettings = JSON.parse(storeSettings);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          fontSize: parsedSettings.fontSize || DEFAULT_SETTINGS.fontSize,
        });
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (variables.length > 0) {
      localStorage.setItem('mud_variables', JSON.stringify(variables));
    }
  }, [variables]);

  useEffect(() => {
    if (settings) {
      localStorage.setItem('mud_settings', JSON.stringify(settings));
    }
  }, [settings]);

  return (
    <AppContext.Provider
      value={{ variables, setVariables, settings, setSettings }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within a AppContextProvider');
  }
  return context;
}
