import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import DailyWordList from '../shared/dailywordlist.json';
import { CommonModule } from '@angular/common';
import { AppState, DailyWord, GameMode } from '../game/game.model';
import { dailyChallengeStartDate, KeyboardLayout } from '../shared/constants';

interface PreparedDailyWord {
  index: number;
  date: string;
  word: string;
  score: number | null;
  completed: boolean;
  inProgress: boolean;
}

@Component({
  standalone: true,
  selector: 'app-dailyarchive',
  imports: [CommonModule, FormsModule],
  templateUrl: './dailyarchive.component.html',
  styleUrls: ['./dailyarchive.component.css'],
})
export class DailyArchiveComponent implements OnInit {
  @Input() dailyCompleted!: string;
  @Input() dailyArchiveIndex!: number;
  @Output() setArchiveIndex = new EventEmitter<number>();

  showOnlyIncomplete = false;

  dailyWordList: DailyWord[] = DailyWordList as DailyWord[];
  filteredDailyWordList: DailyWord[] = this.dailyWordList
    .filter((w) => w.index <= this.dailyWordIndex)
    .slice()
    .reverse();
  preparedDailyWordList: PreparedDailyWord[] = [];

  ngOnInit() {
    this.prepareDailyWordList();
  }

  prepareDailyWordList(): void {
    this.preparedDailyWordList = [];
    this.filteredDailyWordList.forEach((word) => {
      const date = this.getDateFromIndex(word.index);
      this.preparedDailyWordList.push({
        index: word.index,
        date: date,
        word: word.word,
        score: this.getEfficiencyScore(word.index),
        completed: this.getDailyResult(word.index) !== null,
        inProgress: this.dailyArchiveIndex === word.index && this.getDailyResult(word.index) === null,
      });
    });
  }

  get dailyWordIndex() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const dailyIndex = Math.floor((today.getTime() - dailyChallengeStartDate.getTime()) / msPerDay);

    return dailyIndex;
  }

  getDailyResult(index: number): number | null {
    if (!this.dailyCompleted || index >= this.dailyCompleted.length) return null;
    const char = this.dailyCompleted.charAt(index);
    return char === '0' ? null : char.charCodeAt(0) - 65;
  }

  getEfficiencyScore(index: number): number {
    const word = DailyWordList.find((w) => w.index === index);
    if (!word) return 0;
    if (this.getDailyResult(index) === null) return 0;

    const totalLetters = KeyboardLayout.flat().length;
    const removedLetters = word.dailyConfig.purgedLetters.length;
    const wordUniqueLetters = new Set(word.word.split('')).size;
    const inefficiency = this.getDailyResult(index) ?? 26; //number of incorrect guesses
    const maxWaste = totalLetters - removedLetters - wordUniqueLetters; //total guessable letters (total letters - removed letters - unique letters in the word)
    const efficiencyRatio = 1 - inefficiency / maxWaste;
    return Math.round(Math.max(0, Math.min(1, efficiencyRatio)) * 10);
  }

  getDateFromIndex(index: number): string {
    const date = new Date(dailyChallengeStartDate.getTime());
    date.setDate(date.getDate() + index);
    return date.toLocaleDateString(undefined, {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  }

  selectDaily(word: PreparedDailyWord): void {
    this.setArchiveIndex.emit(word.index);
  }
}
