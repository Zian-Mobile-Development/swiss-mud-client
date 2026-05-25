import type {
  Alias,
  MudProfile,
  ProfileData,
  Script,
  Trigger,
  Variable,
} from '../types';
import {
  ensureListItemIds,
  normalizeListFolders,
} from './listFolders';

export const PROFILE_STORAGE_KEY = 'mud_profiles';
export const PROFILE_DATA_STORAGE_KEY = 'mud_profile_data';

export type ProfileDataMap = Record<string, ProfileData>;

export const emptyProfileData = (): ProfileData => ({
  aliases: [],
  aliasFolders: [],
  triggers: [],
  triggerFolders: [],
  scripts: [],
  scriptFolders: [],
  variables: [],
  variableFolders: [],
});

export function createProfileId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`;
}

export function ensureProfileIds(profiles: Partial<MudProfile>[]): MudProfile[] {
  const normalizePort = (port: MudProfile['port'] | undefined) => {
    if (port === '') return '';
    return Number(port) || 23;
  };

  return profiles.map(profile => ({
    id: profile.id || createProfileId(),
    name: profile.name || '',
    address: profile.address || '',
    port: normalizePort(profile.port),
    encoding: profile.encoding || 'utf8',
  }));
}

export function loadProfiles(): MudProfile[] {
  try {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    const profiles = Array.isArray(parsed) ? ensureProfileIds(parsed) : [];
    saveProfiles(profiles);
    return profiles;
  } catch (error) {
    console.error('Error loading profiles', error);
    return [];
  }
}

export function saveProfiles(profiles: MudProfile[]) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

export function loadProfileDataMap(profiles: MudProfile[]): ProfileDataMap {
  const stored = readJson<ProfileDataMap>(PROFILE_DATA_STORAGE_KEY, {});
  const hasStoredProfileData = Object.keys(stored).length > 0;
  const migratedLegacyData = hasStoredProfileData
    ? {}
    : legacyProfileData(profiles[0]?.id);
  const profileDataMap: ProfileDataMap = { ...stored, ...migratedLegacyData };

  for (const profile of profiles) {
    profileDataMap[profile.id] = normalizeProfileData(profileDataMap[profile.id]);
  }

  saveProfileDataMap(profileDataMap);
  return profileDataMap;
}

export function saveProfileDataMap(profileDataMap: ProfileDataMap) {
  localStorage.setItem(PROFILE_DATA_STORAGE_KEY, JSON.stringify(profileDataMap));
}

export function getProfileData(
  profileDataMap: ProfileDataMap,
  profileId: string
): ProfileData {
  return normalizeProfileData(profileDataMap[profileId]);
}

export function updateProfileData(
  profileDataMap: ProfileDataMap,
  profileId: string,
  data: Partial<ProfileData>
): ProfileDataMap {
  return {
    ...profileDataMap,
    [profileId]: {
      ...getProfileData(profileDataMap, profileId),
      ...data,
    },
  };
}

function normalizeProfileData(data?: Partial<ProfileData>): ProfileData {
  return {
    aliases: normalizePatterns(data?.aliases),
    aliasFolders: normalizeListFolders(data?.aliasFolders),
    triggers: normalizePatterns(data?.triggers),
    triggerFolders: normalizeListFolders(data?.triggerFolders),
    scripts: normalizeScripts(data?.scripts),
    scriptFolders: normalizeListFolders(data?.scriptFolders),
    variables: normalizeVariables(data?.variables),
    variableFolders: normalizeListFolders(data?.variableFolders),
  };
}

function normalizePatterns<T extends Alias | Trigger>(patterns?: T[]): T[] {
  return ensureListItemIds(
    Array.isArray(patterns)
      ? patterns.map(pattern => ({
          ...pattern,
          folderId: pattern.folderId ?? null,
          enabled: pattern.enabled ?? true,
        }))
      : []
  );
}

function normalizeScripts(scripts?: Script[]): Script[] {
  return ensureListItemIds(
    Array.isArray(scripts)
      ? scripts.map(script => ({
          ...script,
          folderId: script.folderId ?? null,
          enabled: script.enabled ?? true,
        }))
      : []
  );
}

function normalizeVariables(variables?: Variable[]): Variable[] {
  return ensureListItemIds(
    Array.isArray(variables)
      ? variables.map(variable => ({
          ...variable,
          folderId: variable.folderId ?? null,
        }))
      : []
  );
}

function legacyProfileData(profileId?: string): ProfileDataMap {
  if (!profileId) return {};

  const data: ProfileData = {
    aliases: normalizePatterns(readJson<Alias[]>('mud_aliases', [])),
    aliasFolders: [],
    triggers: normalizePatterns(readJson<Trigger[]>('mud_triggers', [])),
    triggerFolders: [],
    scripts: normalizeScripts(readJson<Script[]>('mud_scripts', [])),
    scriptFolders: [],
    variables: normalizeVariables(readJson<Variable[]>('mud_variables', [])),
    variableFolders: [],
  };

  return { [profileId]: data };
}

function readJson<T>(key: string, fallback: T): T {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) return fallback;

  try {
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Failed to parse ${key}:`, error);
    return fallback;
  }
}
