import { Component, inject, OnInit } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";
import { AuthService } from "../core/auth.service";
@Component({
  selector: "app-shell",
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: ` <div class="app-shell">
    <aside class="sidebar" [class.mobile-open]="menuOpen">
      <a class="brand" routerLink="/dashboard" (click)="menuOpen = false">
        <span class="brand-icon">▣</span
        ><span
          ><strong>PLATE<span class="accent">VISION</span></strong
          ><small>ON-PREMISE INTELLIGENCE</small></span
        >
      </a>
      <div class="sidebar-caption">WORKSPACE</div>
      <nav class="side-nav">
        <a
          routerLink="/dashboard"
          routerLinkActive="selected"
          (click)="menuOpen = false"
          ><span class="nav-icon">◫</span> Dashboard</a
        >
        <a
          *ngIf="auth.canRecognize()"
          routerLink="/recognize"
          routerLinkActive="selected"
          (click)="menuOpen = false"
          ><span class="nav-icon">⌗</span> Plate recognition</a
        >
        <a
          *ngIf="auth.isAdmin()"
          routerLink="/users"
          routerLinkActive="selected"
          (click)="menuOpen = false"
          ><span class="nav-icon">♙</span> User management</a
        >
        <a
          *ngIf="auth.isAdmin()"
          routerLink="/settings"
          routerLinkActive="selected"
          (click)="menuOpen = false"
          ><span class="nav-icon">⚙</span> Application settings</a
        >
      </nav>
    </aside>
    <div class="mobile-scrim" *ngIf="menuOpen" (click)="menuOpen = false"></div>
    <div class="main-region">
      <header class="topbar">
        <button
          type="button"
          class="icon-button menu-button"
          (click)="menuOpen = !menuOpen"
          aria-label="Toggle navigation"
        >
          ☰
        </button>
        <div class="crumb">
          <span>Workspace</span><span class="slash">/</span
          ><strong>PlateVision</strong>
        </div>
        <div class="top-actions">
          <div class="avatar">
            {{ (auth.user()?.full_name || "U").charAt(0).toUpperCase() }}
          </div>
          <span class="top-identity"
            ><b>{{ auth.user()?.full_name }}</b
            ><small>{{ auth.user()?.role }}</small></span
          >
          <button
            type="button"
            class="icon-button"
            title="Sign out"
            (click)="auth.logout()"
          >
            ↪
          </button>
        </div>
      </header>
      <main class="page-content"><router-outlet /></main>
    </div>
  </div>`,
})
export class ShellComponent implements OnInit {
  auth = inject(AuthService);
  menuOpen = false;
  ngOnInit() {
    this.auth.refresh().subscribe({ error: () => {} });
  }
}
