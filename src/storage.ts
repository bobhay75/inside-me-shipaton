import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from './types';

const KEY = 'inside-me.entries.v1';

export async function loadEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: Entry[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
}

export async function clearEntries() {
  await AsyncStorage.removeItem(KEY);
}
