import type { Mood, ResponseChoice } from '../types';
import { getExistingMemoryId, getMemoryId } from '../storage';

export type ReflectionInput = {
  text: string;
  mood: Mood;
  involvesPerson: boolean;
  myPart: string;
  theirSide: string;
  gratitudes: string[];
  nextMove: string;
  responseChoice: ResponseChoice;
  memoryId?: string;
};

const choiceLabel: Record<ResponseChoice, string> = {
  pause: 'pause before responding',
  talk: 'have a calm conversation',
  boundary: 'set a clear boundary',
  'let-go': 'let this go for now',
};

const CLOUD_TIMEOUT_MS = 15_000;

function reflectionEndpoint() {
  return process.env.EXPO_PUBLIC_REFLECTION_API_URL?.trim() ?? '';
}

export function isCloudReflectionConfigured() {
  return Boolean(reflectionEndpoint());
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = CLOUD_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function hasUrgentRisk(text: string) {
  return /\b(kill myself|suicide|suicidal|hurt myself|hurt someone|kill him|kill her|kill them)\b/i.test(text);
}

function localReflection(input: ReflectionInput) {
  if (hasUrgentRisk(`${input.text} ${input.nextMove}`)) {
    return 'This sounds bigger than a reflection exercise. Do not handle an immediate risk of harm alone. Get immediate local emergency help or bring a trusted person physically near you before doing anything else.';
  }

  const lead: Record<Mood, string> = {
    1: 'This sounds like a hard moment.',
    2: 'There is real weight in what you wrote.',
    3: 'You seem caught between reactions right now.',
    4: 'You sound fairly steady while looking at this.',
    5: 'You sound grounded in this moment.',
  };

  const parts = [lead[input.mood]];

  if (input.myPart.trim()) {
    parts.push(`You named what belongs to you: ${input.myPart.trim()}`);
  }

  if (input.involvesPerson && input.theirSide.trim()) {
    parts.push(`You also made room for another possible perspective: ${input.theirSide.trim()}`);
  }

  const good = input.gratitudes.map(item => item.trim()).filter(Boolean);
  if (good.length) {
    parts.push(`You found ${good.length} thing${good.length === 1 ? '' : 's'} worth holding onto before reacting.`);
  }

  parts.push(`Your chosen direction is to ${choiceLabel[input.responseChoice]}.`);

  if (input.nextMove.trim()) {
    parts.push(`Your next healthy move, in your own words: ${input.nextMove.trim()}`);
  } else {
    parts.push('Before acting, name one sentence you can say or one action you can take without trying to control the other person.');
  }

  return parts.join(' ');
}

export type ReflectionResult = {
  reflection: string;
  source: 'local' | 'cloud';
};

export async function getReflection(
  input: ReflectionInput,
  useCloud = false,
): Promise<ReflectionResult> {
  const endpoint = reflectionEndpoint();

  if (useCloud && endpoint) {
    try {
      const memoryId = input.memoryId ?? (await getMemoryId());
      const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, memoryId }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reflection?: string };
        if (data.reflection?.trim()) {
          return { reflection: data.reflection.trim(), source: 'cloud' };
        }
      }
    } catch {
      // Fall through to a private, on-device reflection.
    }
  }

  return { reflection: localReflection(input), source: 'local' };
}


export async function deleteCloudMemory(): Promise<boolean> {
  const endpoint = reflectionEndpoint();
  if (!endpoint) return true;

  const memoryId = await getExistingMemoryId();
  if (!memoryId) return true;
  const memoryEndpoint = endpoint.replace(/\/reflect\/?$/, `/memory/${encodeURIComponent(memoryId)}`);

  try {
    const response = await fetchWithTimeout(memoryEndpoint, { method: 'DELETE' }, 10_000);
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}
