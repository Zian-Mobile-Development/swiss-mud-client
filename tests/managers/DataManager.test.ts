import { DataManager, type MudData } from '../../managers/DataManager';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

const storage = new MemoryStorage();
const writeText = jest.fn();

Object.defineProperty(globalThis, 'localStorage', {
  value: storage,
  configurable: true,
});

Object.defineProperty(globalThis, 'navigator', {
  value: {
    clipboard: {
      writeText,
    },
  },
  configurable: true,
});

describe('DataManager', () => {
  beforeEach(() => {
    storage.clear();
    writeText.mockClear();
  });

  it('exports profile-scoped folder data and legacy scripts', () => {
    localStorage.setItem(
      'mud_profiles',
      JSON.stringify([
        {
          id: 'profile-1',
          name: 'Swiss',
          address: 'example.test',
          port: 23,
          encoding: 'utf8',
        },
      ])
    );
    localStorage.setItem(
      'mud_profile_data',
      JSON.stringify({
        'profile-1': {
          aliasFolders: [{ id: 'alias-folder-1', name: 'Travel' }],
          aliases: [
            {
              id: 'alias-1',
              folderId: 'alias-folder-1',
              name: 'go',
              pattern: '^go$',
              command: 'north',
              enabled: true,
            },
          ],
          triggerFolders: [],
          triggers: [],
          scriptFolders: [{ id: 'script-folder-1', name: 'Login' }],
          scripts: [
            {
              id: 'script-1',
              folderId: 'script-folder-1',
              name: 'login',
              event: 'connected',
              command: 'look',
              enabled: true,
            },
          ],
          variableFolders: [],
          variables: [],
        },
      })
    );
    localStorage.setItem(
      'mud_scripts',
      JSON.stringify([
        {
          name: 'legacy script',
          event: 'connected',
          command: 'look',
          enabled: true,
        },
      ])
    );
    localStorage.setItem('mud_variables', '[]');
    localStorage.setItem('mud_aliases', '[]');
    localStorage.setItem('mud_triggers', '[]');
    localStorage.setItem('mud_settings', '{}');

    const data = DataManager.getDataFromStorage();

    expect(data.mud_profile_data?.['profile-1'].aliasFolders).toEqual([
      { id: 'alias-folder-1', name: 'Travel', parentId: null },
    ]);
    expect(data.mud_profile_data?.['profile-1'].scripts[0].folderId).toBe(
      'script-folder-1'
    );
    expect(data.mud_scripts?.[0].name).toBe('legacy script');
  });

  it('imports folder-aware profile data', () => {
    const data: MudData = {
      mud_profiles: [{ id: 'profile-1', name: 'Swiss' }],
      mud_profile_data: {
        'profile-1': {
          aliasFolders: [{ id: 'alias-folder-1', name: 'Travel' }],
          aliases: [],
          triggerFolders: [],
          triggers: [],
          scriptFolders: [],
          scripts: [],
          variableFolders: [{ id: 'variable-folder-1', name: 'Combat' }],
          variables: [],
        },
      },
      mud_variables: [],
      mud_aliases: [],
      mud_triggers: [],
      mud_scripts: [],
      mud_settings: {},
    };

    expect(DataManager.importFromText(JSON.stringify(data))).toEqual(data);
  });

  it('clears profile data when importing a legacy backup', () => {
    localStorage.setItem(
      'mud_profile_data',
      JSON.stringify({
        stale: {
          aliases: [{ name: 'stale', pattern: '', command: '', enabled: true }],
        },
      })
    );

    DataManager.saveDataToStorage({
      mud_profiles: [{ id: 'profile-1', name: 'Swiss' }],
      mud_variables: [],
      mud_aliases: [],
      mud_triggers: [],
      mud_scripts: [],
      mud_settings: {},
    });

    expect(localStorage.getItem('mud_profile_data')).toBeNull();
    expect(localStorage.getItem('mud_scripts')).toBe('[]');
  });

  it('exports migrated folder-aware data to clipboard', async () => {
    localStorage.setItem(
      'mud_profiles',
      JSON.stringify([
        {
          id: 'profile-1',
          name: 'Swiss',
          address: 'example.test',
          port: 23,
          encoding: 'utf8',
        },
      ])
    );
    localStorage.setItem(
      'mud_aliases',
      JSON.stringify([
        {
          id: 'alias-1',
          name: 'go',
          pattern: '^go$',
          command: 'north',
          enabled: true,
        },
      ])
    );
    localStorage.setItem('mud_variables', '[]');
    localStorage.setItem('mud_triggers', '[]');
    localStorage.setItem('mud_scripts', '[]');
    localStorage.setItem('mud_settings', '{}');

    await DataManager.exportToClipboard();

    const exported = JSON.parse(writeText.mock.calls[0][0]);
    expect(exported.mud_profile_data['profile-1']).toMatchObject({
      aliasFolders: [],
      aliases: [
        {
          id: 'alias-1',
          folderId: null,
          name: 'go',
          pattern: '^go$',
          command: 'north',
          enabled: true,
        },
      ],
      triggerFolders: [],
      scriptFolders: [],
      variableFolders: [],
    });
  });
});
