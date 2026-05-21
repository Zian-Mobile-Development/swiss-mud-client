// managers/DataManager.ts
// Manages the data for the application.

import type {
  Alias,
  MudProfile,
  ProfileData,
  Settings,
  Trigger,
  Variable,
} from '../types';
import type { ProfileDataMap } from '../utils/ProfileDataStore';

export interface MudData {
  mud_profiles: Partial<MudProfile>[];
  mud_profile_data?: ProfileDataMap;
  mud_variables: Variable[];
  mud_aliases: Alias[];
  mud_triggers: Trigger[];
  mud_settings: Partial<Settings>;
}

export class DataManager {
  static async exportToFile() {
    const data = this.getDataFromStorage();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mud-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async exportToClipboard(): Promise<void> {
    const data = this.getDataFromStorage();
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  }

  static async importFromFile(file: File): Promise<MudData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (this.validateData(data)) {
            resolve(data);
          } else {
            reject(new Error('Invalid data format'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  static importFromText(text: string): MudData {
    const data = JSON.parse(text);
    if (this.validateData(data)) {
      return data;
    }
    throw new Error('Invalid data format');
  }

  static getDataFromStorage(): MudData {
    return {
      mud_profiles: JSON.parse(localStorage.getItem('mud_profiles') || '[]'),
      mud_profile_data: JSON.parse(
        localStorage.getItem('mud_profile_data') || '{}'
      ),
      mud_variables: JSON.parse(localStorage.getItem('mud_variables') || '[]'),
      mud_aliases: JSON.parse(localStorage.getItem('mud_aliases') || '[]'),
      mud_triggers: JSON.parse(localStorage.getItem('mud_triggers') || '[]'),
      mud_settings: JSON.parse(
        localStorage.getItem('mud_settings') ||
          JSON.stringify({
            highlightInputOnCommand: true,
            showCommandInOutput: true,
          })
      ),
    };
  }

  static saveDataToStorage(data: MudData) {
    localStorage.setItem('mud_profiles', JSON.stringify(data.mud_profiles));
    if (data.mud_profile_data) {
      localStorage.setItem(
        'mud_profile_data',
        JSON.stringify(data.mud_profile_data)
      );
    }
    localStorage.setItem('mud_variables', JSON.stringify(data.mud_variables));
    localStorage.setItem('mud_aliases', JSON.stringify(data.mud_aliases));
    localStorage.setItem('mud_triggers', JSON.stringify(data.mud_triggers));
    localStorage.setItem('mud_settings', JSON.stringify(data.mud_settings));
  }

  private static validateData(data: unknown): data is MudData {
    if (!data || typeof data !== 'object') return false;
    const candidate = data as Partial<MudData>;

    return (
      Array.isArray(candidate.mud_profiles) &&
      Array.isArray(candidate.mud_variables) &&
      Array.isArray(candidate.mud_aliases) &&
      Array.isArray(candidate.mud_triggers) &&
      typeof candidate.mud_settings === 'object' &&
      (candidate.mud_profile_data === undefined ||
        isProfileDataMap(candidate.mud_profile_data))
    );
  }
}

function isProfileDataMap(value: unknown): value is ProfileDataMap {
  if (!value || typeof value !== 'object') return false;

  return Object.values(value as Record<string, Partial<ProfileData>>).every(
    data =>
      (!data.aliases || Array.isArray(data.aliases)) &&
      (!data.triggers || Array.isArray(data.triggers)) &&
      (!data.scripts || Array.isArray(data.scripts)) &&
      (!data.variables || Array.isArray(data.variables))
  );
}
