import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Map } from '../map/map';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Map],
  template: `<app-map></app-map>`
})
export class HomeComponent {
}

