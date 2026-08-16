import type { Mood, ResponseChoice } from '../types';

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

export async function getReflection(input: ReflectionInput): Promise<{ reflection: string }> {
  const endpoint = process.env.EXPO_PUBLIC_REFLECTION_API_URL;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (response.ok) {
        const data = (await response.json()) as { reflection?: string };
        if (data.reflection?.trim()) return { reflection: data.reflection.trim() };
      }
    } catch {
      // Me+U stays useful when the optional remote reflection agent is unavailable.
    }
  }

  return { reflection: localReflection(input) };
}
