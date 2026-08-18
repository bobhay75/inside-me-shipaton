export type Mood = 1 | 2 | 3 | 4 | 5;

export type ResponseChoice = 'pause' | 'talk' | 'boundary' | 'let-go';

export type ResetMode = 'message' | 'conflict' | 'decision' | 'spiral';

export type GrowthMode = 'now' | 'trigger' | 'belief' | 'decision' | 'identity';

export type Revelation = {
  facts: string;
  story: string;
  feeling: string;
  need: string;
  pattern: string;
  mine: string;
  notMine: string;
  choice: string;
  question: string;
  anchor: string;
  tags: string[];
  source: 'local' | 'cloud';
};

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
  growthMode?: GrowthMode;
  revelation?: Revelation;
};
