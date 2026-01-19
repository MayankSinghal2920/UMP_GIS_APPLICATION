import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

import { SidebarState } from 'src/app/services/sidebar-state';
import { UiState } from 'src/app/services/ui-state';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  collapsed$!: Observable<boolean>;

  constructor(
    private sidebarState: SidebarState,
    private ui: UiState
  ) {
    this.collapsed$ = this.sidebarState.collapsed$;
  }

  toggleSidebar(): void {
    this.sidebarState.toggle();

    // ✅ tell map/layout listeners to recalc after CSS transition
    setTimeout(() => this.ui.notifyLayoutChanged(), 320);
  }
}
