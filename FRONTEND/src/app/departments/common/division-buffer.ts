import * as L from 'leaflet';
import { Api } from '../../api/api';
import { MapLayer } from '../../services/interface';

export class DivisionBufferLayer implements MapLayer {
  id = 'division_buffer';
  title = 'Division Buffer';
  visible = true;
  layerGroup = 'common' as const;

  legend = {
    type: 'polygon' as const,
    color: 'black',
    label: 'Division Buffer',
    fillColor: '#93c5fd',
    fillOpacity: 0.1,
    strokeColor: 'black',
    strokeWidth: 2,
  };

  private layer: L.GeoJSON;
  private lastKey = '';
  private fittedOnce = false;

  constructor(private api: Api) {
    this.layer = L.geoJSON(null, {
      style: () => ({
        color: 'black',
        weight: 2,
        fillColor: '#93c5fd',
        fillOpacity: 0.1,
      }),
      interactive: false,
    });
  }

  addTo(map: L.Map) {
    if (!this.visible) return;

    const paneName = 'divisionBufferPane';
    if (!map.getPane(paneName)) {
      map.createPane(paneName);
      map.getPane(paneName)!.style.zIndex = '210';
      map.getPane(paneName)!.style.pointerEvents = 'none';
    }

    (this.layer as any).options.pane = paneName;
    if (!map.hasLayer(this.layer)) this.layer.addTo(map);
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    this.addTo(map);

    const z = map.getZoom();
    const key = this.api.getDivisionBufferKey(z);
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.api.getDivisionBuffer().subscribe({
      next: (res: any) => {
        const geojson = res || { type: 'FeatureCollection', features: [] };

        this.layer.clearLayers();
        this.layer.addData(geojson);

        if (!this.fittedOnce) {
          const b = (this.layer as any).getBounds?.();
          if (b?.isValid?.()) {
            map.fitBounds(b, { padding: [20, 20] });
            this.fittedOnce = true;
          }
        }
      },
      error: (err: any) => console.error('Division buffer error', err),
    });
  }
}
