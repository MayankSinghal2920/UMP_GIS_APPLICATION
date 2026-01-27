import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditState } from '../../services/edit-state';
import { Api } from 'src/app/services/api';
import { UiState } from '../../services/ui-state';
import { MapZoomService } from 'src/app/services/map-zoom';

@Component({
  selector: 'app-edit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-panel.html',
  styleUrl: './edit-panel.css',
})
export class EditPanel {

  rows: any[] = [];
  total = 0;

  page = 1;
  pageSize = 12;

  search = '';
  loading = false;

  mode: 'table' | 'edit' = 'table';
  draft: any = null;

  saving = false;
  deleting = false;
  validating = false;
  error: string | null = null;

  constructor(
    public ui: UiState,
    public edit: EditState,
    private api: Api,
    private cdr: ChangeDetectorRef,
    private mapZoom: MapZoomService
  ) {}

  /* ================== GETTERS ================== */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  /* ================== LAYER ================== */
  onLayerChange() {
    this.mode = 'table';
    this.rows = [];
    this.total = 0;
    this.page = 1;
    this.search = '';
    this.error = null;
    this.draft = null;

    if (this.edit.editLayer === 'stations') {
      setTimeout(() => this.load(), 0);
    }
  }

  /* ================== TABLE ================== */
  load() {
    this.loading = true;

    this.api.getStationTable(this.page, this.pageSize, this.search).subscribe({
      next: res => {
        this.rows = res.rows || [];
        this.total = res.total || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchChange() {
    this.page = 1;
    this.load();
  }

  nextPage() {
    if (this.page * this.pageSize >= this.total) return;
    this.page++;
    this.load();
  }

  prevPage() {
    if (this.page === 1) return;
    this.page--;
    this.load();
  }

  /* ================== EDIT ================== */
  editRow(row: any) {
    this.mode = 'edit';
    this.error = null;
    this.draft = { ...row };

    const id = Number(row?.objectid);
    if (!Number.isFinite(id)) return;

    this.api.getStationById(id).subscribe({
      next: full => {
        const n = this.normalizeStation(full);
        this.draft = { ...this.draft, ...n };

        if (Number.isFinite(n.lat) && Number.isFinite(n.lng)) {
          this.mapZoom.zoomTo({
            type: 'latlng',
            lat: n.lat,
            lng: n.lng,
            zoom: 17
          });
        }

        this.cdr.detectChanges();
      },
        error: (err) => {
    console.error('getStationById failed:', err);
    this.error = err?.error?.error || 'Failed to load station details';
    this.cdr.detectChanges();
  }
    });
  }

private normalizeStation(s: any) {
  return {
    objectid: s?.objectid ?? s?.OBJECTID,
    sttncode: s?.sttncode ?? s?.station_code,
    sttnname: s?.sttnname ?? s?.station_name,
    stationtype: s?.sttntype ?? s?.stationtype,   // ✅ include sttntype
    category: s?.category,
    distkm: s?.distkm,
    distm: s?.distm,
    state: s?.state,
    district: s?.district,
    constituency: s?.constituncy ?? s?.constituency, // ✅ backend has constituncy
    lat: s?.lat ?? s?.latitude,
    lng: s?.lon ?? s?.lng ?? s?.longitude,          // ✅ backend alias is lon
  };
}

private resetPanelState() {
  this.mode = 'table';
  this.rows = [];
  this.total = 0;

  this.page = 1;
  this.pageSize = 12;

  this.search = '';
  this.loading = false;

  this.draft = null;

  this.saving = false;
  this.deleting = false;
  this.validating = false;

  this.error = null;

  // reset selection to start screen
  this.edit.editLayer = null as any;

  // clear map highlight (if any)
  this.mapZoom.clearHighlight();
}


  cancelEdit() {
    this.mode = 'table';
    this.draft = null;
    this.error = null;
    this.mapZoom.clearHighlight();
  }

  send() {
    if (!this.draft?.objectid) {
      this.error = 'Station id missing';
      return;
    }

    const payload = {
      stationtype: this.draft.stationtype,
      distkm: this.draft.distkm,
      distm: this.draft.distm,
      state: this.draft.state,
      district: this.draft.district,
      constituency: this.draft.constituency
    };

    this.saving = true;

    this.api.updateStation(this.draft.objectid, payload).subscribe({
      next: () => {
        this.saving = false;
        this.mode = 'table';
        this.draft = null;
        setTimeout(() => this.load(), 0);
      },
      error: () => {
        this.saving = false;
        this.error = 'Failed to save changes';
      }
    });
  }

  validateStationCode() {
    if (!this.draft?.sttncode) return;

    this.validating = true;

    this.api.getStationByCode(this.draft.sttncode).subscribe({
      next: row => {
        this.draft.sttnname = row?.station_name;
        this.draft.category = row?.category;
        this.validating = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.validating = false;
        this.cdr.detectChanges();
      }
    });
  }

  deleteRow(row: any) {
    if (!confirm(`Delete station "${row.sttncode}"?`)) return;

    this.deleting = true;

    this.api.deleteStation(row.objectid).subscribe({
      next: () => {
        this.deleting = false;
        if (this.rows.length === 1 && this.page > 1) this.page--;
        this.load();
      },
      error: () => {
        this.deleting = false;
      }
    });
  }

  close() {
    this.ui.activePanel = null;
    this.resetPanelState();
    this.edit.enabled = false;
    this.mode = 'table';
    this.rows = [];
    this.search = '';
    this.error = null;
    this.draft = null;
  }
}
