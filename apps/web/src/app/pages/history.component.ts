import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, PercentPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DetectionHistoryPage, DetectionHistoryRecord } from '../core/types';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, DatePipe, PercentPipe],
  template: `
    <div class="page-heading">
      <div>
        <span class="eyebrow">SAVED DETECTIONS</span>
        <h1>Detection history</h1>
        <p class="muted">Review recognized plates and their saved image crops.</p>
      </div>
      <button class="secondary-button" (click)="loadPage(page())" [disabled]="loading()">Refresh</button>
    </div>
    <p class="error-notice" *ngIf="error()">{{ error() }}</p>
    <div class="history-grid">
      <section class="surface panel">
        <div class="panel-header">
          <div><h2>Plate records</h2><p>{{ total() }} saved detections</p></div>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Plate</th><th>Detected at</th><th>Confidence</th></tr></thead>
            <tbody>
              <tr *ngFor="let record of records()" (click)="select(record.id)" class="history-row"
                  [class.history-selected]="selected()?.id === record.id" tabindex="0"
                  (keydown.enter)="select(record.id)">
                <td class="mono">{{ record.text || 'Unreadable' }}</td>
                <td>{{ record.timestamp | date:'medium' }}</td>
                <td>{{ record.detection_confidence | percent:'1.1-1' }}</td>
              </tr>
              <tr *ngIf="!loading() && !records().length"><td colspan="3" class="empty-cell">No saved plate detections yet.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="history-pagination" *ngIf="total() > pageSize">
          <button class="secondary-button" (click)="loadPage(page() - 1)" [disabled]="page() === 1 || loading()">Previous</button>
          <span>Page {{ page() }} of {{ Math.ceil(total() / pageSize) }}</span>
          <button class="secondary-button" (click)="loadPage(page() + 1)" [disabled]="page() * pageSize >= total() || loading()">Next</button>
        </div>
      </section>
      <section class="surface panel" *ngIf="selected() as record; else prompt">
        <div class="panel-header"><div><h2>Detection #{{ record.id }}</h2><p>{{ record.timestamp | date:'medium' }}</p></div></div>
        <div class="history-image-frame">
          <img *ngIf="imageUrl()" [src]="imageUrl()" [alt]="'Cropped plate image for ' + (record.text || 'unreadable plate')" />
          <span *ngIf="!imageUrl()">{{ imageLoading() ? 'Loading plate image…' : 'Plate image unavailable' }}</span>
        </div>
        <div class="plate-number">{{ record.text || 'Text not recognized' }}</div>
        <div class="history-facts">
          <div><span>Detection confidence</span><b>{{ record.detection_confidence | percent:'1.1-1' }}</b></div>
          <div><span>OCR confidence</span><b>{{ record.ocr_confidence === null ? '—' : (record.ocr_confidence | percent:'1.1-1') }}</b></div>
          <div><span>Region</span><b>{{ record.region || '—' }}</b></div>
          <div><span>Bounding box</span><b>{{ record.bbox.x }}, {{ record.bbox.y }} · {{ record.bbox.width }} × {{ record.bbox.height }} px</b></div>
          <div><span>Operation</span><b>#{{ record.operation_id }}</b></div>
          <div><span>Processing time</span><b>{{ record.duration_ms }} ms</b></div>
          <div><span>Operator ID</span><b>{{ record.user_id ?? 'Deleted user' }}</b></div>
        </div>
        <div *ngIf="record.character_confidences.length" class="history-characters">
          <h3>Character confidence</h3>
          <span *ngFor="let character of record.character_confidences">{{ character.character }} {{ character.confidence | percent:'1.0-0' }}</span>
        </div>
      </section>
      <ng-template #prompt><section class="surface panel result-placeholder"><h2>Select a plate record</h2><p>Its details and cropped image will appear here.</p></section></ng-template>
    </div>
  `,
})
export class HistoryComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  protected Math = Math;
  readonly pageSize = 20;
  records = signal<DetectionHistoryRecord[]>([]);
  selected = signal<DetectionHistoryRecord | null>(null);
  imageUrl = signal<string | null>(null);
  imageLoading = signal(false);
  page = signal(1);
  total = signal(0);
  loading = signal(false);
  error = signal('');
  private selectionVersion = 0;

  ngOnInit() { this.loadPage(1); }

  loadPage(page: number) {
    if (page < 1 || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.http.get<DetectionHistoryPage>(`/api/history?page=${page}&page_size=${this.pageSize}`).subscribe({
      next: data => {
        this.records.set(data.items);
        this.total.set(data.total);
        this.page.set(data.page);
        this.loading.set(false);
        if (data.items.length) this.select(data.items[0].id);
        else this.clearSelection();
      },
      error: () => { this.error.set('Could not load detection history.'); this.loading.set(false); },
    });
  }

  select(id: number) {
    const version = ++this.selectionVersion;
    this.clearImage();
    this.selected.set(null);
    this.imageLoading.set(true);
    this.http.get<DetectionHistoryRecord>(`/api/history/${id}`).subscribe({
      next: record => {
        if (version !== this.selectionVersion) return;
        this.selected.set(record);
        this.http.get(record.image_url, { responseType: 'blob' }).subscribe({
          next: blob => {
            if (version !== this.selectionVersion) return;
            this.imageUrl.set(URL.createObjectURL(blob));
            this.imageLoading.set(false);
          },
          error: () => { if (version === this.selectionVersion) this.imageLoading.set(false); },
        });
      },
      error: () => { if (version === this.selectionVersion) { this.error.set('Could not load detection details.'); this.imageLoading.set(false); } },
    });
  }

  private clearImage() {
    const url = this.imageUrl();
    if (url) URL.revokeObjectURL(url);
    this.imageUrl.set(null);
  }
  private clearSelection() {
    this.selectionVersion++;
    this.clearImage();
    this.selected.set(null);
    this.imageLoading.set(false);
  }
  ngOnDestroy() { this.clearSelection(); }
}
