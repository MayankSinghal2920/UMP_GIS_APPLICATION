import { Component } from '@angular/core';
import { Sidebar } from "../sidebar/sidebar";
import { DashboardTopbar } from "src/app/components/dashboard-topbar/dashboard-topbar";
import { RouterModule } from "@angular/router";

@Component({
  selector: 'app-dashboard-layout',
  imports: [Sidebar, DashboardTopbar, RouterModule],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayout {

}
