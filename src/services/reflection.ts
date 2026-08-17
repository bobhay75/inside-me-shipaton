import type { Mood, ResetMode, ResponseChoice } from '../types';
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

export type MirrorInput = {
  text: string;
  intent: string;
  mood: Mood;
  mode: ResetMode;
};

export type MirrorResult = {
  me: string;
  meX2: string;
  meBetter: string;
  impactScore: number;
  clarityScore: number;
  agencyScore: number;
  heatWords: string[];
  controlCue: string;
  source: 'local' | 'cloud';
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

const heatTerms = [
  'always',
  'never',
  'stupid',
  'idiot',
  'liar',
  'hate',
  'ridiculous',
  'pathetic',
  'fault',
  'whatever',
  'shut up',
];

function cleanSentence(value: string) {
  const cleaned = value
    .replace(/\b(always|never)\b/gi, 'often')
    .replace(/\b(stupid|idiot|pathetic)\b/gi, 'hurtful')
    .replace(/!{2,}/g, '!')
    .trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function localMirrorPreview(input: MirrorInput): MirrorResult {
  const combined = `${input.text} ${input.intent}`;
  const lowered = combined.toLowerCase();
  const heatWords = heatTerms.filter(term => lowered.includes(term));
  const punctuationHeat = (combined.match(/!/g) || []).length * 4 + (combined.match(/\b[A-Z]{3,}\b/g) || []).length * 5;
  const moodHeat = (6 - input.mood) * 8;
  const impactScore = Math.max(18, Math.min(94, 24 + moodHeat + heatWords.length * 9 + punctuationHeat));
  const clarityScore = Math.max(28, Math.min(92, input.intent.trim() ? 78 - heatWords.length * 4 : 48 - heatWords.length * 3));
  const agencyWords = /\b(i will|i can|i need|my boundary|i choose|i am going to)\b/i.test(combined);
  const blameWords = /\b(you made me|your fault|you need to|make you)\b/i.test(combined);
  const agencyScore = Math.max(24, Math.min(94, 58 + (agencyWords ? 22 : 0) - (blameWords ? 20 : 0)));

  const me = input.intent.trim()
    ? `You want them to understand: ${cleanSentence(input.intent)}`
    : `You want this moment to be taken seriously, not dismissed.`;

  const meX2 = impactScore >= 70
    ? 'Your truth may be getting buried under the heat. The other person may hear attack, pressure, or a verdict—and defend themselves before they hear your point.'
    : impactScore >= 45
      ? 'Your point is visible, but some of the emotion may land louder than the need underneath it.'
      : 'Your message is fairly controlled. It is likely to land as direct rather than explosive, especially if your delivery matches the words.';

  const cleaned = cleanSentence(input.text);
  const meBetter = input.intent.trim()
    ? `I want to say this clearly without turning it into a fight: ${cleanSentence(input.intent)}. I can own how I handle this, and I want us to decide what happens next.`
    : cleaned
      ? `I am worked up, so I want to say this carefully: ${cleaned} Can we slow this down and talk about what happens next?`
      : 'I want to be honest without making this worse. Here is what happened, here is what I need, and here is the part I can own.';

  return {
    me,
    meX2,
    meBetter,
    impactScore,
    clarityScore,
    agencyScore,
    heatWords,
    controlCue: blameWords
      ? 'Move one sentence from “you need to” toward “I will” or “I need.”'
      : 'Keep the truth. Remove the verdict. Name the next action you control.',
    source: 'local',
  };
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

export async function getMirrorPreview(input: MirrorInput, useCloud = false): Promise<MirrorResult> {
  const fallback = localMirrorPreview(input);
  const endpoint = reflectionEndpoint();
  if (!useCloud || !endpoint) return fallback;

  const mirrorEndpoint = endpoint.replace(/\/reflect\/?$/, '/mirror');
  try {
    const response = await fetchWithTimeout(mirrorEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }, 12_000);
    if (!response.ok) return fallback;
    const data = (await response.json()) as Partial<MirrorResult>;
    if (!data.me?.trim() || !data.meX2?.trim() || !data.meBetter?.trim()) return fallback;
    return {
      me: data.me.trim(),
      meX2: data.meX2.trim(),
      meBetter: data.meBetter.trim(),
      impactScore: Math.max(0, Math.min(100, Number(data.impactScore ?? fallback.impactScore))),
      clarityScore: Math.max(0, Math.min(100, Number(data.clarityScore ?? fallback.clarityScore))),
      agencyScore: Math.max(0, Math.min(100, Number(data.agencyScore ?? fallback.agencyScore))),
      heatWords: Array.isArray(data.heatWords) ? data.heatWords.slice(0, 6).map(String) : fallback.heatWords,
      controlCue: data.controlCue?.trim() || fallback.controlCue,
      source: 'cloud',
    };
  } catch {
    return fallback;
  }
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
