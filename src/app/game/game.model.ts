export enum GameStatus {
  Playing = 'playing',
  Win = 'win',
}

export enum AppStatus {
  Daily = 'daily',
  Practice = 'practice',
  Meta = 'meta',
  Stats = 'stats',
  Options = 'options',
  About = 'about',
  Help = 'help',
  OutOfWords = 'outofwords',
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
