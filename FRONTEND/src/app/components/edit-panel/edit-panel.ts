import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditState } from '../../services/edit-state';
import { Api } from 'src/app/services/api';
import { UiState } from '../../services/ui-state';



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
  error: string | null = null;

  deleting = false;





  constructor(
    public ui: UiState,
    public edit: EditState,
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}

  get totalPages(): number {
  return Math.max(1, Math.ceil(this.total / this.pageSize));
}

 onLayerChange() {
    // Reset table state when layer changes
    this.mode = 'table';
    this.rows = [];
    this.total = 0;
    this.page = 1;
    this.search = '';

    if (this.edit.editLayer === 'stations') {
      setTimeout(() => this.load(), 0);
    }
  }

  onPanelOpen() {
  this.mode = 'table';
  this.rows = [];
  this.total = 0;
  this.page = 1;
  this.search = '';
}

ngDoCheck() {
  if (this.edit.enabled && this.edit.editLayer === null) {
    this.mode = 'table';
    this.rows = [];
  }
}




 load() {
  this.loading = true;

  this.api
    .getStationTable(this.page, this.pageSize, this.search)
    .subscribe({
      next: res => {
        this.rows = res.rows || [];
        this.total = res.total || 0;
        this.loading = false;

        // 🔥 FORCE VIEW UPDATE
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
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

  onSearchChange() {
    this.page = 1;
    this.load();
  }

  editRow(row: any) {
  this.mode = 'edit';
  this.draft = { ...row }; // copy row into form
}

cancelEdit() {
  this.mode = 'table';
  this.draft = null;
}

send() {
  if (!this.draft || !this.draft.objectid) {
    this.error = 'Station id missing';
    return;
  }

  const id = this.draft.objectid;

  // build payload (only editable fields)
  const payload = {
    stationtype: this.draft.stationtype,
    distkm: this.draft.distkm,
    distm: this.draft.distm,
    state: this.draft.state,
    district: this.draft.district,
    constituency: this.draft.constituency
  };

  this.saving = true;
  this.error = null;

  this.api.updateStation(id, payload).subscribe({
    next: () => {
      this.saving = false;

      // go back to table
      this.mode = 'table';
      this.draft = null;

      // reload current page
       setTimeout(() => {
    this.load();
  }, 0);
},
    error: () => {
      this.saving = false;
      this.error = 'Failed to save changes';
    }
  });
}

deleteRow(row: any) {
  const ok = confirm(
    `Are you sure you want to delete station "${row.sttncode}"?`
  );

  if (!ok) return;

  if (!row.objectid) {
    alert('Station id not found');
    return;
  }

  this.deleting = true;

  this.api.deleteStation(row.objectid).subscribe({
    next: () => {
      this.deleting = false;

      // If current page becomes empty, go back one page
      if (this.rows.length === 1 && this.page > 1) {
        this.page--;
      }

      // Reload table
      this.load();
    },
    error: () => {
      this.deleting = false;
      alert('Failed to delete station');
    }
  });
}

 close() {
      this.ui.activePanel = null;
    }



}
