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

  toggle(panel: string) {
    if (panel === 'edit') {
      this.edit.enabled ? this.edit.disable() : this.edit.enable();
      this.ui.activePanel = this.edit.enabled ? 'edit' : null;
      return;
    }
    this.ui.activePanel = this.ui.activePanel === panel ? null : panel;
  }

  /* ================= USER MENU LOGIC ================= */

  onUserEnter() {
    // ⛔ Cancel pending close
    if (this.hideMenuTimer) {
      clearTimeout(this.hideMenuTimer);
      this.hideMenuTimer = null;
    }
    this.showUserMenu = true;
  }

  onUserLeave() {
    // ⏱️ Delay close by 300ms
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
