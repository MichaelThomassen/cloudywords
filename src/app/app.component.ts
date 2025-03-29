import { Component } from '@angular/core';
import { GameComponent } from './game/game.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [GameComponent],
})
export class AppComponent {
  title = 'Cloudy Words';
}
