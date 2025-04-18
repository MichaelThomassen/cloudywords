import { Component, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import WordList from '../shared/wordlist.json';
import { KeyboardLayout, LetterGroups, MetaSettings } from '../shared/constants';
import { AppStatus, GameStatus, MetaProgress, Settings, Word } from './game.model';
import { AboutComponent } from '../about/about.component';
import { HelpComponent } from '../help/help.component';
import { OutOfWordsComponent } from '../outofwords/outofwords.component';
import { SettingsComponent } from '../settings/settings.component';
import { environment } from '../../environments/environment';

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

  WordList: Word[] = WordList;

  gameStatus: GameStatus = GameStatus.Playing;
  appStatus: AppStatus = AppStatus.Game;
  currentWordIndex = 0;
  totalScore = 0;
  averageScorePerWord = 0;

  originalOrder = () => 0;
  metaProgress: MetaProgress = {
    'Theme visible': 0,
    'Definition visible': 0,
    'Purge group 1': 0,
    'Purge group 2': 0,
    'Purge group 3': 0,
    'Free letter': 0,
  };
  gameProgress: {
    guessedLetters: string[];
    removedLetters: string[];
  } = {
    guessedLetters: [],
    removedLetters: [],
  };
  settings: Settings = {
    Cheat: false,
    'Clouds disabled': false,
    Easy: false,
  };

  viewportWidth: number = window.innerWidth;
  viewportHeight: number = window.innerHeight;
  wrongAspect: boolean = false;

  currentWord: Word = {
    index: -1,
    word: '',
    theme: '',
    definition: '',
  };
  currentWordMarkup: {
    beginningVisible: boolean;
    endVisible: boolean;
    visibleLetters: string;
  } = { beginningVisible: false, endVisible: false, visibleLetters: '' };
  score: number = 10;
  scoreDecreased: boolean = false;

  @ViewChild('newWordButton', { static: false }) newWordButton!: ElementRef;

  constructor(private renderer: Renderer2) {
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
    //Load progress from local storage
    this.currentWordIndex = parseInt(localStorage.getItem('currentWordIndex') || '0', 10);
    this.totalScore = parseInt(localStorage.getItem('totalScore') || '0', 10);
    this.metaProgress = JSON.parse(localStorage.getItem('metaProgress') || JSON.stringify(this.metaProgress));
    this.gameProgress = JSON.parse(localStorage.getItem('gameProgress') || JSON.stringify(this.gameProgress));
    this.settings = JSON.parse(localStorage.getItem('settings') || JSON.stringify(this.settings));

    if (this.gameProgress === null) {
      this.gameProgress = {
        guessedLetters: [],
        removedLetters: [],
      };
    }

    if (this.gameProgress.guessedLetters.length > 0 || this.gameProgress.removedLetters.length > 0) {
      this.restoreGameState();
    } else {
      this.newWord();
    }

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

  restoreGameState() {
    this.gameStatus = GameStatus.Playing;
    const word = this.getWord();
    if (word) {
      this.currentWord = word;
    }
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }
    this.score = 10;

    this.currentWordMarkup = {
      beginningVisible: false,
      endVisible: false,
      visibleLetters: '',
    };
    const guessedLetters = this.gameProgress.guessedLetters;
    this.gameProgress.guessedLetters = [];
    guessedLetters.forEach((letter) => {
      this.guessLetter(letter);
    });
  }

  newWord() {
    this.gameStatus = GameStatus.Playing;
    const word = this.getWord();
    if (!environment.production && word) {
      console.log('Word is:', word.word);
    }

    this.score = 10;
    this.gameProgress = {
      guessedLetters: [],
      removedLetters: [],
    };
    if (word) {
      this.currentWord = word;
    } else {
      this.appStatus = AppStatus.OutOfWords;
      return;
    }

    if (this.settings.Cheat && this.settings['Clouds disabled']) {
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
      const lettersInGroup = LetterGroups[i].sort(() => Math.random() - 0.5);
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
          //set localstorage
          localStorage.setItem('gameProgress', JSON.stringify(this.gameProgress));
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
      //using [...new Set] to remove duplicates from word (excluding first and last letter), then sort the letters randomly and then pick the first one
      const lettersInWord = [...new Set(this.currentWord.word.slice(1, -1).split(''))].sort(() => Math.random() - 0.5);
      const letterToRemove = lettersInWord[0];
      this.guessLetter(letterToRemove, true);
    }
  }

  guessLetter(letter: string, overrideAppStatus: boolean = false) {
    //overrideAppStatus is used to allow guessing letters when the app status is not Game (usually when changing settings)
    if (this.appStatus !== AppStatus.Game && !overrideAppStatus) {
      //when typing letters when not in game
      return;
    }
    this.isMenuExpanded = false;
    if (this.gameProgress.guessedLetters.includes(letter)) {
      return;
    }
    this.gameProgress.guessedLetters.push(letter);
    //set gameprogress in local storage
    localStorage.setItem('gameProgress', JSON.stringify(this.gameProgress));
    //update currentWordMarkup
    if (this.settings.Cheat && this.settings['Clouds disabled']) {
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

    //Update score, score should be 10 - number of letters guess that's not in the word, minimum 2
    this.updateScore(
      Math.max(2, 10 - this.gameProgress.guessedLetters.filter((l) => !this.currentWord.word.includes(l)).length)
    );

    // Check if all letters are guessed
    if (this.currentWord.word.split('').every((l) => this.gameProgress.guessedLetters.includes(l))) {
      this.gameStatus = GameStatus.Win;
      this.currentWordIndex++;
      localStorage.setItem('currentWordIndex', this.currentWordIndex.toString());
      //reset game progress
      this.gameProgress = {
        guessedLetters: [],
        removedLetters: [],
      };
      localStorage.setItem('gameProgress', JSON.stringify(this.gameProgress));
      //Focus on new word button (for keyboard users to press enter)
      setTimeout(() => {
        this.newWordButton.nativeElement.focus();
      }, 10);

      //Update totalScore
      this.totalScore += this.score;
      localStorage.setItem('totalScore', this.totalScore.toString());
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
    localStorage.setItem('metaProgress', JSON.stringify(this.metaProgress));
    localStorage.setItem('totalScore', this.totalScore.toString());
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

    this.metaProgress = {
      'Theme visible': 0,
      'Definition visible': 0,
      'Purge group 1': 0,
      'Purge group 2': 0,
      'Purge group 3': 0,
      'Free letter': 0,
    };
    localStorage.setItem('metaProgress', JSON.stringify(this.metaProgress));
    localStorage.setItem('totalScore', this.totalScore.toString());
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
    this.metaProgress = {
      'Theme visible': 0,
      'Definition visible': 0,
      'Purge group 1': 0,
      'Purge group 2': 0,
      'Purge group 3': 0,
      'Free letter': 0,
    };
    localStorage.setItem('metaProgress', JSON.stringify(this.metaProgress));
    this.totalScore = 0;
    localStorage.setItem('totalScore', this.totalScore.toString());
    this.currentWordIndex = 0;
    localStorage.setItem('currentWordIndex', this.currentWordIndex.toString());
    this.gameProgress = {
      guessedLetters: [],
      removedLetters: [],
    };
    localStorage.setItem('gameProgress', JSON.stringify(this.gameProgress));

    this.settings = {
      Cheat: false,
      'Clouds disabled': false,
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
      localStorage.setItem('totalScore', this.totalScore.toString());
      localStorage.setItem('metaProgress', JSON.stringify(this.metaProgress));
    } else if (tmpset === 'Easy' && this.settings['Easy']) {
      //reset all meta progress to 0 and refund points spent
      Object.keys(this.metaProgress).forEach((meta) => {
        this.totalScore +=
          this.metaProgress[meta as keyof MetaProgress] * MetaSettings[meta as keyof MetaProgress].price;
      });
      this.metaProgress = {
        'Theme visible': 0,
        'Definition visible': 0,
        'Purge group 1': 0,
        'Purge group 2': 0,
        'Purge group 3': 0,
        'Free letter': 0,
      };
      localStorage.setItem('totalScore', this.totalScore.toString());
      localStorage.setItem('metaProgress', JSON.stringify(this.metaProgress));
    }

    this.settings[tmpset] = !this.settings[tmpset];
    localStorage.setItem('settings', JSON.stringify(this.settings));
    this.newWord();
  }
  changeCurrentWordIndex(wordNumber: number) {
    this.currentWordIndex = wordNumber;
    localStorage.setItem('currentWordIndex', wordNumber.toString());
    this.newWord();
  }
  changeTotalScore(score: number) {
    this.totalScore = score;
    localStorage.setItem('totalScore', score.toString());
  }
}
