import type { Entry } from './types';

const modes = new Set(['now', 'trigger', 'belief', 'decision', 'identity']);
const revelationFields = ['facts', 'story', 'feeling', 'need', 'pattern', 'mine', 'notMine', 'choice', 'question', 'anchor'];
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Validate every field the current UI reads before publishing a saved journal.
// Reject the complete load rather than silently discarding user entries.
export function parseEntries(raw: string): Entry[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Journal is not an array.');
  for (const entry of parsed) {
    if (!record(entry) || typeof entry.id !== 'string' || !entry.id || typeof entry.createdAt !== 'string' || !Number.isFinite(Date.parse(entry.createdAt)) || typeof entry.text !== 'string' || typeof entry.reflection !== 'string' || typeof entry.mood !== 'number' || !Number.isInteger(entry.mood) || entry.mood < 1 || entry.mood > 5) throw new Error('Journal contains an invalid entry.');
    if (entry.growthMode !== undefined && !modes.has(String(entry.growthMode))) throw new Error('Journal contains an invalid journey.');
    if (entry.revelation !== undefined) {
      const revelation = entry.revelation;
      if (!record(revelation) || !revelationFields.every(field => typeof revelation[field] === 'string') || !Array.isArray(revelation.tags) || !revelation.tags.every(tag => typeof tag === 'string') || !['local', 'cloud'].includes(String(revelation.source))) throw new Error('Journal contains an invalid reflection.');
    }
  }
  return parsed as Entry[];
}
