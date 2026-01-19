import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { authGuard } from './guards/auth-guard';
import { DashboardHome } from './dashboard/dashboard-home/dashboard-home';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [

  // Default → Login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login
  { path: 'login', component: Login },

  // Dashboard (protected)
  {
    path: 'dashboard',
    component: DashboardLayout,
    canActivate: [authGuard],
    children: [
      { path: '', 
        component: DashboardHome,
        data: { title: 'Dashboard' }
       },
      { path: 'railway-assets', 
        component: HomeComponent,
        data: {title: 'Railway Asset Editing'}
      },
    ]
  },

  // Wildcard
  { path: '**', redirectTo: 'login' }
];
