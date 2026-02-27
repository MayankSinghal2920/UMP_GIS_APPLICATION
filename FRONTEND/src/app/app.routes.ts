import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { DashboardLayout } from './layouts/dashboard-layout/dashboard-layout';
import { authGuard } from './guards/auth-guard';
import { DashboardHome } from './dashboard/dashboard-home/dashboard-home';
import { HomeComponent } from './components/home/home';
import { UserManagementComponent } from './dashboard/user-management/user-management';
import { adminGuard } from './guards/admin-guard';





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
       {
      path: 'user-management',
      component: UserManagementComponent,
      canActivate: [adminGuard], 
      data: { title: 'User Management' }
    }
    ]
  },

  // Wildcard
  { path: '**', redirectTo: 'login' }
];
