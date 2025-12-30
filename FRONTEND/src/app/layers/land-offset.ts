import * as L from 'leaflet';
import 'leaflet-polylinedecorator';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class LandOffsetLayer implements MapLayer {
  id = 'land_offset';
  title = 'Land Offset';
  visible = true;

  minZoom = 11;

  legend = {
    type: 'line' as const,
    color: '#000000',
    label: 'Land Offset',
  };

  private layer: L.GeoJSON;
  private decorators: L.LayerGroup;
  private lastKey = '';

  constructor(private api: Api, private onData?: (geojson: any) => void) {
    this.decorators = L.layerGroup();

    this.layer = L.geoJSON(null, {
      style: () => ({
        color: '#000000',
        weight: 2,
        opacity: 1,
      }),
      interactive: false,
    });
  }

  private canShow(map: L.Map): boolean {
    return this.visible && map.getZoom() >= this.minZoom;
  }

  // ✅ IMPORTANT: always add layers once (even if empty)
  addTo(map: L.Map) {
    this.layer.addTo(map);
    this.decorators.addTo(map);
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
    if (map.hasLayer(this.decorators)) map.removeLayer(this.decorators);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;
  
    const b = map.getBounds();
    const z = map.getZoom();
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
  
    // ✅ fetch key should NOT depend on minZoom
    const key = `${bbox}`; // you can also include division if needed
    if (key === this.lastKey) return;
    this.lastKey = key;
  
    this.api.getLandOffset(bbox).subscribe({
      next: (geojson: any) => {
        if (!geojson) return;
  
        // ✅ normalize for table (properties/attributes)
        const fc =
          geojson.type === 'Feature'
            ? { type: 'FeatureCollection', features: [geojson] }
            : geojson;
  
        fc.features = (fc.features ?? []).map((f: any) => ({
          ...f,
          properties: f?.properties ?? f?.attributes ?? {},
        }));
  
        // ✅ ALWAYS push to attribute table (NO zoom dependency)
        this.onData?.(fc);
  
        // ✅ Render on map only if zoom condition satisfied
        if (z < this.minZoom) {
          this.layer.clearLayers();
          this.decorators.clearLayers();
          return;
        }
  
        this.layer.clearLayers();
        this.decorators.clearLayers();
        this.layer.addData(fc);
  
        // arrows
        this.layer.eachLayer((lyr: any) => {
          if (!(lyr instanceof L.Polyline) || lyr instanceof L.Polygon) return;
  
          const decorator = (L as any).polylineDecorator(lyr, {
            patterns: [
              {
                offset: '0%',
                repeat: 0,
                symbol: (L as any).Symbol.arrowHead({
                  pixelSize: 10,
                  polygon: true,
                  pathOptions: { color: '#000000', fillColor: '#000000', opacity: 1 },
                }),
              },
              {
                offset: '100%',
                repeat: 0,
                symbol: (L as any).Symbol.arrowHead({
                  pixelSize: 10,
                  polygon: true,
                  pathOptions: { color: '#000000', fillColor: '#000000', opacity: 1 },
                }),
              },
            ],
          });
  
          this.decorators.addLayer(decorator);
        });
      },
      error: (err: any) => console.error('Land Offset error', err),
    });
  }
  
}




