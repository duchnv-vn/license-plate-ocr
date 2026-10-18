import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { AuthService } from "../core/auth.service";
@Component({
  selector: "app-login",
  standalone: true,
  imports: [FormsModule, CommonModule],
  template: `<div class="auth-page">
    <div class="auth-decoration">
      <div class="radar ring1"></div>
      <div class="radar ring2"></div>
      <div class="radar ring3"></div>
      <span class="scan-mark">▣</span>
    </div>
    <section class="login-card">
      <div class="login-brand">
        <span class="brand-icon">▣</span
        ><strong>PLATE<span class="accent">VISION</span></strong>
      </div>
      <h1>Welcome back.</h1>
      <p class="muted">
        Sign in to your local license plate recognition workspace.
      </p>
      <form (ngSubmit)="submit()">
        <label
          >Email address<input
            type="email"
            [(ngModel)]="email"
            name="email"
            placeholder="you@company.com"
            required
            autocomplete="username"
        /></label>
        <label
          >Password<input
            type="password"
            [(ngModel)]="password"
            name="password"
            placeholder="Enter your password"
            required
            autocomplete="current-password"
        /></label>
        <p *ngIf="error()" class="error-notice">{{ error() }}</p>
        <button class="primary-button full" type="submit" [disabled]="busy()">
          {{ busy() ? "Signing in…" : "Sign in securely  →" }}
        </button>
      </form>
    </section>
  </div>`,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  email = "";
  password = "";
  error = signal("");
  busy = signal(false);
  submit() {
    this.busy.set(true);
    this.error.set("");
    this.auth.login(this.email, this.password).subscribe({
      next: () =>
        this.auth.refresh().subscribe({
          next: () => this.router.navigateByUrl("/dashboard"),
          error: () => {
            this.busy.set(false);
            this.error.set("Unable to load account");
          },
        }),
      error: () => {
        this.busy.set(false);
        this.error.set("Invalid credentials or sign-in temporarily limited");
      },
    });
  }
}
