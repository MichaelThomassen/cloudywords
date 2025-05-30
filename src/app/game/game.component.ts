import { Component, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import WordList from '../shared/wordlist.json';
import {
  KeyboardLayout,
  LetterGroups,
  MetaSettings,
  winMessagesLow,
  winMessagesMid,
  winMessagesHigh,
  styledCategories,
  defaultMetaProgress,
} from '../shared/constants';
import { AppStatus, GameStatus, MetaProgress, Settings, Word } from './game.model';
import { AboutComponent } from '../about/about.component';
import { HelpComponent } from '../help/help.component';
import { OutOfWordsComponent } from '../outofwords/outofwords.component';
import { SettingsComponent } from '../settings/settings.component';
import { environment } from '../../environments/environment';
import { StorageService } from '../../services/storage.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';

@Component({
  selector: 'app-word-list',
  imports: [CommonModule, FormsModule, AboutComponent, HelpComponent, OutOfWordsComponent, SettingsComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  AppStatus = AppStatus;
  GameStatus = GameStatus;
  MetaSettings = MetaSettings;
  KeyboardLayout = KeyboardLayout;
  LetterGroups = LetterGroups;
  winMessagesLow = winMessagesLow;
  winMessagesMid = winMessagesMid;
  winMessagesHigh = winMessagesHigh;

  WordList: Word[] = WordList;

  gameStatus: GameStatus = GameStatus.Playing;
  appStatus: AppStatus = AppStatus.Game;
  currentWordIndex = 0;
  totalScore = 0;

  originalOrder = () => 0;
  metaProgress: MetaProgress = { ...defaultMetaProgress };
  gameProgress: {
    guessedLetters: string[];
    removedLetters: string[];
    boostActive: boolean;
  } = {
    guessedLetters: [],
    removedLetters: [],
    boostActive: false,
  };
  settings: Settings = {
    Cheat: false,
    Easy: false,
  };

  viewportWidth: number = window.innerWidth;
  viewportHeight: number = window.innerHeight;
  wrongAspect: boolean = false;

  currentWord: Word = {
    index: -1,
    word: '',
    category: '',
    definition: '',
  };
  currentWordMarkup: {
    beginningVisible: boolean;
    endVisible: boolean;
    visibleLetters: string;
  } = { beginningVisible: false, endVisible: false, visibleLetters: '' };
  score: number = 10;
  scoreDecreased: boolean = false;

  boostedWordsUsed = 0;
  dailyLimit = 5;
  countdown = '';
  resetKey = 'dailyBoostResetTime';
  usageKey = 'dailyBoostUsed';

  @ViewChild('newWordButton', { static: false }) newWordButton!: ElementRef;

  constructor(
    private renderer: Renderer2,
    private storage: StorageService,
    private googleAnalytics: GoogleAnalyticsService
  ) {
    this.renderer.listen('document', 'keydown', (event) => {
      this.handleKeyPress(event);
    });
    //Prevent zooming by double clicking on mobile devices
    this.renderer.listen('document', 'dblclick', (event) => {
      event.preventDefault();
    });
  }

  isMenuExpanded: boolean = false;
  helpVisible: boolean = false;
  helpText: string = '';

  ngOnInit() {
    if (localStorage.getItem('currentWordIndex') === null) {
      //first time user, show help component
      this.appStatus = AppStatus.Help;
    }
    this.currentWordIndex = this.storage.safeLoadInt('currentWordIndex', 0);
    this.totalScore = this.storage.safeLoadInt('totalScore', 0);
    this.metaProgress = this.storage.safeLoad('metaProgress', this.metaProgress);
    this.gameProgress = this.storage.safeLoad('gameProgress', this.gameProgress);
    this.settings = this.storage.safeLoad('settings', this.settings);

    //check if all keys in metaProgress are valid
    const validKeys = Object.keys(this.metaProgress).filter((key) => {
      return Object.keys(MetaSettings).includes(key);
    });
    const newMetaProgress: MetaProgress = { ...defaultMetaProgress };
    validKeys.forEach((key) => {
      newMetaProgress[key as keyof MetaProgress] = this.metaProgress[key as keyof MetaProgress];
    });
    //check if there's a setting in local storage that doesn't exist anymore
    // "Theme visible" is replaced by "Category visible" -> transfer the progress to the new setting
    if ((this.metaProgress as any)['Theme visible'] !== undefined) {
      newMetaProgress['Category visible'] = (this.metaProgress as any)['Theme visible'];
    }

    this.metaProgress = newMetaProgress;
    //set metaProgress in local storage
    this.storage.save('metaProgress', this.metaProgress);

    if (this.gameProgress === null) {
      this.gameProgress = {
        guessedLetters: [],
        removedLetters: [],
        boostActive: false,
      };
    }

    if (
      this.gameProgress.guessedLetters.length > 0 ||
      this.gameProgress.removedLetters.length > 0 ||
      this.gameProgress.boostActive
    ) {
      this.restoreGameState();
    } else {
      this.newWord();
    }

    this.boostedWordsUsed = this.checkAndResetDailyBoost();
    this.updateCountdown();
    setInterval(() => this.updateCountdown(), 1000);

    window.addEventListener('resize', this.updateViewportSize.bind(this));
    this.updateViewportSize();

    if (!environment.production) {
      const maxLength = Math.max(...WordList.map((w) => w.word.length));
      const longestWords = WordList.filter((w) => w.word.length === maxLength);
      console.log(`Longest words (${maxLength}):`, longestWords);

      const wordCount = new Map();
      WordList.forEach(({ word }) => {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      });
      const duplicates = WordList.filter(
        ({ word }, index, self) => wordCount.get(word) > 1 && index === self.findIndex((w) => w.word === word) // avoid repeats in output
      );
      console.log(`Duplicates (${duplicates.length}):`, duplicates);

      // Longest definition
      const longestDefEntry = WordList.reduce((max, entry) =>
        entry.definition.length > max.definition.length ? entry : max
      );

      // Average lengths
      const totalWords = WordList.length;
      const avgWordLength = WordList.reduce((sum, entry) => sum + entry.word.length, 0) / totalWords;
      const avgDefLength = WordList.reduce((sum, entry) => sum + entry.definition.length, 0) / totalWords;

      console.log('Longest definition:', longestDefEntry.index, longestDefEntry.definition);
      console.log('Average word length:', avgWordLength.toFixed(2));
      console.log('Average definition length:', avgDefLength.toFixed(2));
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.updateViewportSize.bind(this));
  }

  updateViewportSize() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.wrongAspect = this.viewportWidth > this.viewportHeight && this.viewportHeight < 480;
  }

  getWord() {
    return WordList.find((word) => {
      return word.index === this.currentWordIndex;
    });
  }

  getWinMessage(): string {
    let messages: string[];
    //handle boosted words, score will be at least 20, so divide by 10
    const localScore = this.score <= 10 ? this.score : this.score / 10;

    if (localScore <= 4) {
      messages = winMessagesLow;
    } else if (localScore <= 8) {
      messages = winMessagesMid;
    } else {
      messages = winMessagesHigh;
    }

    const index = this.currentWord.index % messages.length;
    return messages[index];
  }

  getStyledCategory() {
    const category = this.currentWord.category;
    const index = styledCategories.findIndex((cat) => cat.includes(category));
    return index !== -1 ? styledCategories[index] : category;
  }

  restoreGameState() {
    this.gameStatus = GameStatus.Playing;
    const word = this.getWord();
    if (word) {
      this.currentWord = word;
    }
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }
    this.score = this.gameProgress.boostActive ? 100 : 10;

    this.currentWordMarkup = {
      beginningVisible: this.metaProgress['Remove clouds'] > 0,
      endVisible: this.metaProgress['Remove clouds'] > 0,
      visibleLetters: this.metaProgress['Remove clouds'] > 0 ? this.currentWord.word : '',
    };
    const guessedLetters = this.gameProgress.guessedLetters;
    this.gameProgress.guessedLetters = [];
    guessedLetters.forEach((letter) => {
      this.guessLetter(letter);
    });
  }

  newWord(boost: boolean = false) {
    this.gameStatus = GameStatus.Playing;
    const word = this.getWord();
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }

    this.score = boost ? 100 : 10;
    this.gameProgress = {
      guessedLetters: [],
      removedLetters: [],
      boostActive: boost,
    };
    this.storage.save('gameProgress', this.gameProgress);
    if (boost) this.incrementBoostedWordUse();

    if (word) {
      this.currentWord = word;
    } else {
      this.appStatus = AppStatus.OutOfWords;
      return;
    }

    //only track the event if we're on production
    if (environment.production) {
      this.googleAnalytics.event('new_word', {
        wordId: word.index,
      });
    }

    if (this.metaProgress['Remove clouds'] > 0) {
      this.currentWordMarkup = {
        beginningVisible: true,
        endVisible: true,
        visibleLetters: word.word,
      };
    } else {
      this.currentWordMarkup = {
        beginningVisible: false,
        endVisible: false,
        visibleLetters: '',
      };
    }

    //remove letters from word depending on level of metaProgress
    let leftOverLettersFromPreviousGroup = 0;
    for (let i = 0; i < LetterGroups.length; i++) {
      const lettersInGroup = [...LetterGroups[i]].sort(() => Math.random() - 0.5);
      const lettersToRemoveInGroup =
        this.metaProgress[`Purge group ${i + 1}` as keyof MetaProgress] + leftOverLettersFromPreviousGroup;
      if (lettersToRemoveInGroup > 0) {
        let lettersRemoved = 0;
        for (let j = 0; j < lettersInGroup.length; j++) {
          const letter = lettersInGroup[j];
          if (this.currentWord.word.includes(letter)) {
            continue;
          }
          this.gameProgress.removedLetters.push(letter);
          this.storage.save('gameProgress', this.gameProgress);
          lettersRemoved++;
          if (lettersRemoved >= lettersToRemoveInGroup) {
            break;
          }
        }
        if (lettersRemoved < lettersToRemoveInGroup) {
          leftOverLettersFromPreviousGroup = lettersToRemoveInGroup - lettersRemoved;
        } else {
          leftOverLettersFromPreviousGroup = 0;
        }
      }
    }
    //add free letter if available
    if (this.metaProgress['Free letter'] > 0) {
      const firstLetter = this.currentWord.word[0];
      const lastLetter = this.currentWord.word[this.currentWord.word.length - 1];
      const regex = new RegExp(`[${firstLetter}${lastLetter}]`, 'g');
      const cleaned = this.currentWord.word.replace(regex, '');

      const uniqueLetters = [...new Set(cleaned)];
      if (uniqueLetters.length > 0) {
        const randomIndex = Math.floor(Math.random() * uniqueLetters.length);
        const randomLetter = uniqueLetters[randomIndex];
        this.guessLetter(randomLetter, true);
      }
    }
  }

  guessLetter(letter: string, overrideAppStatus: boolean = false) {
    //overrideAppStatus is used to allow guessing letters when the app status is not Game (usually when changing settings)
    if ((this.appStatus !== AppStatus.Game || this.gameStatus !== GameStatus.Playing) && !overrideAppStatus) {
      //when typing letters when not in game
      return;
    }
    this.isMenuExpanded = false;
    if (this.gameProgress.guessedLetters.includes(letter)) {
      return;
    }
    this.gameProgress.guessedLetters.push(letter);
    //set gameprogress in local storage
    this.storage.save('gameProgress', this.gameProgress);
    //update currentWordMarkup
    if (this.metaProgress['Remove clouds'] > 0) {
      //if cheat is enabled, show all letters in the word
      this.currentWordMarkup.visibleLetters = this.currentWord.word;
      this.currentWordMarkup.beginningVisible = true;
      this.currentWordMarkup.endVisible = true;
    } else {
      this.currentWordMarkup.visibleLetters = this.currentWord.word
        .split('')
        .map((l) => (this.gameProgress.guessedLetters.includes(l) ? l : ' '))
        .join('');
      this.currentWordMarkup.beginningVisible = this.gameProgress.guessedLetters.includes(
        this.currentWord.word.slice(0, 1)
      );
      this.currentWordMarkup.endVisible = this.gameProgress.guessedLetters.includes(this.currentWord.word.slice(-1));
      this.currentWordMarkup.visibleLetters = this.currentWordMarkup.visibleLetters.trim();
    }

    //Update score, score should be 10 - number of letters guess that's not in the word, minimum 2, if boost active, multiply by 10
    this.updateScore(
      Math.max(2, 10 - this.gameProgress.guessedLetters.filter((l) => !this.currentWord.word.includes(l)).length) *
        (this.gameProgress.boostActive ? 10 : 1)
    );

    // Check if all letters are guessed
    if (this.currentWord.word.split('').every((l) => this.gameProgress.guessedLetters.includes(l))) {
      this.gameStatus = GameStatus.Win;
      this.updateCountdown();
      this.currentWordIndex++;
      this.storage.save('currentWordIndex', this.currentWordIndex.toString());
      //reset game progress
      this.gameProgress = {
        guessedLetters: [],
        removedLetters: [],
        boostActive: false,
      };
      this.storage.save('gameProgress', this.gameProgress);
      //Focus on new word button (for keyboard users to press enter)
      setTimeout(() => {
        this.newWordButton.nativeElement.focus();
      }, 10);

      //Update totalScore
      this.totalScore += this.score;
      this.storage.save('totalScore', this.totalScore.toString());
    }
  }

  updateScore(newScore: number) {
    if (newScore < this.score) {
      this.scoreDecreased = true;
      setTimeout(() => (this.scoreDecreased = false), 500);
    }
    this.score = newScore;
  }

  setAppStatus(status: AppStatus) {
    if (status === AppStatus.Game && !this.getWord()) {
      this.appStatus = AppStatus.OutOfWords;
    } else {
      this.appStatus = status;
    }
    this.isMenuExpanded = false;
  }

  handleKeyPress(event: KeyboardEvent) {
    const letter = event.key.toLowerCase();
    if (
      KeyboardLayout.flat().includes(letter) &&
      !this.gameProgress.guessedLetters.includes(letter) &&
      !this.gameProgress.removedLetters.includes(letter)
    ) {
      this.guessLetter(letter);
    }
  }

  toggleMenu() {
    this.isMenuExpanded = !this.isMenuExpanded;
  }

  getTotalScore() {
    //calculate total score
    let tmpscore = 0;
    Object.keys(this.metaProgress).forEach((meta) => {
      const key = meta as keyof MetaProgress;
      try {
        //needed check in case of meta has changed
        tmpscore += this.metaProgress[key] * MetaSettings[key].price;
      } catch (e) {
        //just do nothing, as it's not really an error
      }
    });
    return this.totalScore + tmpscore;
  }

  setMetaProgress(meta: keyof MetaProgress) {
    if (this.metaProgress[meta] >= MetaSettings[meta].maxValue) {
      return;
    }
    //check if enough points
    if (this.totalScore < MetaSettings[meta].price) {
      return;
    }
    this.metaProgress[meta] = this.metaProgress[meta] + 1;
    this.totalScore -= MetaSettings[meta].price;
    //update meta progress and total score in local storage
    this.storage.save('metaProgress', this.metaProgress);
    this.storage.save('totalScore', this.totalScore.toString());
  }

  resetMetaProgress() {
    //add points spent back to totalscore
    Object.keys(this.metaProgress).forEach((meta) => {
      try {
        this.totalScore +=
          this.metaProgress[meta as keyof MetaProgress] * MetaSettings[meta as keyof MetaProgress].price;
      } catch (e) {
        //just do nothing, as it's not really an error
      }
    });

    this.metaProgress = { ...defaultMetaProgress };
    this.storage.save('metaProgress', this.metaProgress);
    this.storage.save('totalScore', this.totalScore.toString());
  }

  maskDefinition(definition: string) {
    //mask definition based on metaProgress
    //0 = definition box hidden (so we don't even get in here)
    //1 = every 5th word is visible
    //2 = every 4th word is visible
    //3 = every 3rd word is visible
    //4 = every 2nd word is visible
    //5 = every word is visible
    //(commas and periods are included in the words, since we split on spaces)

    const step = 6 - this.metaProgress['Definition visible'];
    const masked = definition.split(' ').map((word, i) => (i % step === 0 ? word : '.'.repeat(word.length)));

    return masked.join(' ');
  }

  isAnyMetaAffordable() {
    //check if any meta is affordable
    let affordable = false;
    Object.keys(this.metaProgress).forEach((meta) => {
      const key = meta as keyof MetaProgress;
      if (this.totalScore >= MetaSettings[key].price && this.metaProgress[key] < MetaSettings[key].maxValue) {
        affordable = true;
      }
    });
    return affordable;
  }

  resetAllProgress() {
    this.metaProgress = { ...defaultMetaProgress };
    this.storage.save('metaProgress', this.metaProgress);
    this.totalScore = 0;
    this.storage.save('totalScore', this.totalScore.toString());
    this.currentWordIndex = 0;
    this.storage.save('currentWordIndex', this.currentWordIndex.toString());
    this.gameProgress = {
      guessedLetters: [],
      removedLetters: [],
      boostActive: false,
    };
    this.storage.save('gameProgress', this.gameProgress);

    this.settings = {
      Cheat: false,
      Easy: false,
    };

    this.newWord();
    this.appStatus = AppStatus.Game;
  }

  showHelp(txt: string) {
    this.helpText = txt;
    this.helpVisible = true;
  }
  closeHelp() {
    this.helpVisible = false;
  }

  castVariableToKeyOfMetaProgress(v: unknown): keyof MetaProgress {
    return v as keyof MetaProgress;
  }

  settingsChange(setting: string) {
    const tmpset = setting as keyof typeof this.settings;
    if (tmpset === 'Easy' && !this.settings['Easy']) {
      //give all meta progresss for free, subtract points from total score if enough, otherwise set it to 0
      Object.keys(this.metaProgress).forEach((meta) => {
        this.totalScore +=
          this.metaProgress[meta as keyof MetaProgress] * MetaSettings[meta as keyof MetaProgress].price;
        this.metaProgress[meta as keyof MetaProgress] = MetaSettings[meta as keyof MetaProgress].maxValue;
        this.totalScore -=
          MetaSettings[meta as keyof MetaProgress].maxValue * MetaSettings[meta as keyof MetaProgress].price;
      });

      this.totalScore = Math.max(0, this.totalScore);
      this.storage.save('totalScore', this.totalScore.toString());
      this.storage.save('metaProgress', this.metaProgress);
    } else if (tmpset === 'Easy' && this.settings['Easy']) {
      //reset all meta progress to 0 and refund points spent
      Object.keys(this.metaProgress).forEach((meta) => {
        this.totalScore +=
          this.metaProgress[meta as keyof MetaProgress] * MetaSettings[meta as keyof MetaProgress].price;
      });
      this.metaProgress = { ...defaultMetaProgress };
      this.storage.save('totalScore', this.totalScore.toString());
      this.storage.save('metaProgress', this.metaProgress);
    }

    this.settings[tmpset] = !this.settings[tmpset];
    this.storage.save('settings', this.settings);
    this.newWord();
  }
  changeCurrentWordIndex(wordNumber: number) {
    this.currentWordIndex = wordNumber;
    this.storage.save('currentWordIndex', wordNumber.toString());
    this.newWord();
  }
  changeTotalScore(score: number) {
    this.totalScore = score;
    this.storage.save('totalScore', score.toString());
  }

  checkAndResetDailyBoost(): number {
    const now = new Date();
    const resetTimeStr = this.storage.safeLoad<string>(this.resetKey, '');
    const resetTime = resetTimeStr ? new Date(resetTimeStr) : null;

    if (!resetTime || resetTime < now) {
      // Reset usage
      this.storage.save(this.usageKey, 0);

      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      this.storage.save(this.resetKey, tomorrow.toISOString());
      return 0;
    }

    return this.storage.safeLoadInt(this.usageKey);
  }
  incrementBoostedWordUse(): void {
    const used = this.checkAndResetDailyBoost();
    if (used < this.dailyLimit) {
      this.storage.save(this.usageKey, used + 1);
      this.boostedWordsUsed = used + 1;
    }
  }
  getTimeUntilReset(): string {
    const resetStr = this.storage.safeLoad<string>(this.resetKey, '');
    if (!resetStr) return '';

    const ms = new Date(resetStr).getTime() - Date.now();
    if (ms <= 0) return '00:00:00';

    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);

    return `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
  }

  pad(num: number): string {
    return num.toString().padStart(2, '0');
  }
  updateCountdown(): void {
    this.countdown = this.getTimeUntilReset();
    this.boostedWordsUsed = this.checkAndResetDailyBoost();
  }

  get remainingBoosts(): number {
    return this.dailyLimit - this.boostedWordsUsed;
  }

  get boostDisabled(): boolean {
    return this.boostedWordsUsed >= this.dailyLimit;
  }
}
