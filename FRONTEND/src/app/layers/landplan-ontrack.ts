import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';

export class LandPlanOntrackLayer implements MapLayer {
  id = 'landplan_ontrack';
  title = 'Landplan Ontrack';
  visible = true;

  minZoom = 10;

  legend = {
    type: 'polygon' as const,
    color: '#FFA500',
    label: 'Landplan Ontrack',
  };

  private layer: L.GeoJSON;
  private lastKey = '';
  private paneReady = false;

  private onZoomEndHandler?: () => void;
  private onMoveEndHandler?: () => void;

  constructor(private api: Api, private onData?: (geojson: any) => void) {
    this.layer = L.geoJSON(null, {
      // ✅ make it clearly visible for testing
      style: () => ({
        color: '#FFA500',
        weight: 3,          // thicker border
        opacity: 1,
        fillColor: '#FFA500',
        fillOpacity: 0.15,  // not 0, so you can see polygons
      }),
      interactive: false,
    });
  }

  private canShow(map: L.Map) {
    return this.visible && map.getZoom() >= this.minZoom;
  }

  addTo(map: L.Map) {
    // ✅ Ensure pane exists and is ABOVE tiles
    // tiles = 200; overlays default = 400
    const paneName = 'LandPlanOntrackPane';

    if (!this.paneReady) {
      if (!map.getPane(paneName)) {
        map.createPane(paneName);
      }
      const pane = map.getPane(paneName)!;
      pane.style.zIndex = '450';       // ✅ above tiles and normal overlays
      pane.style.pointerEvents = 'none';

      (this.layer as any).options.pane = paneName;
      this.paneReady = true;
    }

    // ✅ Attach handlers once
    this.onZoomEndHandler = () => {
      // console.log('[LandPlanOntrack] zoomend', map.getZoom());
      this.syncVisibility(map);
    };

    this.onMoveEndHandler = () => {
      // console.log('[LandPlanOntrack] moveend');
      if (this.canShow(map)) this.loadForMap(map);
    };

    map.on('zoomend', this.onZoomEndHandler);
    map.on('moveend', this.onMoveEndHandler);

    // ✅ initial sync
    this.syncVisibility(map);
  }

  private syncVisibility(map: L.Map) {
    const shouldShow = this.canShow(map);

    if (shouldShow) {
      if (!map.hasLayer(this.layer)) {
        this.layer.addTo(map);
        // console.log('[LandPlanOntrack] layer added');
      }
      this.loadForMap(map);
    } else {
      if (map.hasLayer(this.layer)) {
        map.removeLayer(this.layer);
        // console.log('[LandPlanOntrack] layer removed (zoom/visible)');
      }
      this.lastKey = '';
    }
  }

  removeFrom(map: L.Map) {
    if (this.onZoomEndHandler) map.off('zoomend', this.onZoomEndHandler);
    if (this.onMoveEndHandler) map.off('moveend', this.onMoveEndHandler);

    this.onZoomEndHandler = undefined;
    this.onMoveEndHandler = undefined;

    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;
  
    const zActual = map.getZoom();
  
    // ✅ For table fetch, always query at least minZoom
    // (because your backend uses z, and may return empty for small z)
    const zForQuery = Math.max(zActual, this.minZoom);
  
    // ✅ key: use zForQuery + bboxKey to avoid spam
    const b = map.getBounds();
    const bboxKey = `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`;
    const key = `${zForQuery}|${bboxKey}`;
  
    if (key === this.lastKey) return;
    this.lastKey = key;
  
    this.api.getLandPlanOntrack(zForQuery).subscribe({
      next: (geojson: any) => {
        if (!geojson || (geojson.type !== 'FeatureCollection' && geojson.type !== 'Feature')) {
          console.error('[LandPlanOntrack] Invalid GeoJSON returned:', geojson);
          return;
        }
  
        // ✅ normalize to guarantee properties for attribute table
        const fc =
          geojson.type === 'Feature'
            ? { type: 'FeatureCollection', features: [geojson] }
            : geojson;
  
        fc.features = (fc.features ?? []).map((f: any) => ({
          ...f,
          properties: f?.properties ?? f?.attributes ?? {},
        }));
  
        // ✅ ALWAYS push to attribute table (NOT dependent on zoom)
        this.onData?.(fc);
  
        // ✅ Render on map only when actual zoom >= minZoom
        if (zActual < this.minZoom) {
          this.layer.clearLayers();
          return;
        }
  
        this.layer.clearLayers();
        this.layer.addData(fc);
  
        const count = (this.layer as any).getLayers?.().length ?? 0;
        if (count === 0) {
          console.warn('[LandPlanOntrack] 0 features rendered. API returned empty features.');
        }
      },
      error: (err: any) => {
        console.error('[LandPlanOntrack] API error', err);
      },
    });
  }
  
}
