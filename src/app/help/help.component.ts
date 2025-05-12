import { Component, EventEmitter, Input, Output, SimpleChange } from '@angular/core';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css'],
})
export class HelpComponent {
  @Input() wordCount!: number;
  @Output() onClose = new EventEmitter<void>();

  closeIt() {
    this.onClose.emit();
  }
}
