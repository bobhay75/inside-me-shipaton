import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Entry } from './types';

const ENTRIES_KEY = 'inside-me.entries.v1';
const MEMORY_KEY = 'me-plus-u.memory-id.v1';

export async function loadEntries(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(ENTRIES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Entry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: Entry[]) {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export async function clearEntries() {
  await AsyncStorage.removeItem(ENTRIES_KEY);
}

export async function getMemoryId() {
  const existing = await AsyncStorage.getItem(MEMORY_KEY);
  if (existing) return existing;

  const created = `meu_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(MEMORY_KEY, created);
  return created;
}

export async function getExistingMemoryId() {
  return AsyncStorage.getItem(MEMORY_KEY);
}
