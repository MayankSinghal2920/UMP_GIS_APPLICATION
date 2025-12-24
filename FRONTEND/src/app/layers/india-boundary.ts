import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class IndiaBoundaryLayer implements MapLayer {
  id = 'india_boundary';
  title = 'India Boundary';
  visible = true; // ON by default

  legend = {
    type: 'polygon' as const,
    color: '#111827',
    label: 'India Boundary',
  };

  private layer: L.GeoJSON;
  private lastKey = '';
  private paneReady = false;

  constructor(private api: Api) {
    this.layer = L.geoJSON(null, {
      style: () => ({
        color: '#111827',      // border
        weight: 2,
        fillColor: '#000000',  // fill
        fillOpacity: 0,
      }),
      interactive: false,
    });
  }

  addTo(map: L.Map) {
    if (!this.visible) return;

    // ✅ Ensure boundary always stays behind markers/overlays
    const paneName = 'indiaBoundaryPane';

    if (!this.paneReady) {
      if (!map.getPane(paneName)) {
        map.createPane(paneName);
        // Leaflet defaults:
        // tilePane = 200, overlayPane = 400, markerPane = 600
        // So keep boundary under overlays/markers but above tiles.
        map.getPane(paneName)!.style.zIndex = '300';
      }
      (this.layer as any).options.pane = paneName;
      this.paneReady = true;
    }

    this.layer.addTo(map);
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const z = map.getZoom();

    // prevent repeated calls
    const key = `${bbox}|${z}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.api.getIndiaBoundary(bbox, z).subscribe({
      next: (geojson: any) => {
        this.layer.clearLayers();
        this.layer.addData(geojson);
      },
      error: (err: any) => console.error('India boundary error', err),
    });
  }
}

