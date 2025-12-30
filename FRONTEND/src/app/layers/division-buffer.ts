import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class DivisionBufferLayer implements MapLayer {
  id = 'division_buffer';
  title = 'Division Buffer';
  visible = true; // ON by default

  legend = {
    type: 'polygon' as const,
    color: 'black',
    label: 'Division Buffer',
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

    // keep it below markers/labels but above basemap
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

    // ensure layer is on map
    this.addTo(map);

    const z = map.getZoom();
    const key = `z=${z}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.api.getDivisionBuffer(z).subscribe({
      next: (res: any) => {
        const geojson = res?.geojson || { type: 'FeatureCollection', features: [] };

        this.layer.clearLayers();
        this.layer.addData(geojson);

        // ✅ Fit once to division extent (optional, but useful)
        // Backend returns extent as BOX(minx miny,maxx maxy)
        if (!this.fittedOnce && res?.extent) {
          const b = this.parsePgBoxExtent(res.extent);
          if (b) {
            map.fitBounds(b, { padding: [20, 20] });
            this.fittedOnce = true;
          }
        }
      },
      error: (err: any) => console.error('Division buffer error', err),
    });
  }

  // extent format from PostGIS ST_Extent: "BOX(minx miny,maxx maxy)"
  private parsePgBoxExtent(extent: string): L.LatLngBounds | null {
    try {
      const s = String(extent).trim();
      const m = s.match(/BOX\(([-\d.]+)\s+([-\d.]+),([-\d.]+)\s+([-\d.]+)\)/i);
      if (!m) return null;

      const minx = Number(m[1]);
      const miny = Number(m[2]);
      const maxx = Number(m[3]);
      const maxy = Number(m[4]);
      if ([minx, miny, maxx, maxy].some(Number.isNaN)) return null;

      // Leaflet bounds expects [lat,lng]
      return L.latLngBounds([miny, minx], [maxy, maxx]);
    } catch {
      return null;
    }
  }
}
