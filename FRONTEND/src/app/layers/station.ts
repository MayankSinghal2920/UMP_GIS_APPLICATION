import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';
import { FilterState } from '../services/filter-state';
import { EditState } from '../services/edit-state';
import { NgZone } from '@angular/core';

export class StationLayer implements MapLayer {

  id = 'stations';
  title = 'Stations';
  visible = true;

  private readonly LABEL_ZOOM = 10;

  legend = {
    type: 'point' as const,
    color: '#d32f2f',
    label: 'Railway Station',
  };

  private layer: L.GeoJSON;
  private lastBbox = '';
  private isOnMap = false;

  // 🔑 Needed for geometry editing
  private markerIndex = new Map<number, L.Marker>();

  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private zone: NgZone
  ) {
    this.layer = L.geoJSON(null, {

      pointToLayer: (feature: any, latlng: L.LatLng) => {

        const marker = L.circleMarker(latlng, {
          radius: 6,
          fillColor: '#d32f2f',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const p = feature?.properties || {};
        const name = (p.sttnname || '').toString().trim();
        const id = p.objectid;

        // index marker for geometry editing
        if (id) {
          this.markerIndex.set(id, marker as any);
        }

        if (name) {
          marker.bindTooltip(name, {
            permanent: false,
            direction: 'top',
            offset: L.point(0, -8),
            opacity: 0.95,
            className: 'station-label',
          });
        }

        return marker;
      },

      onEachFeature: (feature: any, layer: any) => {
        const p: any = feature.properties || {};

        layer.bindPopup(`
          <b>${p.sttnname || 'Station'}</b><br>
          Code: ${p.sttncode || '-'}
        `);

        layer.on('click', () => {
          this.edit.select(feature);
        });
      },
    });
  }

  /** Used by GeometryEditor */
  getMarkerById(id: number): L.Marker | null {
    return this.markerIndex.get(id) || null;
  }

  addTo(map: L.Map) {
    if (this.visible && !this.isOnMap) {
      this.layer.addTo(map);
      this.isOnMap = true;

      map.on('zoomend', () => this.updateLabels(map));
      this.updateLabels(map);
    }
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
    this.isOnMap = false;
  }

  private updateLabels(map: L.Map) {
    const show = map.getZoom() >= this.LABEL_ZOOM;

    this.layer.eachLayer((l: any) => {
      const tooltip = l.getTooltip?.();
      if (!tooltip) return;
      show ? l.openTooltip() : l.closeTooltip();
    });
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    this.addTo(map);

    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;

    if (bbox === this.lastBbox) return;
    this.lastBbox = bbox;

    this.api.getStations(bbox).subscribe({
      next: geojson => {
        this.zone.run(() => {
          this.markerIndex.clear();
          this.layer.clearLayers();
          this.layer.addData(geojson);
          this.updateLabels(map);
        });
      },
      error: err => console.error('Station layer error', err),
    });
  }
}
