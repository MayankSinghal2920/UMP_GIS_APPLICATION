import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { HomeComponent } from './components/home/home';

export const routes: Routes = [

    { path: '', component: Login },      // login first
    { path: 'home', component: HomeComponent }, // GIS page
    { path: '**', redirectTo: '' }
];
