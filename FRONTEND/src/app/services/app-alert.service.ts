import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppAlertType = 'success' | 'danger' | 'warning' | 'info';

export interface AppAlert {
  id: number;
  type: AppAlertType;
  message: string;
  closing?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AppAlertService {
  private nextId = 1;
  private dismissTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly alertsSubject = new BehaviorSubject<AppAlert[]>([]);
  readonly alerts$ = this.alertsSubject.asObservable();

  show(message: string, type: AppAlertType = 'info', timeoutMs = 0): void {
    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) return;

    const alert: AppAlert = {
      id: this.nextId++,
      type,
      message: cleanMessage,
    };
    this.alertsSubject.next([...this.alertsSubject.value, alert]);

    if (timeoutMs > 0) {
      const timer = setTimeout(() => this.dismiss(alert.id), timeoutMs);
      this.dismissTimers.set(alert.id, timer);
    }
  }

  success(message: string, timeoutMs?: number): void {
    this.show(message, 'success', timeoutMs);
  }

  error(message: string, timeoutMs?: number): void {
    this.show(message, 'danger', timeoutMs);
  }

  warning(message: string, timeoutMs?: number): void {
    this.show(message, 'warning', timeoutMs);
  }

  info(message: string, timeoutMs?: number): void {
    this.show(message, 'info', timeoutMs);
  }

  dismiss(id: number): void {
    const timer = this.dismissTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.dismissTimers.delete(id);
    }

    const alerts = this.alertsSubject.value;
    const target = alerts.find((alert) => alert.id === id);
    if (!target || target.closing) return;

    this.alertsSubject.next(
      alerts.map((alert) => alert.id === id ? { ...alert, closing: true } : alert),
    );

    setTimeout(() => {
      this.alertsSubject.next(this.alertsSubject.value.filter((alert) => alert.id !== id));
    }, 190);
  }
}
