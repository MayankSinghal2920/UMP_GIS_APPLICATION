import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarState } from 'src/app/services/sidebar-state';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  collapsed$!: Observable<boolean>;

  constructor(private sidebarState: SidebarState) {
    this.collapsed$ = this.sidebarState.collapsed$;
  }

  toggleSidebar(): void {
    this.sidebarState.toggle();
  }
}
