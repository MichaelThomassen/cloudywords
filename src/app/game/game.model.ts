export enum AppStatus {
  Game = 'game',
  Stats = 'stats',
  Options = 'options',
  About = 'about',
  Help = 'help',
  OutOfWords = 'outofwords',
  Meta = 'meta',
  Archive = 'archive',
}

export enum GameMode {
  Daily = 'daily',
  Practice = 'practice',
  DailyArchive = 'dailyArchive',
}

export interface GameProgress {
  guessedLetters: string[];
  removedLetters: string[];
  boostActive?: boolean;
  dailyArchiveIndex?: number;
  dailyIndex?: number;
}

export interface AppState {
  status: AppStatus;
  mode: GameMode;
  gameProgress: {
    [GameMode.Daily]: GameProgress;
    [GameMode.Practice]: GameProgress;
    [GameMode.DailyArchive]: GameProgress;
  };
}

export interface PracticeState {
  currentPracticeWordIndex: number;
  practiceBoostsUsed: number;
  practiceBoostsResetTime: number;
  totalScore: number;
  metaProgress: MetaProgress;
}

export interface DailyState {
  dailiesDone: string;
}

export interface MetaProgress {
  'Category visible': number;
  'Definition visible': number;
  'Daily boost': number;
  'Purge group 1': number;
  'Purge group 2': number;
  'Purge group 3': number;
  'Free letter': number;
  'Remove clouds': number;
}

export interface Word {
  index: number;
  word: string;
  definition: string;
  category: string;
}

export interface DailyWord extends Word {
  dailyConfig?: DailyConfig;
}

export interface DailyConfig {
  purgedLetters?: string[];
  freeLetters?: string[];
  hints?: string[];
}
export interface MetaSettings {
  'Category visible': { maxValue: number; price: number; explanation: string };
  'Definition visible': { maxValue: number; price: number; explanation: string };
  'Daily boost': { maxValue: number; price: number; explanation: string };
  'Purge group 1': { maxValue: number; price: number; explanation: string };
  'Purge group 2': { maxValue: number; price: number; explanation: string };
  'Purge group 3': { maxValue: number; price: number; explanation: string };
  'Free letter': { maxValue: number; price: number; explanation: string };
  'Remove clouds': { maxValue: number; price: number; explanation: string };
  // Add other meta settings here as needed
}
