import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Observable } from 'rxjs';


import { SidebarState } from 'src/app/services/sidebar-state';
import { UiState } from 'src/app/services/ui-state';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit{

  collapsed$!: Observable<boolean>;
  sidebarTitle = '';

  constructor(
    private sidebarState: SidebarState,
    private ui: UiState,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.collapsed$ = this.sidebarState.collapsed$;
  }

  ngOnInit(): void {
    // ✅ set title immediately (page refresh case)
    this.sidebarTitle = this.resolveTitle(this.route);

    // ✅ update title on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.sidebarTitle = this.resolveTitle(this.route);
      });
  }

  toggleSidebar(): void {
    this.sidebarState.toggle();

    // ✅ tell map/layout listeners to recalc after CSS transition
    setTimeout(() => this.ui.notifyLayoutChanged(), 320);
  }

   private resolveTitle(route: ActivatedRoute): string {
    let current = route.firstChild;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return current?.snapshot.data['title'] ?? 'Dashboard';
  }
}
