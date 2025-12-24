import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UiState {
  activePanel: string | null = null;

   toggle(panel: string) {
    this.activePanel = this.activePanel === panel ? null : panel;
  }

    isOpen(panel: string): boolean {
    return this.activePanel === panel;
  }

close() {
  this.activePanel = null;
}

}
