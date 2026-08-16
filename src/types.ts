export type Mood = 1 | 2 | 3 | 4 | 5;

export type ResponseChoice = 'pause' | 'talk' | 'boundary' | 'let-go';

export type Entry = {
  id: string;
  createdAt: string;
  mood: Mood;
  text: string;
  reflection: string;
  involvesPerson?: boolean;
  myPart?: string;
  theirSide?: string;
  gratitudes?: string[];
  nextMove?: string;
  responseChoice?: ResponseChoice;
};
