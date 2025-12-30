import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class KmPostLayer implements MapLayer {
  id = 'km_posts';
  title = 'KM Posts';
  visible = true;

  // ✅ KM posts visible only at zoom >= 10
  private readonly MIN_ZOOM = 10;

  legend = {
    type: 'point' as const,
    color: '#2563eb',
    label: 'KM Post',
  };

  private layer: L.GeoJSON;
  private lastBbox = '';
  private isLoading = false;
  private isOnMap = false; // ✅ missing earlier

  constructor(private api: Api) {
    this.layer = L.geoJSON(null, {
      pointToLayer: (_feature: any, latlng: L.LatLng) =>
        L.circleMarker(latlng, {
          radius: 4,
          fillColor: '#2563eb',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.95,
        }),

      onEachFeature: (feature: any, layer: any) => {
        const p = feature?.properties || {};
        layer.bindPopup(`
          <b>KM Post</b><br>
          KM: ${p.kmpostno ?? '-'}<br>
          Line: ${p.line ?? '-'}<br>
          Railway: ${p.railway ?? '-'}
        `);
      },
    });
  }

  addTo(map: L.Map) {
    if (!this.visible) return;

    if (map.getZoom() >= this.MIN_ZOOM) {
      if (!this.isOnMap) {
        this.layer.addTo(map);
        this.isOnMap = true;
      }
    } else {
      this.removeFrom(map);
    }
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
    this.isOnMap = false;
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    // 🚫 Do nothing below zoom 10
    if (map.getZoom() < this.MIN_ZOOM) {
      this.removeFrom(map);
      return;
    }

    // ensure layer is on map
    this.addTo(map);

    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;

    if (bbox === this.lastBbox || this.isLoading) return;
    this.lastBbox = bbox;
    this.isLoading = true;

    this.api.getkmposts(bbox).subscribe({
      next: (geojson: any) => {
        this.layer.clearLayers();
        this.layer.addData(geojson);
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('KM post layer error', err);
        this.isLoading = false;
      },
    });
  }
}


