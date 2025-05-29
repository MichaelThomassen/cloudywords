import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { BehaviorSubject, Subscription, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  imports: [CommonModule],
  template: `<span>{{ timeLeft$ | async }}</span>`,
})
export class CountdownTimerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() targetTime!: number;
  @Output() countdownComplete = new EventEmitter<void>();

  timeLeft$ = new BehaviorSubject<string>('00:00:00');
  private sub?: Subscription;

  ngOnInit() {
    this.timeLeft$.next(this.calculateTimeLeft());
    this.startCountdown();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['targetTime'] && !changes['targetTime'].firstChange) {
      this.restartCountdown();
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private startCountdown() {
    this.sub = interval(1000)
      .pipe(map(() => this.calculateTimeLeft()))
      .subscribe((value) => this.timeLeft$.next(value));
  }

  private restartCountdown() {
    this.sub?.unsubscribe();
    this.startCountdown();
  }

  private calculateTimeLeft(): string {
    const now = Date.now();
    const diff = this.targetTime - now;

    if (diff <= 0) {
      if (this.countdownComplete.observed) {
        this.countdownComplete.emit();
      }
      return '00:00:00';
    }

    const h = Math.floor(diff / 1000 / 60 / 60)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((diff / 1000 / 60) % 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor((diff / 1000) % 60)
      .toString()
      .padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
}
