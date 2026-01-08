import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { HomeComponent } from './components/home/home';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { authGuard } from './guards/auth-guard';
import { DashboardHome } from './dashboard/dashboard-home/dashboard-home';

export const routes: Routes = [

  // Login
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },

  // Dashboard (after login)
  { path: 'dashboard',
    component: DashboardLayout, 
    canActivate: [authGuard],
    children: [
      { path: '', component: DashboardHome },   // 👈 DEFAULT dashboard page
       
      // GIS / Railway Asset Editing page
      { path: 'railway-assets', component: HomeComponent },
    ]
},

  // GIS page (later we can protect this)
  { path: 'home', component: HomeComponent },

  // Wildcard MUST be last
  { path: '**', redirectTo: 'login' },
];
