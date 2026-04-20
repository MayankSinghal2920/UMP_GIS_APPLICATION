import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Observable } from 'rxjs';
import { Auth } from 'src/app/services/auth';
import { CurrentUserService } from 'src/app/services/current-user';

import { SidebarState } from 'src/app/services/sidebar-state';
import { UiState } from 'src/app/services/ui-state';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  collapsed$!: Observable<boolean>;
  sidebarTitle = '';
  isAdmin = false;
  isSuperAdmin = false;
  userManagementRoute = '/dashboard';

  constructor(
    private sidebarState: SidebarState,
    private ui: UiState,
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth,
    private currentUser: CurrentUserService,
  ) {
    this.collapsed$ = this.sidebarState.collapsed$;
  }

  ngOnInit(): void {
    this.currentUser.user$.subscribe((user) => {
      this.isAdmin = user?.user_type === 'Admin';
      this.isSuperAdmin = user?.user_type === 'Super Admin';
      this.setUserManagementRoute();
    });

    this.sidebarTitle = this.resolveTitle(this.route);

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.sidebarTitle = this.resolveTitle(this.route);
    });
  }

  toggleSidebar(): void {
    this.sidebarState.toggle();
    setTimeout(() => this.ui.notifyLayoutChanged(), 320);
  }

  private resolveTitle(route: ActivatedRoute): string {
    let current = route.firstChild;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return current?.snapshot.data['title'] ?? 'Dashboard';
  }

  private setUserManagementRoute(): void {
    if (this.isSuperAdmin) {
      this.userManagementRoute = '/dashboard/super-admin/user-management';
      return;
    }

    if (this.isAdmin) {
      this.userManagementRoute = '/dashboard/user-management';
      return;
    }

    this.userManagementRoute = '/dashboard';
  }
}
