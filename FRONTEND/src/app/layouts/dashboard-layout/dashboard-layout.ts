import { Component } from '@angular/core';
import { Sidebar } from "../sidebar/sidebar";
import { DashboardHome } from "src/app/dashboard/dashboard-home/dashboard-home";
import { DashboardTopbar } from "src/app/components/dashboard-topbar/dashboard-topbar";
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-dashboard-layout',
  imports: [Sidebar, DashboardHome, DashboardTopbar, RouterModule],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {

}
