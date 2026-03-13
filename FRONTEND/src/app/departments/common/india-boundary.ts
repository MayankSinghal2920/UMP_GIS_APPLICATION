import * as L from 'leaflet';
import { Api } from '../../api/api';
import { MapLayer } from '../../services/interface';

export class IndiaBoundaryLayer implements MapLayer {
  id = 'india_boundary';
  title = 'India Boundary';
  visible = true;
  layerGroup = 'common' as const;

  legend = {
    type: 'polygon' as const,
    color: '#111827',
    label: 'India Boundary',
    fillColor: 'transparent',
    fillOpacity: 0,
    strokeColor: '#111827',
    strokeWidth: 2,
  };

  private layer: L.GeoJSON;
  private lastKey = '';
  private paneReady = false;

  constructor(private api: Api) {
    this.layer = L.geoJSON(null, {
      style: () => ({
        color: '#111827',
        weight: 2,
        fillColor: '#000000',
        fillOpacity: 0,
      }),
      interactive: false,
    });
  }

  addTo(map: L.Map) {
    if (!this.visible) return;

    const paneName = 'indiaBoundaryPane';
    if (!this.paneReady) {
      if (!map.getPane(paneName)) {
        map.createPane(paneName);
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

    const key = `${bbox}|${z}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.api.getIndiaBoundary(bbox).subscribe({
      next: (geojson: any) => {
        this.layer.clearLayers();
        this.layer.addData(geojson);
      },
      error: (err: any) => console.error('India boundary error', err),
    });
  }
}
