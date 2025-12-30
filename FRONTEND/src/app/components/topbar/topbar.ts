import { Component, OnInit } from '@angular/core';
import { UiState } from '../../services/ui-state';
import { EditState } from '../../services/edit-state';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar implements OnInit {

  userName = '';
  showUserMenu = false;

  private hideMenuTimer: any = null;

  constructor(
    public ui: UiState,
    private edit: EditState,
    private auth: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('user_name') || 'User';
  }

  /* ================= PANEL TOGGLE ================= */

  toggle(panel: string) {

    if (panel === 'edit') {
      if (this.ui.isOpen('edit')) {
        this.edit.disable();
      } else {
        this.edit.enable();
      }
    }

    this.ui.toggle(panel);
  }

  /* ================= USER MENU LOGIC ================= */

  onUserEnter() {
    if (this.hideMenuTimer) {
      clearTimeout(this.hideMenuTimer);
      this.hideMenuTimer = null;
    }
    this.showUserMenu = true;
  }

  onUserLeave() {
    this.hideMenuTimer = setTimeout(() => {
      this.showUserMenu = false;
    }, 20000);
  }

  closeUserMenuNow() {
    if (this.hideMenuTimer) {
      clearTimeout(this.hideMenuTimer);
      this.hideMenuTimer = null;
    }
    this.showUserMenu = false;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
