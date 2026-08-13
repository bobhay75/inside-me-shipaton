import type { Mood } from '../types';

function localReflection(text: string, mood: Mood) {
  const trimmed = text.trim();
  if (!trimmed) return 'Name one thing that affected your mood today, even if it seems small.';

  const lead: Record<Mood, string> = {
    1: 'This sounds like a difficult moment.',
    2: 'There seems to be some weight in what you wrote.',
    3: 'You sound somewhere in the middle right now.',
    4: 'There is some positive energy in this entry.',
    5: 'You sound strongly positive in this moment.',
  };

  return `${lead[mood]} What part of this situation can you name clearly, and what part are you still unsure about?`;
}

export async function getReflection(text: string, mood: Mood): Promise<{ reflection: string }> {
  const endpoint = process.env.EXPO_PUBLIC_REFLECTION_API_URL;
  if (endpoint) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mood }),
      });
      if (response.ok) {
        const data = (await response.json()) as { reflection?: string };
        if (data.reflection?.trim()) return { reflection: data.reflection.trim() };
      }
    } catch {
      // Keep the journal useful even when the optional remote reflection service is unavailable.
    }
  }

  return { reflection: localReflection(text, mood) };
}
