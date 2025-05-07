import { Injectable } from '@angular/core';

declare let gtag: (...args: any[]) => void;

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  public event(eventName: string, eventParams: Record<string, any> = {}): void {
    gtag('event', eventName, eventParams);
  }
}
