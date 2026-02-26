import { ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

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
export class EditPanel implements OnDestroy {
private allRows: any[] = [];
private filteredRows: any[] = [];
  rows: any[] = [];
  total = 0;

  page = 1;
  pageSize = 8;
fetchSize = 200;  
  search = '';
  loading = false;

  mode: 'table' | 'edit' = 'table';
  draft: any = null;

  saving = false;
  deleting = false;
  validating = false;
  error: string | null = null;

  // ================== GEOMETRY EDIT STATE ==================
  geomEditing = false; // Save Geometry enabled only when true
  private dragSub?: Subscription;

  constructor(
    public ui: UiState,
    public edit: EditState,
    private api: Api,
    private cdr: ChangeDetectorRef,
    private mapZoom: MapZoomService
  ) {}

  ngOnDestroy(): void {
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;
  }

  /* ================== GETTERS ================== */
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
get filteredTotal(): number {
  return this.filteredRows.length;
}

get showingCount(): number {
  return this.rows.length;
}
  /* ================== LAYER ================== */
  onLayerChange() {
    // ✅ IMPORTANT: notify Map.ts to hide/show layers
    this.edit.setLayer(this.edit.editLayer);

    this.mode = 'table';
    this.rows = [];
    this.total = 0;
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
      setTimeout(() => this.load(), 0);
    }
  }

  private fetchAllStations(division: string, q: string): Promise<any[]> {
  const pageSize = this.fetchSize; // keep 200
  const all: any[] = [];

  const fetchPage = (page: number): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      this.api.getStationTable(page, pageSize, q, division).subscribe({
        next: (res) => {
          const rows = res?.rows || [];
          all.push(...rows);

          // stop when this page returned fewer than pageSize (last page)
          if (rows.length < pageSize) return resolve(all);

          // otherwise fetch next page
          resolve(fetchPage(page + 1));
        },
        error: (err) => reject(err),
      });
    });
  };

  return fetchPage(1);
}

private getUserType(): string {
  return (localStorage.getItem('user_type') || '').trim().toLowerCase();
}

private isVisibleForUser(row: any): boolean {
  const userType = this.getUserType();
  const status = (row?.status == null ? '' : String(row.status)).trim().toLowerCase();

  if (userType === 'maker') return status === '';
  if (userType === 'checker') return status === 'sent to checker';
  if (userType === 'approver') return status === 'sent to approver';

  return true; // default show all
}

private applyPagination(): void {
  const start = (this.page - 1) * this.pageSize;
  const end = start + this.pageSize;
  this.rows = this.filteredRows.slice(start, end);
  this.total = this.filteredRows.length;
}
  /* ================== TABLE ================== */
async load(): Promise<void> {
  this.loading = true;

  const division = (localStorage.getItem('division') || '').trim();

  try {
    // ✅ fetch ALL rows across pages (no backend change)
    this.allRows = await this.fetchAllStations(division, this.search);

    // ✅ Frontend status filtering
    this.filteredRows = this.allRows.filter((r) => this.isVisibleForUser(r));

    // reset to page 1 on fresh load/search
    this.page = 1;

    // ✅ local pagination
    this.applyPagination();

    this.loading = false;
    this.cdr.detectChanges();
  } catch (err) {
    console.error('getStationTable failed', err);
    this.allRows = [];
    this.filteredRows = [];
    this.rows = [];
    this.total = 0;

    this.loading = false;
    this.cdr.detectChanges();
  }
}
onSearchChange() {
  this.page = 1;
  this.load();
}

nextPage() {
  if (this.page >= this.totalPages) return;
  this.page++;
  this.applyPagination();
  this.cdr.detectChanges();
}

prevPage() {
  if (this.page <= 1) return;
  this.page--;
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

        // ensure draft always has latest lat/lng (used by geometry + send)
        this.draft.lat = n.lat;
        this.draft.lng = n.lng;

        if (Number.isFinite(n.lat) && Number.isFinite(n.lng)) {
          // just zoom + show non-draggable highlight by default
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
      stationtype: s?.sttntype ?? s?.stationtype, // backend variations
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

  /** Edit Geometry is ALWAYS enabled */
  startGeometryEdit() {
    if (!this.draft) return;

    const lat = Number(this.draft.lat);
    const lng = Number(this.draft.lng);

    alert('Edit Geometry Mode is ON. You can now move the station point.');

    this.geomEditing = true;

    // show DRAGGABLE marker
    this.mapZoom.zoomTo({
      type: 'latlng',
      lat,
      lng,
      zoom: 17,
      draggable: true,
    });

    // subscribe once to drag-end updates (from EditState)
    this.dragSub?.unsubscribe();
    this.dragSub = this.edit.dragEnd$.subscribe(({ lat: newLat, lng: newLng }) => {
      console.log('DRAG UPDATE =>', newLat, newLng);
      if (!this.draft) return;
      this.draft.lat = newLat;
      this.draft.lng = newLng;
      this.cdr.detectChanges();
    });
  }

  /** Save Geometry locks marker + disables itself */
  saveGeometry() {
    if (!this.geomEditing) return;

    alert('Geometry is fixed and Edit Geometry Mode is OFF.');

    // turn off mode (disables Save button)
    this.geomEditing = false;

    // disable marker dragging in map.ts
    this.edit.lockDrag();

    // replace draggable marker with fixed circle highlight
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

    // reset geometry state
    this.geomEditing = false;
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;

    // zoom back to home/division + clear highlight
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

      // geometry (send multiple aliases)
      lat,
      lng,
      lon: lng,
      longitude: lng,
      latitude: lat,
    };

    this.saving = true;
    console.log('SEND payload lat/lng:', this.draft?.lat, this.draft?.lng, payload);

    this.api.updateStation(this.draft.objectid, payload).subscribe({
      next: () => {
        this.saving = false;

        // reset view
        this.mode = 'table';
        this.draft = null;

        // reset geometry
        this.geomEditing = false;
        this.dragSub?.unsubscribe();
        this.dragSub = undefined;

        // zoom home + clear highlight
        this.mapZoom.zoomHome();
        this.mapZoom.clearHighlight();

        setTimeout(() => this.load(), 0);
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
        if (this.rows.length === 1 && this.page > 1) this.page--;
        this.load();
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
    this.total = 0;

    this.page = 1;
    this.pageSize = 8;

    this.search = '';
    this.loading = false;

    this.draft = null;

    this.saving = false;
    this.deleting = false;
    this.validating = false;

    // geometry reset
    this.geomEditing = false;
    this.dragSub?.unsubscribe();
    this.dragSub = undefined;

    this.error = null;

    // ✅ reset selection + notify Map.ts
    this.edit.setLayer(null);

    // clear map highlight (if any)
    this.mapZoom.clearHighlight();
  }

  close() {
    // zoom out on close
    this.mapZoom.zoomHome();
    this.mapZoom.clearHighlight();

    this.ui.activePanel = null;
    this.resetPanelState();

    // ✅ IMPORTANT: disable edit mode + notify Map.ts to restore hidden layers
    this.edit.disable();
  }
}
