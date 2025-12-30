import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';
import { FilterState } from '../services/filter-state';
import { EditState } from '../services/edit-state';

export class StationLayer implements MapLayer {
  id = 'stations';
  title = 'Stations';
  visible = true;

  // 🔑 Label zoom threshold
  private readonly LABEL_ZOOM = 12;

  legend = {
    type: 'point' as const,
    color: '#d32f2f',
    label: 'Railway Station',
  };

  private layer!: L.GeoJSON;
  private lastBbox = '';
  private isOnMap = false;

  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private onData?: (geojson: any) => void
  ) {
    this.layer = L.geoJSON(null, {
      pointToLayer: (feature: any, latlng: L.LatLng) => {
        const marker = L.circleMarker(latlng, {
          radius: 8,
          fillColor: '#d32f2f',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9,
        });

        const p = feature?.properties || {};
        const name = (p.sttnname || '').toString().trim();

        if (name) {
          // ❌ NOT permanent
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

        layer.on('click', () => this.edit.select(feature));
      },
    });
  }

  addTo(map: L.Map) {
    if (this.visible && !this.isOnMap) {
      this.layer.addTo(map);
      this.isOnMap = true;

      // 🔥 attach zoom handler once
      map.on('zoomend', () => this.updateLabels(map));
      this.updateLabels(map);
    }
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
    this.isOnMap = false;
  }

  private updateLabels(map: L.Map) {
    const showLabels = map.getZoom() >= this.LABEL_ZOOM;

    this.layer.eachLayer((l: any) => {
      if (!l.getTooltip) return;

      const tooltip = l.getTooltip();
      if (!tooltip) return;

      if (showLabels) {
        l.openTooltip();
      } else {
        l.closeTooltip();
      }
    });
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    this.addTo(map);

    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

    if (bbox === this.lastBbox) return;
    this.lastBbox = bbox;

    this.api.getStations(bbox).subscribe({
      next: (geojson: any) => {
        this.layer.clearLayers();
        this.layer.addData(geojson);
        this.onData?.(geojson);

        // update labels after reload
        this.updateLabels(map);
      },
      error: (err: any) => console.error('Station layer error', err),
    });
  }
}

