export enum GameStatus {
  Playing = 'playing',
  Win = 'win',
}

export enum AppStatus {
  Game = 'game',
  Meta = 'meta',
  Stats = 'stats',
  Options = 'options',
  About = 'about',
  Help = 'help',
}

export interface Word {
  index: number;
  word: string;
  definition: string;
  theme: string;
  category: string;
}
