import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyUserProfile, type UserProfile } from '@/types/profile';

const PROFILE_KEY = 'loadtoad.profile.v1';

export async function loadUserProfile(): Promise<UserProfile> {
  const saved = await AsyncStorage.getItem(PROFILE_KEY);

  if (!saved) {
    return emptyUserProfile;
  }

  try {
    const parsed = JSON.parse(saved) as Partial<UserProfile>;

    return {
      ...emptyUserProfile,
      ...parsed,
      baseline: {
        ...emptyUserProfile.baseline,
        ...(parsed.baseline ?? {}),
      },
      equipment: parsed.equipment ?? [],
      trainingDays: parsed.trainingDays ?? [],
      movementRestrictions: parsed.movementRestrictions ?? [],
    };
  } catch {
    return emptyUserProfile;
  }
}

export async function saveUserProfile(profile: UserProfile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearUserProfile() {
  await AsyncStorage.removeItem(PROFILE_KEY);
}
