import { Component, OnInit, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { CommonModule, PercentPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Settings } from "../core/types";
@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, PercentPipe],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">PLATFORM CONFIGURATION</span>
        <h1>Application settings</h1>
        <p class="muted">
          Fine-tune confidence thresholds, input limits, and data retention
          behavior.
        </p>
      </div>
    </div>
    <div class="settings-layout">
      <section class="surface panel" *ngIf="settings() as cfg">
        <div class="panel-header">
          <div>
            <h2>Recognition parameters</h2>
            <p>Changes take effect on the next image.</p>
          </div>
          <span class="soft-tag">ENGINE SETTINGS</span>
        </div>
        <form (ngSubmit)="save()" class="settings-form">
          <div class="setting-row">
            <div>
              <b>Detection confidence threshold</b>
              <p>Minimum confidence for a plate region to appear in results.</p>
            </div>
            <span class="setting-value">{{
              cfg.detection_threshold | percent: "1.0-0"
            }}</span>
          </div>
          <input
            type="range"
            [(ngModel)]="cfg.detection_threshold"
            name="detection_threshold"
            min="0.2"
            max="0.99"
            step="0.01"
          />
          <div class="setting-row">
            <div>
              <b>OCR confidence threshold</b>
              <p>Reject text recognition below this confidence.</p>
            </div>
            <span class="setting-value">{{
              cfg.ocr_threshold | percent: "1.0-0"
            }}</span>
          </div>
          <input
            type="range"
            [(ngModel)]="cfg.ocr_threshold"
            name="ocr_threshold"
            min="0"
            max="0.99"
            step="0.01"
          />
          <div class="setting-row">
            <div>
              <b>Maximum upload size</b>
              <p>
                Files larger than this limit are rejected before processing.
                Hard server cap also applies.
              </p>
            </div>
            <div class="setting-number">
              <input
                type="number"
                [(ngModel)]="cfg.max_upload_mb"
                name="max_upload_mb"
                min="1"
                max="25"
                required
              />
              MB
            </div>
          </div>
          <div class="setting-row">
            <div>
              <b>Store anonymous operation metadata</b>
              <p>
                Only duration, plate count, scores, timestamp and operator ID.
                No plate text or images.
              </p>
            </div>
            <label class="toggle"
              ><input
                type="checkbox"
                [(ngModel)]="cfg.save_operation_metadata"
                name="save_operation_metadata" /><span></span
            ></label>
          </div>
          <p *ngIf="error()" class="error-notice">{{ error() }}</p>
          <p *ngIf="saved()" class="success-notice">
            Settings updated successfully.
          </p>
          <div class="settings-actions">
            <button class="primary-button" type="submit" [disabled]="busy()">
              {{ busy() ? "Saving…" : "Save changes" }}
            </button>
          </div>
        </form>
      </section>
    </div>`,
})
export class SettingsComponent implements OnInit {
  private http = inject(HttpClient);
  settings = signal<Settings | null>(null);
  error = signal("");
  saved = signal(false);
  busy = signal(false);
  ngOnInit() {
    this.http.get<Settings>("/api/settings").subscribe({
      next: (s) => this.settings.set(s),
      error: () => this.error.set("Unable to load settings"),
    });
  }
  save() {
    const value = this.settings();
    if (!value) return;
    this.busy.set(true);
    this.saved.set(false);
    this.error.set("");
    this.http.put<Settings>("/api/settings", value).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.busy.set(false);
        this.saved.set(true);
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(e.error?.detail || "Could not save settings");
      },
    });
  }
}
