import { Component, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CountdownTimerComponent } from '../countdown-timer/countdown-timer.component';

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
  practiceBoostLimit,
} from '../shared/constants';
import { AppState, AppStatus, DailyWord, MetaProgress, PracticeState, Word } from './game.model';
import { AboutComponent } from '../about/about.component';
import { HelpComponent } from '../help/help.component';
import { OutOfWordsComponent } from '../outofwords/outofwords.component';
import { environment } from '../../environments/environment';
import { StorageService } from '../../services/storage.service';
import { GoogleAnalyticsService } from '../../services/google-analytics.service';
import { defaultAppState, defaultMetaProgress, defaultPracticeState } from '../shared/defaults';

@Component({
  selector: 'app-word-list',
  imports: [CommonModule, FormsModule, AboutComponent, HelpComponent, OutOfWordsComponent, CountdownTimerComponent],
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

  practiceBoostLimit = practiceBoostLimit;

  //Data
  WordList: Word[] = WordList;
  DailyWordList: DailyWord[] = DailyWordList;

  //State
  appState: AppState = { ...defaultAppState };
  practiceState: PracticeState = { ...defaultPracticeState };

  currentWord: Word = {
    index: -1,
    word: '',
    category: '',
    definition: '',
  };

  //Helper function for metaSettings order
  originalOrder = () => 0;

  //Variable for UI
  scoreDecreased: boolean = false;
  viewportWidth: number = window.innerWidth;
  viewportHeight: number = window.innerHeight;
  wrongAspect: boolean = false;

  //ViewChild for new word button to focus on it after guessing a word
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
    window.addEventListener('resize', this.updateViewportSize.bind(this));
    this.updateViewportSize();

    this.appState = this.storage.safeLoad('appState', this.appState);
    this.practiceState = this.storage.safeLoad('practiceState', this.practiceState);

    this.resetPracticeBoostTimer();
    this.restoreGameState();

    //Just some debug info, only in development mode
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
      return word.index === this.practiceState.currentPracticeWordIndex;
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
    } else {
      this.updateAppStatus(AppStatus.OutOfWords);
      return;
    }
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }
  }

  newWord(boost: boolean = false) {
    this.increaseCurrentPracticeWordIndex();

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
        this.practiceState.metaProgress[`Purge group ${i + 1}` as keyof MetaProgress] +
        leftOverLettersFromPreviousGroup;
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
    if (this.practiceState.metaProgress['Free letter'] > 0) {
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
      //Update totalScore. We will never get to here, unless we have actually guessed the last letter of the word right now
      this.practiceState.totalScore += this.currentScore;
      this.savePracticeState();

      //Focus on new word button (for keyboard users to press space/enter for quick next word)
      setTimeout(() => {
        this.newWordButton.nativeElement.focus();
      }, 10);
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

  toggleMenu() {
    this.isMenuExpanded = !this.isMenuExpanded;
  }

  getTotalScore() {
    //calculate total score
    let tmpscore = 0;
    Object.keys(this.practiceState.metaProgress).forEach((meta) => {
      const key = meta as keyof MetaProgress;
      try {
        //needed check in case of meta has changed
        tmpscore += this.practiceState.metaProgress[key] * MetaSettings[key].price;
      } catch (e) {
        //just do nothing, as it's not really an error
      }
    });
    return this.practiceState.totalScore + tmpscore;
  }

  setMetaProgress(meta: keyof MetaProgress) {
    if (this.practiceState.metaProgress[meta] >= MetaSettings[meta].maxValue) {
      return;
    }
    //check if enough points
    if (this.practiceState.totalScore < MetaSettings[meta].price) {
      return;
    }
    this.practiceState.metaProgress[meta] = this.practiceState.metaProgress[meta] + 1;
    this.practiceState.totalScore -= MetaSettings[meta].price;
    this.savePracticeState();
  }

  resetMetaProgress() {
    //add points spent back to totalscore
    Object.keys(this.practiceState.metaProgress).forEach((meta) => {
      try {
        this.practiceState.totalScore +=
          this.practiceState.metaProgress[meta as keyof MetaProgress] * MetaSettings[meta as keyof MetaProgress].price;
      } catch (e) {
        //just do nothing, as it's not really an error
      }
    });

    this.practiceState.metaProgress = { ...defaultMetaProgress };
    this.savePracticeState();
  }

  get getMaskedDefinition(): string {
    //mask definition based on metaProgress
    //0 = definition box hidden (so we don't even get in here)
    //1 = every 5th word is visible
    //2 = every 4th word is visible
    //3 = every 3rd word is visible
    //4 = every 2nd word is visible
    //5 = every word is visible
    //(commas and periods are included in the words, since we split on spaces)

    const step = 6 - this.practiceState.metaProgress['Definition visible'];
    const masked = this.currentWord.definition
      .split(' ')
      .map((word, i) => (i % step === 0 ? word : '.'.repeat(word.length)));

    return masked.join(' ');
  }

  isAnyMetaAffordable() {
    //check if any meta is affordable
    let affordable = false;
    Object.keys(this.practiceState.metaProgress).forEach((meta) => {
      const key = meta as keyof MetaProgress;
      if (
        this.practiceState.totalScore >= MetaSettings[key].price &&
        this.practiceState.metaProgress[key] < MetaSettings[key].maxValue
      ) {
        affordable = true;
      }
    });
    return affordable;
  }

  showHelp(txt: string) {
    this.helpText = txt;
    this.helpVisible = true;
  }
  closeHelp() {
    this.helpVisible = false;
  }

  castVariableToKeyOfMetaProgress(v: unknown): keyof MetaProgress {
    //Hacky way to cast a variable to keyof MetaProgress
    return v as keyof MetaProgress;
  }

  resetPracticeBoostTimer() {
    //called on init, and when button timer reaches 0
    const now = new Date();
    const resetTime =
      this.practiceState.practiceBoostsResetTime && this.practiceState.practiceBoostsResetTime > 0
        ? new Date(this.practiceState.practiceBoostsResetTime)
        : null;
    if (resetTime && resetTime > now) {
      return;
    }

    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    this.practiceState.practiceBoostsResetTime = tomorrow.getTime();
    this.practiceState.practiceBoostsUsed = 0;
    this.savePracticeState();
  }

  incrementBoostedWordUse(): void {
    if (this.practiceState.practiceBoostsUsed < this.practiceBoostLimit) {
      this.practiceState.practiceBoostsUsed += 1;
      this.savePracticeState();
    }
  }

  get remainingBoosts(): number {
    return this.practiceBoostLimit - this.practiceState.practiceBoostsUsed;
  }

  get boostDisabled(): boolean {
    return this.practiceState.practiceBoostsUsed >= this.practiceBoostLimit;
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
    if (this.practiceState.metaProgress['Remove clouds'] > 0) {
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

  savePracticeState() {
    this.storage.save('practiceState', this.practiceState);
  }
  increaseCurrentPracticeWordIndex() {
    this.practiceState.currentPracticeWordIndex++;
    this.savePracticeState();
  }
}
