import * as L from 'leaflet';
import { Api } from '../../api/api';
import { MapLayer } from '../../services/interface';

export class KmPostLayer implements MapLayer {
  id = 'km_posts';
  title = 'KM Posts';
  visible = true;
  layerGroup = 'common' as const;

  private readonly MIN_ZOOM = 10;

  legend = {
    type: 'point' as const,
    color: '#2563eb',
    label: 'KM Post',
    fillColor: '#2563eb',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWidth: 1,
    radius: 7,
  };

  private layer: L.GeoJSON;
  private lastBbox = '';
  private isLoading = false;
  private isOnMap = false;

  constructor(private api: Api, private onData?: (geojson: any) => void) {
    this.layer = L.geoJSON(null, {
      pointToLayer: (_feature: any, latlng: L.LatLng) =>
        L.circleMarker(latlng, {
          radius: 7,
          fillColor: '#2563eb',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 1.5,
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

    const z = map.getZoom();
    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;

    if (bbox === this.lastBbox || this.isLoading) {
      if (z < this.MIN_ZOOM) {
        this.layer.clearLayers();
      } else {
        this.addTo(map);
      }
      return;
    }

    this.lastBbox = bbox;
    this.isLoading = true;

    this.api.getkmposts(bbox).subscribe({
      next: (geojson: any) => {
        this.onData?.(geojson);

        if (z < this.MIN_ZOOM) {
          this.layer.clearLayers();
          this.isLoading = false;
          return;
        }

        this.addTo(map);
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
