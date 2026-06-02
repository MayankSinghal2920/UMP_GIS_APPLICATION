

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppAlertHostComponent } from './components/app-alert-host/app-alert-host';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppAlertHostComponent],
  template: `<router-outlet></router-outlet><app-alert-host></app-alert-host>`,
})
export class App {}
