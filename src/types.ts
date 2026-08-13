export type Mood = 1 | 2 | 3 | 4 | 5;

export type Entry = {
  id: string;
  createdAt: string;
  mood: Mood;
  text: string;
  reflection: string;
};
