import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Router } from '@angular/router';
import { User } from './types';

@Injectable({providedIn:'root'})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  readonly token = signal<string | null>(sessionStorage.getItem('pv_token'));
  readonly user = signal<User | null>(null);
  readonly loggedIn = computed(() => Boolean(this.token()));
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly canRecognize = computed(() => ['admin', 'operator'].includes(this.user()?.role ?? ''));

  login(email: string, password: string) {
    return this.http.post<{access_token:string}>('/api/auth/login', {email, password}).pipe(
      tap(r => {sessionStorage.setItem('pv_token', r.access_token); this.token.set(r.access_token);})
    );
  }
  refresh() {
    return this.http.get<User>('/api/auth/me').pipe(tap(user => this.user.set(user)));
  }
  logout() {
    sessionStorage.removeItem('pv_token');
    this.token.set(null); this.user.set(null);
    this.router.navigateByUrl('/login');
  }
}
