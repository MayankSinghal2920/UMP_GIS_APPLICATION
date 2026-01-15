import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SidebarState {
  private collapsedSubject = new BehaviorSubject<boolean>(true); // ✅ collapsed by default
  collapsed$ = this.collapsedSubject.asObservable();

  toggle() {
    this.collapsedSubject.next(!this.collapsedSubject.value);
  }

  collapse() {
    this.collapsedSubject.next(true);
  }

  expand() {
    this.collapsedSubject.next(false);
  }

  get value() {
    return this.collapsedSubject.value;
  }
}
