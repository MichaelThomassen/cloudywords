import { Component, EventEmitter, Input, Output, SimpleChange } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Settings } from '../game/game.model';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  imports: [CommonModule, FormsModule],
})
export class SettingsComponent {
  @Input() totalScore!: number;
  @Input() currentWordIndex!: number;
  @Input() wordCount!: number;
  @Input() settings!: Settings;
  @Output() resetAllProgress = new EventEmitter<void>();
  @Output() showHelp = new EventEmitter<string>();
  @Output() settingsChange = new EventEmitter<string>();
  @Output() changeCurrentWordIndex = new EventEmitter<number>();
  @Output() changeTotalScore = new EventEmitter<number>();

  showResetConfirmation = false;

  localSettings: Settings = {
    Cheat: false,
    'Clouds disabled': false,
    Easy: false,
  };
  localCurrentWordIndex = 0;
  localWordCount = 0;
  localTotalScore = 0;

  ngOnChanges(changes: { [propName: string]: SimpleChange }) {
    if (changes['settings']) {
      this.localSettings = { ...this.settings };
    }
    if (changes['currentWordIndex']) {
      this.localCurrentWordIndex = this.currentWordIndex;
    }
    if (changes['wordCount']) {
      this.localWordCount = this.wordCount;
    }
    if (changes['totalScore']) {
      this.localTotalScore = this.totalScore;
    }
  }

  confirmReset(): void {
    this.resetAllProgress.emit();
    this.showResetConfirmation = false;
  }

  cancelReset(): void {
    this.showResetConfirmation = false;
  }
  changeCurrentWordIndexLocal(newValue: number | string): void {
    const clamped = Math.max(0, Math.min(this.wordCount, Number(newValue)));
    setTimeout(() => {
      this.localCurrentWordIndex = clamped;
    }, 50);
    this.changeCurrentWordIndex.emit(clamped);
  }
  changeTotalScoreLocal(newValue: number | string): void {
    const clamped = Math.max(0, Math.min(10000, Number(newValue)));
    setTimeout(() => {
      this.localTotalScore = clamped;
    }, 50);
    this.changeTotalScore.emit(clamped);
  }

  blockInvalidKeys(event: KeyboardEvent) {
    const allowed = [
      'Home',
      'End',
      'Backspace',
      'Tab',
      'ArrowLeft',
      'ArrowRight',
      'Delete', // basic controls
      ,
    ];
    if (!/[0-9]/.test(event.key) && !allowed.includes(event.key)) {
      event.preventDefault();
    }
  }
}
