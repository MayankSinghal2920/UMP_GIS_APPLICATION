import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UiState } from '../../services/ui-state';
import { MapRegistry } from '../../services/map-registry';
import * as L from 'leaflet';

type BasemapType = 'Open Street Map' | 'satellite' | 'Esri Topographic';

@Component({
  selector: 'app-basemap-panel',
  imports: [CommonModule],
  templateUrl: './basemap-panel.html',
  styleUrl: './basemap-panel.css',
})
export class BasemapPanel {
  selectedBasemap: BasemapType = 'Esri Topographic'; // only for UI

  constructor(public ui: UiState, private mapRegistry: MapRegistry) {}

  close() {
    this.ui.activePanel = null;
  }

  onBasemapChange(type: BasemapType) {
    this.selectedBasemap = type;
    this.setBasemap(type);
  }

  setBasemap(type: BasemapType) {
    if (!this.mapRegistry.hasMap()) return;

    const map = this.mapRegistry.getMap();

    map.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    if (type === 'Open Street Map') {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 17,
        maxZoom: 22,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      return;
    }

    if (type === 'satellite') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 22, attribution: 'Tiles © Esri' }
      ).addTo(map);
      return;
    }

    if (type === 'Esri Topographic') {
      L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        { maxNativeZoom: 17, maxZoom: 22, attribution: 'Tiles © Esri' }
      ).addTo(map);
      return;
    }
  }
}
