export type Mood = 1 | 2 | 3 | 4 | 5;

export type ResponseChoice = 'pause' | 'talk' | 'boundary' | 'let-go';

export type ResetMode = 'message' | 'conflict' | 'decision' | 'spiral';

export type Entry = {
  id: string;
  createdAt: string;
  mood: Mood;
  text: string;
  reflection: string;
  reflectionSource?: 'local' | 'cloud';
  mode?: ResetMode;
  intent?: string;
  howItMayLand?: string;
  betterDraft?: string;
  impactScore?: number;
  clarityScore?: number;
  agencyScore?: number;
  involvesPerson?: boolean;
  myPart?: string;
  theirSide?: string;
  gratitudes?: string[];
  nextMove?: string;
  responseChoice?: ResponseChoice;
};
