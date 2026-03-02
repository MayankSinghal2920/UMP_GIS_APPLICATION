import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { EditState } from '../../services/edit-state';
import { Api } from 'src/app/api/api';
import { UiState } from '../../services/ui-state';
import { MapZoomService } from 'src/app/services/map-zoom';

@Component({
  selector: 'app-edit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-panel.html',
  styleUrl: './edit-panel.css',
})
export class EditPanel implements OnInit, OnDestroy {
  // ✅ holds all fetched rows from backend (unfiltered)
  private allRows: any[] = [];

  // ✅ rows after frontend status filter + search (if backend does not search)
  private filteredRows: any[] = [];

  // ✅ rows shown in UI (paged slice of filteredRows)
  rows: any[] = [];

  // counts
  total = 0; // (kept for compatibility)
  filteredTotal = 0;

  page = 1;
  pageSize = 8;

  // IMPORTANT: backend max is 200 (as per your model code), so we fetch in chunks
  private fetchPageSize = 200;

  search = '';
  loading = false;

  mode: 'table' | 'edit' = 'table';
  draft: any = null;

  saving = false;
  deleting = false;
  validating = false;
  error: string | null = null;

  // ================== GEOMETRY EDIT STATE ==================
  geomEditing = false;
  private dragSub?: Subscription;

  // ✅ Listen to edit state changes so programmatic layer selection triggers load
  private stateSub?: Subscription;

  // ✅ cancel/ignore older loads
  private loadSeq = 0;

  constructor(
    public ui: UiState,
    public edit: EditState,
    private api: Api,
    private cdr: ChangeDetectorRef,
    private mapZoom: MapZoomService
  ) {}

  ngOnInit(): void {
    // ✅ When Home sets edit.enable() + edit.setLayer('stations'), auto-load here
    this.stateSub = this.edit.stateChanged$.subscribe(() => {
      if (!this.edit.enabled) return;

      // load only for stations (extend similarly for other layers later)
      if (this.edit.editLayer === 'stations') {
        // do not reload if currently editing a row
        if (this.mode === 'table') this.load(true);
      }
    });

    // If already enabled when component creates (edge case)
    if (this.edit.enabled && this.edit.editLayer === 'stations') {
      this.load(true);
    }
  }

  ngOnDestroy(): void {
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;

    this.stateSub?.unsubscribe();
    this.stateSub = undefined;
  }

  /* ================== GETTERS ================== */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTotal / this.pageSize));
  }

  get showingFrom(): number {
    if (!this.filteredTotal) return 0;
    return (this.page - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    if (!this.filteredTotal) return 0;
    return Math.min(this.filteredTotal, this.page * this.pageSize);
  }

  get showingText(): string {
    return `${this.showingFrom}-${this.showingTo} of ${this.filteredTotal}`;
  }

  
  /* ================== LAYER ================== */
  onLayerChange() {
    // ✅ notify Map.ts to hide/show layers
    this.edit.setLayer(this.edit.editLayer);

    this.mode = 'table';
    this.rows = [];
    this.allRows = [];
    this.filteredRows = [];
    this.total = 0;
    this.filteredTotal = 0;
    this.page = 1;
    this.search = '';
    this.error = null;
    this.draft = null;

    // geometry state reset
    this.geomEditing = false;
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;
    this.mapZoom.clearHighlight();

    if (this.edit.editLayer === 'stations') {
      setTimeout(() => this.load(true), 0);
    }
  }

  private getUserType(): string {
    return (localStorage.getItem('user_type') || '').trim().toLowerCase();
  }

  /**
   * ✅ Frontend status filtering:
   * Maker => status NULL/blank
   * Checker => "Sent to Checker"
   * Approver => "Sent to Approver"
   */
  private isVisibleForUser(row: any): boolean {
    const userType = this.getUserType();
    const status = row?.status == null ? '' : String(row.status).trim().toLowerCase();

    if (userType === 'maker') return status === '';
    if (userType === 'checker') return status === 'sent to checker';
    if (userType === 'approver') return status === 'sent to approver';

    return true;
  }

  private applyPagination(): void {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;

    this.rows = this.filteredRows.slice(start, end);
    this.filteredTotal = this.filteredRows.length;

    // keep legacy total too (if your HTML uses it)
    this.total = this.filteredTotal;
  }

  /* ================== TABLE LOAD ================== */

  /**
   * Loads ALL station rows from backend in chunks of 200 (page 1..N),
   * then applies frontend filtering + local pagination.
   *
   * @param resetPage if true, page=1
   */
  load(resetPage = false): void {
    if (this.edit.editLayer !== 'stations') return;

    const division = (localStorage.getItem('division') || '').trim();
    if (!division) {
      this.error = 'Division missing in localStorage';
      this.cdr.detectChanges();
      return;
    }

    if (resetPage) this.page = 1;

    this.loading = true;
    this.error = null;

    const seq = ++this.loadSeq;
    const collected: any[] = [];

    const fetchOne = (p: number) => {
      // ignore old requests
      if (seq !== this.loadSeq) return;

      this.api.getStationTable(p, this.fetchPageSize, this.search).subscribe({
        next: (res) => {
          if (seq !== this.loadSeq) return;

          const rows = Array.isArray(res?.rows) ? res.rows : [];
          collected.push(...rows);

          // If backend returned less than pageSize, we are done
          if (rows.length < this.fetchPageSize) {
            this.allRows = collected;

            // ✅ frontend role/status filtering
            this.filteredRows = this.allRows.filter((r) => this.isVisibleForUser(r));

            // ✅ local pagination only
            this.applyPagination();

            this.loading = false;
            this.cdr.detectChanges();
            return;
          }

          // else fetch next page
          fetchOne(p + 1);
        },
        error: (err) => {
          if (seq !== this.loadSeq) return;

          console.error('getStationTable failed', err);
          this.allRows = [];
          this.filteredRows = [];
          this.rows = [];
          this.total = 0;
          this.filteredTotal = 0;

          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    };

    fetchOne(1);
  }

  onSearchChange() {
    this.page = 1;
    this.load(true);
  }

  nextPage() {
    if (this.page >= this.totalPages) return;
    this.page++;
    // ✅ do NOT call backend again
    this.applyPagination();
    this.cdr.detectChanges();
  }

  prevPage() {
    if (this.page <= 1) return;
    this.page--;
    // ✅ do NOT call backend again
    this.applyPagination();
    this.cdr.detectChanges();
  }

  /* ================== EDIT ================== */

  editRow(row: any) {
    this.mode = 'edit';
    this.error = null;
    this.draft = { ...row };

    // geometry state reset for fresh open
    this.geomEditing = false;
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;
    this.mapZoom.clearHighlight();

    const id = Number(row?.objectid);
    if (!Number.isFinite(id)) return;

    this.api.getStationById(id).subscribe({
      next: (full) => {

        const n = this.normalizeStation(full);
        this.draft = { ...this.draft, ...n };

        // ensure draft always has latest lat/lng
        this.draft.lat = n.lat;
        this.draft.lng = n.lng;

        if (Number.isFinite(n.lat) && Number.isFinite(n.lng)) {
          this.mapZoom.zoomTo({
            type: 'latlng',
            lat: n.lat,
            lng: n.lng,
            zoom: 17,
            draggable: false,
          } as any);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('getStationById failed:', err);
        this.error = err?.error?.error || 'Failed to load station details';
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeStation(s: any) {
    return {
      objectid: s?.objectid ?? s?.OBJECTID,
      sttncode: s?.sttncode ?? s?.station_code,
      sttnname: s?.sttnname ?? s?.station_name,
      stationtype: s?.sttntype ?? s?.stationtype,
      category: s?.category,
      distkm: s?.distkm,
      distm: s?.distm,
      state: s?.state,
      district: s?.district,
      constituency: s?.constituncy ?? s?.constituency,
      lat: Number(s?.lat ?? s?.ycoord ?? s?.latitude),
      lng: Number(s?.lon ?? s?.lng ?? s?.xcoord ?? s?.longitude),

    };
  }

  // ================== GEOMETRY FLOW ==================

  startGeometryEdit() {
    if (!this.draft) return;

    const lat = Number(this.draft.lat);
    const lng = Number(this.draft.lng);

    alert('Edit Geometry Mode is ON. You can now move the station point.');

    this.geomEditing = true;

    this.mapZoom.zoomTo({
      type: 'latlng',
      lat,
      lng,
      zoom: 17,
      draggable: true,
    });

    this.dragSub?.unsubscribe();
    this.dragSub = this.edit.dragEnd$.subscribe(({ lat: newLat, lng: newLng }) => {
      if (!this.draft) return;
      this.draft.lat = newLat;
      this.draft.lng = newLng;
      this.cdr.detectChanges();
    });
  }

  saveGeometry() {
    if (!this.geomEditing) return;

    alert('Geometry is fixed and Edit Geometry Mode is OFF.');

    this.geomEditing = false;
    this.edit.lockDrag();

    const lat = Number(this.draft?.lat);
    const lng = Number(this.draft?.lng);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      this.mapZoom.zoomTo({
        type: 'latlng',
        lat,
        lng,
        zoom: 17,
        draggable: false,
      } as any);
    }

    this.cdr.detectChanges();
  }

  cancelEdit() {
    this.mode = 'table';
    this.draft = null;
    this.error = null;

    this.geomEditing = false;
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;

    this.mapZoom.zoomHome();
    this.mapZoom.clearHighlight();
  }

  send() {
    if (!this.draft?.objectid) {
      this.error = 'Station id missing';
      this.cdr.detectChanges();
      return;
    }

    const lat = Number(this.draft.lat);
    const lng = Number(this.draft.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      this.error = 'New geometry not captured. Please drag the point and click Save Geometry.';
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      stationtype: this.draft.stationtype,
      distkm: this.draft.distkm,
      distm: this.draft.distm,
      state: this.draft.state,
      district: this.draft.district,
      constituency: this.draft.constituency,

      lat,
      lng,
      lon: lng,
      longitude: lng,
      latitude: lat,
    };

    this.saving = true;

    this.api.updateStation(this.draft.objectid, payload).subscribe({
      next: () => {
        this.saving = false;

        this.mode = 'table';
        this.draft = null;

        this.geomEditing = false;
        this.dragSub?.unsubscribe();
        this.dragSub = undefined;

        this.mapZoom.zoomHome();
        this.mapZoom.clearHighlight();

        setTimeout(() => this.load(false), 0);
        this.cdr.detectChanges();
      },
      error: () => {
        this.saving = false;
        this.error = 'Failed to save changes';
        this.cdr.detectChanges();
      },
    });
  }

  validateStationCode() {
    if (!this.draft?.sttncode) return;

    this.validating = true;

    this.api.getStationByCode(this.draft.sttncode).subscribe({
      next: (row) => {
        if (!this.draft) return;
        this.draft.sttnname = row?.station_name;
        this.draft.category = row?.category;
        this.validating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.validating = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteRow(row: any) {
    if (!confirm(`Delete station "${row.sttncode}"?`)) return;

    this.deleting = true;

    this.api.deleteStation(row.objectid).subscribe({
      next: () => {
        this.deleting = false;

        // remove locally then repaginate
        this.allRows = this.allRows.filter((r) => r.objectid !== row.objectid);
        this.filteredRows = this.allRows.filter((r) => this.isVisibleForUser(r));

        if (this.page > this.totalPages) this.page = this.totalPages;
        this.applyPagination();

        this.cdr.detectChanges();
      },
      error: () => {
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  private resetPanelState() {
    this.mode = 'table';
    this.rows = [];
    this.allRows = [];
    this.filteredRows = [];

    this.total = 0;
    this.filteredTotal = 0;

    this.page = 1;
    this.pageSize = 8;

    this.search = '';
    this.loading = false;

    this.draft = null;

    this.saving = false;
    this.deleting = false;
    this.validating = false;

    this.geomEditing = false;
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;

    this.error = null;

    this.edit.setLayer(null as any);
    this.mapZoom.clearHighlight();
  }

  close() {
    this.mapZoom.zoomHome();
    this.mapZoom.clearHighlight();

    this.ui.activePanel = null;
    this.resetPanelState();

    this.edit.disable();
  }
}
