import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { CommonModule, PercentPipe } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Prediction, Settings } from "../core/types";
@Component({
  selector: "app-recognize",
  standalone: true,
  imports: [CommonModule, PercentPipe],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">VISION WORKSPACE</span>
        <h1>License plate recognition</h1>
        <p class="muted">
          Upload an image, inspect model results, and view plate detection
          overlays.
        </p>
      </div>
    </div>
    <div class="recognition-grid">
      <div class="left-stack">
        <section class="surface panel">
          <div class="panel-header">
            <div>
              <h2>Input image</h2>
              <p>
                JPEG, PNG, or WebP · limit
                {{ settings()?.max_upload_mb ?? 8 }} MB
              </p>
            </div>
          </div>
          <input
            #fileInput
            class="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            (change)="onInput($event)"
          />
          <div
            *ngIf="!previewUrl()"
            class="drop-area"
            (dragover)="allowDrop($event)"
            (drop)="onDrop($event)"
            (click)="fileInput.click()"
            (keydown.enter)="fileInput.click()"
            tabindex="0"
            role="button"
            aria-label="Select an image"
          >
            <span class="drop-icon">↥</span>
            <h3>Drop your image here</h3>
            <p>or click to browse files</p>
            <span class="file-formats">JPG · PNG · WEBP</span>
          </div>
          <div *ngIf="previewUrl()" class="preview-wrapper">
            <div class="preview-top">
              <span class="file-name">▧ {{ file()?.name }}</span
              ><button
                class="text-button"
                (click)="clear(); fileInput.value = ''"
              >
                ✕ Remove
              </button>
            </div>
            <div class="image-stage">
              <img
                [src]="previewUrl()"
                alt="Selected license plate input image; remains in the browser only"
              />
              <svg
                *ngIf="result()"
                class="overlay"
                [attr.viewBox]="
                  '0 0 ' + result()!.width + ' ' + result()!.height
                "
                preserveAspectRatio="none"
                aria-label="License plate bounding boxes"
              >
                <g *ngFor="let plate of result()?.plates">
                  <rect
                    [attr.x]="plate.bbox.x"
                    [attr.y]="plate.bbox.y"
                    [attr.width]="plate.bbox.width"
                    [attr.height]="plate.bbox.height"
                    fill="none"
                    stroke="#42f4bd"
                    [attr.stroke-width]="Math.max(2, result()!.width / 450)"
                  />
                  <rect
                    [attr.x]="plate.bbox.x"
                    [attr.y]="
                      Math.max(
                        0,
                        plate.bbox.y - Math.max(22, result()!.width / 45)
                      )
                    "
                    [attr.width]="
                      Math.max(
                        plate.bbox.width,
                        plate.text.length * (result()!.width / 75) + 30
                      )
                    "
                    [attr.height]="Math.max(22, result()!.width / 45)"
                    fill="#00af89"
                    opacity=".93"
                  />
                  <text
                    [attr.x]="plate.bbox.x + 7"
                    [attr.y]="Math.max(16, plate.bbox.y - 6)"
                    fill="#ffffff"
                    [attr.font-size]="Math.max(15, result()!.width / 60)"
                    font-weight="bold"
                  >
                    {{ plate.text || "UNREADABLE" }} ·
                    {{ (plate.detection_confidence * 100).toFixed(0) }}%
                  </text>
                </g>
              </svg>
            </div>
          </div>
          <p class="error-notice" *ngIf="error()">{{ error() }}</p>
          <button
            class="primary-button full"
            (click)="process()"
            [disabled]="!file() || busy()"
          >
            {{
              busy() ? "◌ Processing image…" : "⌗  Detect & recognize plates"
            }}
          </button>
        </section>
      </div>
      <div class="right-stack">
        <section class="surface panel">
          <div class="panel-header">
            <div>
              <h2>Recognition results</h2>
              <p>
                {{ result() ? "Analysis completed" : "Ready for analysis" }}
              </p>
            </div>
            <span class="soft-tag">PRETRAINED MODELS</span>
          </div>
          <ng-container *ngIf="result() as output; else noResult">
            <div class="result-stats">
              <div>
                <strong>{{ output.plate_count }}</strong
                ><span>Detected plates</span>
              </div>
              <div>
                <strong>{{ output.duration_ms }} <em>ms</em></strong
                ><span>Processing time</span>
              </div>
              <div>
                <strong>{{ output.width }} × {{ output.height }}</strong
                ><span>Image resolution</span>
              </div>
            </div>
            <div
              *ngFor="let plate of output.plates; index as i"
              class="plate-result"
            >
              <div class="plate-result-head">
                <span class="eyebrow">PLATE {{ i + 1 }}</span
                ><span class="status-chip">Detected</span>
              </div>
              <div class="plate-number">
                {{ plate.text || "Text not recognized" }}
              </div>
              <div class="score-row">
                <span>Detection confidence</span
                ><b>{{ plate.detection_confidence | percent: "1.1-1" }}</b>
              </div>
              <div class="meter">
                <div [style.width.%]="plate.detection_confidence * 100"></div>
              </div>
              <div class="score-row">
                <span>OCR confidence</span
                ><b>{{
                  plate.ocr_confidence === null
                    ? "—"
                    : (plate.ocr_confidence | percent: "1.1-1")
                }}</b>
              </div>
              <div class="meter">
                <div [style.width.%]="(plate.ocr_confidence ?? 0) * 100"></div>
              </div>
              <div class="bbox-meta">
                BBox · {{ plate.bbox.x }}, {{ plate.bbox.y }},
                {{ plate.bbox.width }} × {{ plate.bbox.height }} px
              </div>
              <div
                *ngIf="plate.character_confidences.length"
                class="character-section"
              >
                <span>Character confidence (not character boxes)</span>
                <div class="char-grid">
                  <div *ngFor="let ch of plate.character_confidences">
                    <strong>{{ ch.character }}</strong
                    ><small>{{ ch.confidence | percent: "1.0-0" }}</small>
                  </div>
                </div>
              </div>
            </div>
            <div *ngIf="!output.plate_count" class="result-empty">
              No plate region passed the confidence threshold. Try a clearer
              image or adjust settings.
            </div>
          </ng-container>
          <ng-template #noResult
            ><div class="result-placeholder">
              <div class="result-symbol">⌗</div>
              <h3>Awaiting an image</h3>
              <p>
                Upload an image to display recognized plate text, OCR
                confidence, and detection boxes here.
              </p>
            </div></ng-template
          >
        </section>
      </div>
    </div>`,
})
export class RecognizeComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  protected Math = Math;
  file = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  result = signal<Prediction | null>(null);
  busy = signal(false);
  error = signal("");
  settings = signal<Settings | null>(null);
  ngOnInit() {
    this.http
      .get<Settings>("/api/settings")
      .subscribe({ next: (s) => this.settings.set(s), error: () => {} });
  }
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.useFile(input.files[0]);
  }
  allowDrop(event: DragEvent) {
    event.preventDefault();
  }
  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files?.[0])
      this.useFile(event.dataTransfer.files[0]);
  }
  useFile(candidate: File) {
    this.clear();
    if (!["image/png", "image/jpeg", "image/webp"].includes(candidate.type)) {
      this.error.set("Only JPEG, PNG and WebP are supported.");
      return;
    }
    if (candidate.size > (this.settings()?.max_upload_mb ?? 8) * 1024 * 1024) {
      this.error.set("File exceeds the configured size limit.");
      return;
    }
    this.file.set(candidate);
    this.previewUrl.set(URL.createObjectURL(candidate));
  }
  clear() {
    if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl()!);
    this.previewUrl.set(null);
    this.file.set(null);
    this.result.set(null);
    this.error.set("");
  }
  process() {
    const file = this.file();
    if (!file || this.busy()) return;
    this.busy.set(true);
    this.error.set("");
    this.result.set(null);
    this.http
      .post<Prediction>("/api/ocr/predict", file, {
        headers: { "Content-Type": file.type },
      })
      .subscribe({
        next: (value) => {
          this.result.set(value);
          this.busy.set(false);
        },
        error: (e) => {
          this.error.set(
            typeof e.error?.detail === "string"
              ? e.error.detail
              : "Recognition failed. Check model availability and image format.",
          );
          this.busy.set(false);
        },
      });
  }
  ngOnDestroy() {
    this.clear();
  }
}
