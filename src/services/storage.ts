import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: 等 SDK 55 稳定后改回 SecureStore
// import * as SecureStore from 'expo-secure-store';

import type { Session, UserProfile } from '@/src/models/types';

/**
 * 取舍说明：
 * - **authToken** 暂存 AsyncStorage（等 SDK 55 稳定后再改回 SecureStore）。
 * - **onboardingSeen / userProfile** 放 AsyncStorage。
 */

const KEYS = {
  onboardingSeen: 'huiMeng.onboardingSeen',
  userProfile: 'huiMeng.userProfile',
  session: 'huiMeng.session',
  authToken: 'huiMeng.authToken',
  refreshToken: 'huiMeng.refreshToken',
} as const;

export const storage = {
  async getOnboardingSeen(): Promise<boolean> {
    const v = await AsyncStorage.getItem(KEYS.onboardingSeen);
    return v === 'true';
  },
  async setOnboardingSeen(seen: boolean) {
    await AsyncStorage.setItem(KEYS.onboardingSeen, String(seen));
  },

  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.authToken);
    // TODO: 改回：return await SecureStore.getItemAsync(KEYS.authToken);
  },
  async setAuthToken(token: string) {
    await AsyncStorage.setItem(KEYS.authToken, token);
    // TODO: 改回：await SecureStore.setItemAsync(KEYS.authToken, token);
  },
  async clearAuthToken() {
    await AsyncStorage.removeItem(KEYS.authToken);
    // TODO: 改回：await SecureStore.deleteItemAsync(KEYS.authToken);
  },

  async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(KEYS.refreshToken);
  },
  async setRefreshToken(token: string) {
    await AsyncStorage.setItem(KEYS.refreshToken, token);
  },
  async clearRefreshToken() {
    await AsyncStorage.removeItem(KEYS.refreshToken);
  },

  async getSession(): Promise<Session | null> {
    const raw = await AsyncStorage.getItem(KEYS.session);
    return raw ? (JSON.parse(raw) as Session) : null;
  },
  async setSession(session: Session) {
    await AsyncStorage.setItem(KEYS.session, JSON.stringify(session));
  },
  async clearSession() {
    await AsyncStorage.removeItem(KEYS.session);
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const raw = await AsyncStorage.getItem(KEYS.userProfile);
    return raw ? (JSON.parse(raw) as User) : null;
  },
  async setUserProfile(profile: UserProfile) {
    await AsyncStorage.setItem(KEYS.userProfile, JSON.stringify(profile));
  },
  async clearUserProfile() {
    await AsyncStorage.removeItem(KEYS.userProfile);
  },
};

