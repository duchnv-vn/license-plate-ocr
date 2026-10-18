import { Component, OnInit, inject, signal, computed } from "@angular/core";
import {
  CommonModule,
  DatePipe,
  DecimalPipe,
  PercentPipe,
} from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { RouterLink } from "@angular/router";
import { Dashboard } from "../core/types";
@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, PercentPipe, RouterLink],
  template: ` <div class="page-heading">
      <div>
        <span class="eyebrow">SYSTEM OVERVIEW</span>
        <h1>Operations dashboard</h1>
        <p class="muted">
          Real-time insight into your on-premise recognition activity.
        </p>
      </div>
      <button
        class="secondary-button"
        (click)="reload()"
        [disabled]="loading()"
      >
        ↻ Refresh
      </button>
    </div>
    <p class="error-notice" *ngIf="error()">{{ error() }}</p>
    <div class="kpi-grid">
      <div class="surface kpi">
        <div class="kpi-icon blue">▧</div>
        <span>Images processed today</span
        ><strong>{{ data()?.operations_today ?? 0 }}</strong
        ><small>Completed recognition requests</small>
      </div>
      <div class="surface kpi">
        <div class="kpi-icon cyan">▣</div>
        <span>Plates detected today</span
        ><strong>{{ data()?.plates_today ?? 0 }}</strong
        ><small>Across all processed images</small>
      </div>
      <div class="surface kpi">
        <div class="kpi-icon violet">⏱</div>
        <span>Average processing time</span
        ><strong
          >{{ data()?.average_duration_ms ?? 0 | number: "1.0-0" }}
          <em>ms</em></strong
        ><small>Today’s mean latency</small>
      </div>
      <div class="surface kpi">
        <div class="kpi-icon green">◎</div>
        <span>Average OCR confidence</span
        ><strong>{{
          data()?.average_ocr_confidence ?? 0 | percent: "1.0-1"
        }}</strong
        ><small>Recognized text confidence</small>
      </div>
    </div>
    <div class="dashboard-grid">
      <section class="surface panel">
        <div class="panel-header">
          <div>
            <h2>Processing activity</h2>
            <p>Image uploads · past 7 days</p>
          </div>
          <span class="soft-tag">LAST 7 DAYS</span>
        </div>
        <div class="bar-chart">
          <div class="chart-col" *ngFor="let point of data()?.trend">
            <span class="bar-value">{{ point.count }}</span>
            <div class="bar-track">
              <div class="bar" [style.height.%]="barPercent(point.count)"></div>
            </div>
            <small>{{ point.date.slice(5) }}</small>
          </div>
        </div>
      </section>
      <section class="surface panel system-panel">
        <div class="panel-header">
          <div>
            <h2>System status</h2>
            <p>Platform health & privacy</p>
          </div>
          <span class="status-chip">● Operational</span>
        </div>
        <div class="system-facts">
          <div><span>Recognition engine</span><b>ONNX · FastALPR</b></div>
          <div>
            <span>Image storage</span><b class="privacy-text">Disabled</b>
          </div>
          <div><span>Deployment</span><b>Local / On-prem</b></div>
          <div>
            <span>Requests (last 24h)</span
            ><b>{{ data()?.operations_last_24h ?? 0 }}</b>
          </div>
        </div>
      </section>
    </div>
    <section class="surface panel">
      <div class="panel-header">
        <div>
          <h2>Recent operations</h2>
          <p>No images, filenames, or plate numbers are stored in history.</p>
        </div>
        <a routerLink="/recognize" class="inline-link">New recognition →</a>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Operation</th>
              <th>Timestamp</th>
              <th>Detected plates</th>
              <th>Duration</th>
              <th>Avg. OCR confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of data()?.recent">
              <td class="mono">#{{ item.id }}</td>
              <td>{{ item.timestamp | date: "medium" }}</td>
              <td>{{ item.plate_count }}</td>
              <td>{{ item.duration_ms }} ms</td>
              <td>
                {{
                  item.average_confidence === null
                    ? "—"
                    : (item.average_confidence | percent: "1.0-1")
                }}
              </td>
              <td>
                <span class="status-chip" [class.failed]="!item.success">{{
                  item.success ? "Completed" : "Failed"
                }}</span>
              </td>
            </tr>
            <tr *ngIf="!data()?.recent?.length">
              <td colspan="6" class="empty-cell">
                No operation metrics yet. Process your first image to populate
                this view.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>`,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  data = signal<Dashboard | null>(null);
  error = signal("");
  loading = signal(false);
  private max = computed(() =>
    Math.max(1, ...(this.data()?.trend ?? []).map((x) => x.count)),
  );
  ngOnInit() {
    this.reload();
  }
  barPercent(value: number) {
    return Math.max(2, Math.round((value / this.max()) * 100));
  }
  reload() {
    this.loading.set(true);
    this.error.set("");
    this.http.get<Dashboard>("/api/dashboard/summary").subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Could not load dashboard metrics");
        this.loading.set(false);
      },
    });
  }
}
