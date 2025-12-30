import { GeoJsonObject } from 'geojson';
import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class LandBoundaryLayer implements MapLayer {
  id = 'landboundary';
  title = 'Land Boundary';
  visible = true; // your toggle

  // ✅ show only at zoom >= 10
  minZoom = 10;

  legend = {
    type: 'line' as const,
    color: 'orange',
    label: 'Land Boundary',
  };

  private layer!: L.GeoJSON;
  private lastBbox = '';

  constructor(private api: Api, private onData?: (geojson: any) => void) {
    this.layer = L.geoJSON(null, {
      style: {
        color: 'orange',
        weight: 3,
      },
    });
  }

  private canShow(map: L.Map) {
    return this.visible && map.getZoom() >= this.minZoom;
  }

  addTo(map: L.Map) {
    // Add a zoom listener so it auto hides/shows when zoom changes
    map.on('zoomend', () => {
      if (this.canShow(map)) {
        if (!map.hasLayer(this.layer)) this.layer.addTo(map);
        this.loadForMap(map); // refresh data when it becomes visible
      } else {
        if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
      }
    });

    // initial add
    if (this.canShow(map)) {
      this.layer.addTo(map);
    }
  }

  removeFrom(map: L.Map) {
    map.off('zoomend'); // if you have many layers, better to store handler reference
    map.removeLayer(this.layer);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;
  
    const z = map.getZoom();
    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
  
    // ✅ avoid spam calls (still based on bbox)
    if (bbox === this.lastBbox) {
      // keep render state in sync even if no refetch
      if (z < this.minZoom) {
        this.layer.clearLayers(); // hide on map
      } else {
        this.addTo(map);
      }
      return;
    }
    this.lastBbox = bbox;
  
    this.api.getlandboundary(bbox).subscribe({
      next: (geojson: any) => {
        // ✅ ALWAYS push to attribute table (independent of zoom)
        this.onData?.(geojson);
  
        // ✅ Render on map only if zoom >= minZoom
        if (z < this.minZoom) {
          this.layer.clearLayers();
          return;
        }
  
        this.addTo(map);
        this.layer.clearLayers();
        this.layer.addData(geojson);
      },
      error: (err: any) => console.error('Land Boundary layer error', err),
    });
  }
  
}
