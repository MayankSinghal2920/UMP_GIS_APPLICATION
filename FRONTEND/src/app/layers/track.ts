import { GeoJsonObject } from 'geojson';
import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class TrackLayer implements MapLayer {

  id = 'tracks';
  title = 'Railway Tracks';
  visible = true; // OFF by default

  legend = {
  type: 'line' as const,
  color: 'black',
  label: 'Railway Track'
};
    
  private layer!: L.GeoJSON;
  private lastBbox = '';

  constructor(private api: Api, private onData?: (geojson: any) => void) {
    this.layer = L.geoJSON(null, {
      style: {
        color: 'black',
        weight: 2
      }
    });
  }

  addTo(map: L.Map) {
    if (this.visible) {
      this.layer.addTo(map);
    }
  }

  removeFrom(map: L.Map) {
    map.removeLayer(this.layer);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    const b = map.getBounds();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;

    if (bbox === this.lastBbox) return;
    this.lastBbox = bbox;

    this.api.getTracks(bbox).subscribe({
      next: (geojson: GeoJsonObject) => {
        this.layer.clearLayers();
        this.layer.addData(geojson);
        this.onData?.(geojson); 
      },
      error: (err: any) => console.error('Track layer error', err)
    });
  }
}