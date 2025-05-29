import { Component, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import WordList from '../shared/wordlist.json';
import DailyWordList from '../shared/dailywordlist.json';
import {
  KeyboardLayout,
  LetterGroups,
  MetaSettings,
  winMessagesLow,
  winMessagesMid,
  winMessagesHigh,
  styledCategories,
  dailyBoostLimit,
} from '../shared/constants';
import { AppState, AppStatus, DailyWord, GameMode, MetaProgress, PracticeState, Word } from './game.model';
import { AboutComponent } from '../about/about.component';
import { HelpComponent } from '../help/help.component';
import { OutOfWordsComponent } from '../outofwords/outofwords.component';
import { environment } from '../../environments/environment';
import { StorageService } from '../../services/storage.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';
import { defaultAppState, defaultMetaProgress, defaultPracticeState } from '../shared/defaults';

@Component({
  selector: 'app-word-list',
  imports: [CommonModule, FormsModule, AboutComponent, HelpComponent, OutOfWordsComponent],
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css'],
})
export class GameComponent implements OnInit {
  //Constants
  AppStatus = AppStatus;
  MetaSettings = MetaSettings;
  KeyboardLayout = KeyboardLayout;
  LetterGroups = LetterGroups;
  winMessagesLow = winMessagesLow;
  winMessagesMid = winMessagesMid;
  winMessagesHigh = winMessagesHigh;

  dailyBoostLimit = dailyBoostLimit;

  //Data
  WordList: Word[] = WordList;
  DailyWordList: DailyWord[] = DailyWordList;

  //TODO mode to default file
  appState: AppState = { ...defaultAppState };
  practiceState: PracticeState = { ...defaultPracticeState };

  currentPracticeWordIndex = 0;
  dailyBoostsUsed = 0;
  metaProgress: MetaProgress = { ...defaultMetaProgress };
  totalScore = 0;
  countdown = '';

  originalOrder = () => 0;

  viewportWidth: number = window.innerWidth;
  viewportHeight: number = window.innerHeight;
  wrongAspect: boolean = false;

  currentWord: Word = {
    index: -1,
    word: '',
    category: '',
    definition: '',
  };

  scoreDecreased: boolean = false;

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
    if (localStorage.getItem('currentPracticeWordIndex') === null) {
      //first time user, show help component
      this.appState.status = AppStatus.Help;
    }
    this.currentPracticeWordIndex = this.storage.safeLoadInt('currentPracticeWordIndex', 0);
    this.totalScore = this.storage.safeLoadInt('totalScore', 0);
    this.metaProgress = this.storage.safeLoad('metaProgress', this.metaProgress);
    this.appState = this.storage.safeLoad('appState', this.appState);

    if (
      this.appState.gameProgress[this.appState.mode].guessedLetters.length > 0 ||
      this.appState.gameProgress[this.appState.mode].removedLetters.length > 0 ||
      this.appState.gameProgress[this.appState.mode].boostActive
    ) {
      this.restoreGameState();
    } else {
      this.newWord();
    }

    this.dailyBoostsUsed = this.checkAndResetDailyBoost();
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
      return word.index === this.currentPracticeWordIndex;
    });
  }

  getWinMessage(): string {
    let messages: string[];
    //handle boosted words, score will be at least 20, so divide by 10
    const localScore = this.currentScore <= 10 ? this.currentScore : this.currentScore / 10;

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
    const word = this.getWord();
    if (word) {
      this.currentWord = word;
    }
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }
  }

  newWord(boost: boolean = false) {
    this.currentPracticeWordIndex++;
    this.storage.save('currentPracticeWordIndex', this.currentPracticeWordIndex);

    const word = this.getWord();
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }

    this.clearGameProgress();

    if (boost) this.incrementBoostedWordUse();
    this.setBoostActive(boost);

    if (word) {
      this.currentWord = word;
    } else {
      this.updateAppStatus(AppStatus.OutOfWords);
      return;
    }

    //only track the event if we're on production
    if (environment.production) {
      this.googleAnalytics.event('new_word', {
        wordId: word.index,
      });
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
          this.addLetterToRemoved(letter);
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
        this.addLetterToGuessed(randomLetter);
      }
    }
  }

  guessLetter(letter: string) {
    //when typing letters when not in game
    if (this.appState.status !== AppStatus.Game) {
      return;
    }

    this.isMenuExpanded = false;
    this.addLetterToGuessed(letter);

    //Check if incorrect letter was guessed
    if (!this.currentWord.word.includes(letter)) {
      this.flashScore();
    }

    // Check if all letters are guessed
    if (this.isGameOver()) {
      //Focus on new word button (for keyboard users to press space/enter for quick next word)
      setTimeout(() => {
        this.newWordButton.nativeElement.focus();
      }, 10);

      //Update totalScore. We will never get to here, unless we have actually guessed the last letter of the word right now
      this.totalScore += this.currentScore;
      this.storage.save('totalScore', this.totalScore);
    }
  }

  isGameOver(): boolean {
    return this.currentWord.word
      .split('')
      .every((l) => this.appState.gameProgress[this.appState.mode].guessedLetters.includes(l));
  }

  flashScore() {
    this.scoreDecreased = true;
    setTimeout(() => (this.scoreDecreased = false), 500);
  }

  handleKeyPress(event: KeyboardEvent) {
    const letter = event.key.toLowerCase();
    if (
      KeyboardLayout.flat().includes(letter) &&
      !this.appState.gameProgress[this.appState.mode].guessedLetters.includes(letter) &&
      !this.appState.gameProgress[this.appState.mode].removedLetters.includes(letter)
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
    this.storage.save('totalScore', this.totalScore);
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
    this.storage.save('totalScore', this.totalScore);
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
    this.storage.save('totalScore', this.totalScore);
    this.currentPracticeWordIndex = 0;
    this.storage.save('currentPracticeWordIndex', this.currentPracticeWordIndex);
    this.clearGameProgress();

    this.newWord();
    this.updateAppStatus(AppStatus.Game);
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

  checkAndResetDailyBoost(): number {
    const now = new Date();
    const resetTimeStr = this.storage.safeLoad<string>('dailyBoostResetTime', '');
    const resetTime = resetTimeStr ? new Date(resetTimeStr) : null;

    if (!resetTime || resetTime < now) {
      // Reset usage
      this.storage.save('dailyBoostsUsed', 0);

      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      this.storage.save('dailyBoostResetTime', tomorrow.toISOString());
      return 0;
    }

    return this.storage.safeLoadInt('dailyBoostsUsed', 5);
  }
  incrementBoostedWordUse(): void {
    const used = this.checkAndResetDailyBoost();
    if (used < this.dailyBoostLimit) {
      this.storage.save('dailyBoostsUsed', used + 1);
      this.dailyBoostsUsed = used + 1;
    }
  }
  getTimeUntilReset(): string {
    const resetStr = this.storage.safeLoad<string>('dailyBoostResetTime', '');
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
    this.dailyBoostsUsed = this.checkAndResetDailyBoost();
  }

  get remainingBoosts(): number {
    return this.dailyBoostLimit - this.dailyBoostsUsed;
  }

  get boostDisabled(): boolean {
    return this.dailyBoostsUsed >= this.dailyBoostLimit;
  }

  get currentScore(): number {
    return (
      Math.max(
        2,
        10 -
          this.appState.gameProgress[this.appState.mode].guessedLetters.filter(
            (l) => !this.currentWord.word.includes(l)
          ).length
      ) * (this.appState.gameProgress[this.appState.mode].boostActive ? 10 : 1)
    );
  }

  saveAppState() {
    this.storage.save('appState', this.appState);
  }
  updateAppStatus(newStatus: AppStatus) {
    this.appState.status = newStatus;
    this.saveAppState();
    this.isMenuExpanded = false;
  }
  addLetterToRemoved(letter: string) {
    if (!this.appState.gameProgress[this.appState.mode].removedLetters.includes(letter)) {
      this.appState.gameProgress[this.appState.mode].removedLetters.push(letter);
      this.saveAppState();
    }
  }
  addLetterToGuessed(letter: string) {
    if (!this.appState.gameProgress[this.appState.mode].guessedLetters.includes(letter)) {
      this.appState.gameProgress[this.appState.mode].guessedLetters.push(letter);
      this.saveAppState();
    }
  }
  setBoostActive(active: boolean) {
    this.appState.gameProgress[this.appState.mode].boostActive = active;
    this.saveAppState();
  }
  clearGameProgress() {
    this.appState.gameProgress[this.appState.mode] = {
      guessedLetters: [],
      removedLetters: [],
      boostActive: false,
    };
    this.saveAppState();
  }
  get currentWordMarkup(): {
    beginningVisible: boolean;
    endVisible: boolean;
    visibleLetters: string;
  } {
    let localCurrentWordMarkup = {
      beginningVisible: false,
      endVisible: false,
      visibleLetters: '',
    };
    if (this.metaProgress['Remove clouds'] > 0) {
      localCurrentWordMarkup.visibleLetters = this.currentWord.word;
      localCurrentWordMarkup.beginningVisible = true;
      localCurrentWordMarkup.endVisible = true;
    } else {
      localCurrentWordMarkup.visibleLetters = this.currentWord.word
        .split('')
        .map((l) => (this.appState.gameProgress[this.appState.mode].guessedLetters.includes(l) ? l : ' '))
        .join('');
      localCurrentWordMarkup.beginningVisible = this.appState.gameProgress[this.appState.mode].guessedLetters.includes(
        this.currentWord.word.slice(0, 1)
      );
      localCurrentWordMarkup.endVisible = this.appState.gameProgress[this.appState.mode].guessedLetters.includes(
        this.currentWord.word.slice(-1)
      );
      localCurrentWordMarkup.visibleLetters = localCurrentWordMarkup.visibleLetters.trim();
    }

    return {
      beginningVisible: localCurrentWordMarkup.beginningVisible,
      endVisible: localCurrentWordMarkup.endVisible,
      visibleLetters: localCurrentWordMarkup.visibleLetters,
    };
  }
}
