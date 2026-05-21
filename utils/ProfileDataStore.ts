import type {
  Alias,
  MudProfile,
  ProfileData,
  Script,
  Trigger,
  Variable,
} from '../types';

export const PROFILE_STORAGE_KEY = 'mud_profiles';
export const PROFILE_DATA_STORAGE_KEY = 'mud_profile_data';

export type ProfileDataMap = Record<string, ProfileData>;

export const emptyProfileData = (): ProfileData => ({
  aliases: [],
  triggers: [],
  scripts: [],
  variables: [],
});

export function createProfileId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `profile-${Date.now()}`;
}

export function ensureProfileIds(profiles: Partial<MudProfile>[]): MudProfile[] {
  return profiles.map(profile => ({
    id: profile.id || createProfileId(),
    name: profile.name || '',
    address: profile.address || '',
    port: profile.port || 23,
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
    triggers: normalizePatterns(data?.triggers),
    scripts: normalizeScripts(data?.scripts),
    variables: Array.isArray(data?.variables) ? data.variables : [],
  };
}

function normalizePatterns<T extends Alias | Trigger>(patterns?: T[]): T[] {
  return Array.isArray(patterns)
    ? patterns.map(pattern => ({
        ...pattern,
        enabled: pattern.enabled ?? true,
      }))
    : [];
}

function normalizeScripts(scripts?: Script[]): Script[] {
  return Array.isArray(scripts)
    ? scripts.map(script => ({
        ...script,
        enabled: script.enabled ?? true,
      }))
    : [];
}

function legacyProfileData(profileId?: string): ProfileDataMap {
  if (!profileId) return {};

  const data: ProfileData = {
    aliases: normalizePatterns(readJson<Alias[]>('mud_aliases', [])),
    triggers: normalizePatterns(readJson<Trigger[]>('mud_triggers', [])),
    scripts: normalizeScripts(readJson<Script[]>('mud_scripts', [])),
    variables: readJson<Variable[]>('mud_variables', []),
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
