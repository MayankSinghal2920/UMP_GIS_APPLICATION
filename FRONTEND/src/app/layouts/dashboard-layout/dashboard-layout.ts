import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { SidebarState } from 'src/app/services/sidebar-state';
import { DashboardTopbar } from "src/app/components/dashboard-topbar/dashboard-topbar";
import { Sidebar } from "../sidebar/sidebar";

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, DashboardTopbar, Sidebar],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {
  collapsed$: Observable<boolean>;

  constructor(private sidebarState: SidebarState) {
    this.collapsed$ = this.sidebarState.collapsed$;
  }
}
