import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from 'src/app/services/auth';

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-topbar.html',
  styleUrl: './dashboard-topbar.css',
})
export class DashboardTopbar {

  userName = 'User';
  profileImage = 'assets/images/admin.jpg'; // default
  showMenu = false;

  constructor(
    private auth: Auth,
    private router: Router
  ) {
    this.userName = localStorage.getItem('user_name') || 'User';
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
