import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { Auth } from 'src/app/services/auth';
import { SidebarState } from 'src/app/services/sidebar-state';

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-topbar.html',
  styleUrl: './dashboard-topbar.css',
})
export class DashboardTopbar {

  userName = 'User';
  profileImage = 'assets/images/user.png';
  showMenu = false;

  collapsed$!: Observable<boolean>;

  constructor(
    private auth: Auth,
    private router: Router,
    private sidebarState: SidebarState
  ) {
    this.userName = localStorage.getItem('user_name') || 'User';
    this.collapsed$ = this.sidebarState.collapsed$;
  }

  toggleSidebar() {
    this.sidebarState.toggle();
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src =
      'https://ui-avatars.com/api/?name=' + this.userName;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
