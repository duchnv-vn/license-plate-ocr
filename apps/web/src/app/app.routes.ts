import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { Routes, Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ShellComponent } from './layout/shell.component';
import { LoginComponent } from './pages/login.component';
import { DashboardComponent } from './pages/dashboard.component';
import { RecognizeComponent } from './pages/recognize.component';
import { UsersComponent } from './pages/users.component';
import { SettingsComponent } from './pages/settings.component';

function authGuard() {
  const auth = inject(AuthService);
  return auth.loggedIn() ? true : inject(Router).parseUrl('/login');
}
function adminGuard() {
  const auth = inject(AuthService), router = inject(Router);
  if (auth.user()) return auth.isAdmin() ? true : router.parseUrl('/dashboard');
  return auth.refresh().pipe(map(u => u.role === 'admin' ? true : router.parseUrl('/dashboard')), catchError(() => of(router.parseUrl('/login'))));
}
function operatorGuard() {
  const auth = inject(AuthService), router = inject(Router);
  if (auth.user()) return auth.canRecognize() ? true : router.parseUrl('/dashboard');
  return auth.refresh().pipe(map(u => ['admin','operator'].includes(u.role) ? true : router.parseUrl('/dashboard')), catchError(() => of(router.parseUrl('/login'))));
}
export const routes: Routes = [
  {path:'login',component:LoginComponent},
  {path:'',component:ShellComponent,canActivate:[authGuard],children:[
    {path:'dashboard',component:DashboardComponent},
    {path:'recognize',component:RecognizeComponent,canActivate:[operatorGuard]},
    {path:'users',component:UsersComponent,canActivate:[adminGuard]},
    {path:'settings',component:SettingsComponent,canActivate:[adminGuard]},
    {path:'',pathMatch:'full',redirectTo:'dashboard'},
  ]},
  {path:'**',redirectTo:''}
];
