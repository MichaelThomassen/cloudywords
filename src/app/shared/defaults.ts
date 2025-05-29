import { AppState, AppStatus, GameMode, MetaProgress, PracticeState } from '../game/game.model';

export const defaultMetaProgress: MetaProgress = {
  'Category visible': 0,
  'Definition visible': 0,
  'Daily boost': 0,
  'Purge group 1': 0,
  'Purge group 2': 0,
  'Purge group 3': 0,
  'Free letter': 0,
  'Remove clouds': 0,
};

export const defaultAppState: AppState = {
  status: AppStatus.Game,
  mode: GameMode.Practice,
  gameProgress: {
    [GameMode.Daily]: {
      guessedLetters: [],
      removedLetters: [],
      boostActive: false,
    },
    [GameMode.Practice]: {
      guessedLetters: [],
      removedLetters: [],
      boostActive: false,
    },
  },
};

export const defaultPracticeState: PracticeState = {
  currentPracticeWordIndex: 0,
  dailyBoostsUsed: 0,
  dailyBoostResetTime: '',
  totalScore: 0,
  metaProgress: defaultMetaProgress,
};
