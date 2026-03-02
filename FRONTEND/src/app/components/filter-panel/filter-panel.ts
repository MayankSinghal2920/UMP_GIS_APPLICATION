import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UiState } from '../../services/ui-state';
import { FilterState } from '../../services/filter-state';
import { MapRegistry } from '../../services/map-registry';
import { LayerManager } from '../../services/layer-manager';


@Component({
  selector: 'app-filter-panel',
  imports: [FormsModule, CommonModule],
  templateUrl: './filter-panel.html',
  styleUrl: './filter-panel.css',
})
export class FilterPanel {

   constructor(
    public ui: UiState,
    public filters: FilterState,
    private mapRegistry: MapRegistry,
    private layerManager: LayerManager
  ) {}
  close() {
    this.ui.activePanel = null;
  }

   apply() {
    if (!this.mapRegistry.hasMap()) return;
    const map = this.mapRegistry.getMap();
    this.layerManager.reloadVisible(map);
  }

  clear() {
    this.filters.reset();
    this.apply();
  }
}
