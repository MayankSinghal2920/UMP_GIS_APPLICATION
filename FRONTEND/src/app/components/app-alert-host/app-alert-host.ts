import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppAlert, AppAlertService } from '../../services/app-alert.service';

@Component({
  selector: 'app-alert-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-alert-host.html',
  styleUrl: './app-alert-host.css',
})
export class AppAlertHostComponent implements OnDestroy {
  currentAlert: AppAlert | null = null;
  private alertSub: Subscription;

  constructor(public alerts: AppAlertService) {
    this.alertSub = this.alerts.alerts$.subscribe((items) => {
      this.currentAlert = items[0] || null;
    });
  }

  ngOnDestroy(): void {
    this.alertSub.unsubscribe();
  }
}
