import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { LayerManager } from '../../services/layer-manager';
import { UiState } from '../../services/ui-state';


@Component({
  selector: 'app-legend-panel',
  imports: [CommonModule],
  templateUrl: './legend-panel.html',
  styleUrl: './legend-panel.css',
})
export class LegendPanel {
    constructor(
    public layerManager: LayerManager,
    public ui: UiState
  ) {}

  close() {
    this.ui.activePanel = null;
  }

}
