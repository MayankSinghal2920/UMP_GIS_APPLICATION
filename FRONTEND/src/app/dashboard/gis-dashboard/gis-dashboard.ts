import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { AttributeTableComponent } from '../../components/attribute-table/attribute-table';
import { BasemapPanel } from '../../components/basemap-panel/basemap-panel';
import { EditPanel } from '../../components/edit-panel/edit-panel';
import { LayerPanel } from '../../components/layer-panel/layer-panel';
import { LegendPanel } from '../../components/legend-panel/legend-panel';
import { MapComponent } from '../../components/map/map';
import { EditState } from '../../services/edit-state';
import { UiState } from '../../services/ui-state';

type WidgetPanel = 'layers' | 'legend' | 'basemap' | 'edit';

@Component({
  selector: 'app-gis-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    LayerPanel,
    LegendPanel,
    BasemapPanel,
    EditPanel,
    AttributeTableComponent,
  ],
  templateUrl: './gis-dashboard.html',
  styleUrl: './gis-dashboard.css',
})
export class GisDashboardComponent {
  constructor(public ui: UiState, private edit: EditState) {}

  toggle(panel: WidgetPanel): void {
    const next = this.ui.activePanel === panel ? null : panel;
    this.ui.activePanel = next;

    if (next === 'edit') {
      this.edit.enable();
    } else {
      this.edit.disable();
    }

    this.ui.notifyLayoutChanged();
    setTimeout(() => this.ui.notifyLayoutChanged(), 260);
  }
}
