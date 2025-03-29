import { Component, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import WordList from '../shared/wordlist.json';
import { KeyboardLayout, LetterGroups, MetaSettings } from '../shared/constants';
import { AppStatus, GameStatus, Word } from './game.model';
import { AboutComponent } from '../about/about.component';
import { HelpComponent } from '../help/help.component';

@Component({
  selector: 'app-word-list',
  imports: [CommonModule, FormsModule, AboutComponent, HelpComponent],
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
  dailyWordIndex = 0;
  totalScore = 0;
  randomWordIndex = 0;
  averageScorePerWord = 0;

  originalOrder = () => 0;
  metaProgress: { [key: string]: number } = {
    'Category visible': 0,
    'Theme visible': 0,
    'Definition visible': 0,
    'Remove group 1 letters': 0,
    'Remove group 2 letters': 0,
    'Remove group 3 letters': 0,
  };

  viewportWidth: number = window.innerWidth;
  viewportHeight: number = window.innerHeight;
  wrongAspect: boolean = false;

  currentWord: Word = {
    index: -1,
    word: '',
    category: '',
    theme: '',
    definition: '',
  };
  currentWordMarkup: {
    beginningVisible: boolean;
    endVisible: boolean;
    visibleLetters: string;
  } = { beginningVisible: false, endVisible: false, visibleLetters: '' };
  removedLetters: string[] = [];
  guessedLetters: string[] = [];
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
  metaExplanationVisible: boolean = false;
  metaExplanation: string = '';

  ngOnInit() {
    //Load progress from local storage
    this.dailyWordIndex = parseInt(localStorage.getItem('dailyWordIndex') || '0', 10);
    this.totalScore = parseInt(localStorage.getItem('totalScore') || '0', 10);
    this.metaProgress = JSON.parse(localStorage.getItem('metaProgress') || JSON.stringify(this.metaProgress));

    this.getWordFromWordList();
    window.addEventListener('resize', this.updateViewportSize.bind(this));
    this.updateViewportSize();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.updateViewportSize.bind(this));
  }

  updateViewportSize() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.wrongAspect = this.viewportWidth > this.viewportHeight && this.viewportHeight < 480;
  }

  getWordFromWordList() {
    this.gameStatus = GameStatus.Playing;
    this.score = 10;
    const word = WordList.find((word) => {
      return word.index === this.dailyWordIndex;
    });
    if (word) {
      this.currentWord = word;
      this.guessedLetters = [];
      this.removedLetters = [];
      this.currentWordMarkup = {
        beginningVisible: false,
        endVisible: false,
        visibleLetters: '',
      };
    } else {
      this.dailyWordIndex = 0;
      this.getWordFromWordList();
    }

    //remove letters from word depending on level of metaProgress
    let leftOverLettersFromPreviousGroup = 0;
    for (let i = 0; i < LetterGroups.length; i++) {
      const lettersInGroup = LetterGroups[i].sort(() => Math.random() - 0.5);
      const lettersToRemoveInGroup =
        this.metaProgress[`Remove group ${i + 1} letters`] + leftOverLettersFromPreviousGroup;
      if (lettersToRemoveInGroup > 0) {
        let lettersRemoved = 0;
        for (let j = 0; j < lettersInGroup.length; j++) {
          const letter = lettersInGroup[j];
          if (this.currentWord.word.includes(letter)) {
            continue;
          }
          this.removedLetters.push(letter);
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
  }

  guessLetter(letter: string) {
    this.isMenuExpanded = false;
    if (this.guessedLetters.includes(letter)) {
      return;
    }
    this.guessedLetters.push(letter);
    //update currentWordMarkup
    this.currentWordMarkup.visibleLetters = this.currentWord.word
      .split('')
      .map((l) => (this.guessedLetters.includes(l) ? l : ' '))
      .join('');
    this.currentWordMarkup.beginningVisible = this.guessedLetters.includes(this.currentWord.word.slice(0, 1));
    this.currentWordMarkup.endVisible = this.guessedLetters.includes(this.currentWord.word.slice(-1));
    this.currentWordMarkup.visibleLetters = this.currentWordMarkup.visibleLetters.trim();

    //Update score, score should be 10 - number of letters guess that's not in the word, minimum 2
    this.updateScore(Math.max(2, 10 - this.guessedLetters.filter((l) => !this.currentWord.word.includes(l)).length));

    // Check if all letters are guessed
    if (this.currentWord.word.split('').every((l) => this.guessedLetters.includes(l))) {
      this.gameStatus = GameStatus.Win;
      this.dailyWordIndex++;
      localStorage.setItem('dailyWordIndex', this.dailyWordIndex.toString());
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
    this.appStatus = status;
    this.isMenuExpanded = false;
  }

  handleKeyPress(event: KeyboardEvent) {
    const letter = event.key.toLowerCase();
    if (
      KeyboardLayout.flat().includes(letter) &&
      !this.guessedLetters.includes(letter) &&
      !this.removedLetters.includes(letter)
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
      tmpscore += this.metaProgress[meta] * MetaSettings[meta].price;
    });
    return this.totalScore + tmpscore;
  }

  setMetaProgress(meta: string) {
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
      this.totalScore += this.metaProgress[meta] * MetaSettings[meta].price;
    });

    this.metaProgress = {
      'Category visible': 0,
      'Theme visible': 0,
      'Definition visible': 0,
      'Remove group 1 letters': 0,
      'Remove group 2 letters': 0,
      'Remove group 3 letters': 0,
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
    return Object.keys(MetaSettings).some(
      (meta) => this.totalScore >= MetaSettings[meta].price && this.metaProgress[meta] < MetaSettings[meta].maxValue
    );
  }

  resetAllProgress() {
    this.resetMetaProgress();
    this.totalScore = 0;
    localStorage.setItem('totalScore', this.totalScore.toString());
    this.dailyWordIndex = 0;
    localStorage.setItem('dailyWordIndex', this.dailyWordIndex.toString());
    this.getWordFromWordList();
    this.appStatus = AppStatus.Game;
  }

  showResetConfirmation = false;

  confirmReset() {
    this.resetAllProgress();
    this.showResetConfirmation = false;
  }

  cancelReset() {
    this.showResetConfirmation = false;
  }

  showMetaExplanation(metaKey: string) {
    this.metaExplanation = MetaSettings[metaKey].explanation;
    this.metaExplanationVisible = true;
  }

  closeMetaExplanation() {
    this.metaExplanationVisible = false;
  }
}
