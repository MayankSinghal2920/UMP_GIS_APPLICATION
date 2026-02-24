import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { Map } from '../map/map';
import { UiState } from '../../services/ui-state';
import { EditState } from '../../services/edit-state';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, Map],
  template: `<app-map></app-map>`,
})
export class HomeComponent implements OnInit, OnDestroy {
  private qpSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    public ui: UiState,
    private edit: EditState
  ) {}

  ngOnInit(): void {
    // ✅ Deep-linking entry point because Map is inside Home
    // Example: /home?panel=edit&layer=stations
    this.qpSub = this.route.queryParams.subscribe((p) => {
      const panel = String(p['panel'] || '').trim().toLowerCase();
      const layerParam = String(p['layer'] || '').trim().toLowerCase();

      if (panel !== 'edit') return;

      // 1) open edit panel + enable edit state
      this.ui.activePanel = 'edit';
      this.edit.enable();

      // 2) select layer (must match EditPanel dropdown values)
      // EditPanel values: 'stations', 'landplan' (as per your edit-panel.html)
      if (layerParam === 'stations' || layerParam === 'landplan') {
        // set editLayer so dropdown reflects selection
        (this.edit as any).editLayer = layerParam;

        // call setLayer if available (some versions expose it)
        try {
          (this.edit as any).setLayer?.(layerParam);
        } catch {}
      }

      // NOTE:
      // EditPanel should listen to edit.stateChanged$ and call load()
      // when edit.enabled && edit.editLayer === 'stations'
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
    this.qpSub = undefined;
  }
}