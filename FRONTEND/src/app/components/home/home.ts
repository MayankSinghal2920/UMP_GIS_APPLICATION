import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Map } from '../map/map';
import { Topbar } from '../topbar/topbar';
import { LayerPanel } from '../layer-panel/layer-panel';
import { LegendPanel } from '../legend-panel/legend-panel';
import { BasemapPanel } from '../basemap-panel/basemap-panel';
import { FilterPanel } from '../filter-panel/filter-panel';
import { EditPanel } from '../edit-panel/edit-panel';
import { UiState } from '../../services/ui-state';
import { AttributeTableComponent } from '../attribute-table/attribute-table';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    Topbar, LayerPanel, LegendPanel, BasemapPanel, FilterPanel, EditPanel,
    Map, AttributeTableComponent
  ],
  template: `
    <app-topbar></app-topbar>

    <app-layer-panel *ngIf="ui.isOpen('layers')"></app-layer-panel>
    <app-legend-panel *ngIf="ui.isOpen('legend')"></app-legend-panel>
    <app-basemap-panel *ngIf="ui.isOpen('basemap')"></app-basemap-panel>
    <app-filter-panel *ngIf="ui.isOpen('filter')"></app-filter-panel>
    <app-edit-panel *ngIf="ui.isOpen('edit')"></app-edit-panel>

    <app-map></app-map>
    <app-attribute-table></app-attribute-table>

  `
})
export class HomeComponent {
  constructor(public ui: UiState) {}
}

