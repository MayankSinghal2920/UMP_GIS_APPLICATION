import { GeoJsonObject } from 'geojson';
import * as L from 'leaflet';
import { Api } from '../../api/api';
import { bindAssetDetailsPopup } from '../../components/asset-popup/asset-popup';
import { defineLegend, MapLayer, pathStyleFromLegend } from '../../services/interface';

const TRACK_LEGEND = defineLegend({
  type: 'line' as const,
  color: 'black',
  label: 'Railway Track',
  strokeColor: 'black',
  strokeWidth: 2,
});


export class TrackLayer implements MapLayer {
  id = 'tracks';
  title = 'Railway Tracks';
  visible = true;
  layerGroup = 'common' as const;
  legend = TRACK_LEGEND;

  private layer!: L.GeoJSON;
  private lastBbox = '';
  private cachedBounds?: L.LatLngBounds;
  private requestSeq = 0;
  private isOnMap = false;

  constructor(private api: Api, private onData?: (geojson: any) => void) {
    this.layer = L.geoJSON(null, {
      style: pathStyleFromLegend(this.legend),
      interactive: true,
      onEachFeature: (feature: any, layer: any) => {
        bindAssetDetailsPopup(layer, 'Railway Track Details', feature?.properties || {});
      },
    });
  }

  addTo(map: L.Map) {
    if (this.visible && !this.isOnMap) {
      this.layer.addTo(map);
      this.layer.bringToFront();
      this.isOnMap = true;
    }
  }

  removeFrom(map: L.Map) {
    if (map.hasLayer(this.layer)) map.removeLayer(this.layer);
    this.isOnMap = false;
    this.lastBbox = '';
    this.cachedBounds = undefined;
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    this.addTo(map);

    const b = map.getBounds();
    const cachedBoundsContainsView =
      !!this.cachedBounds &&
      this.cachedBounds.contains(b.getNorthEast()) &&
      this.cachedBounds.contains(b.getSouthWest());

    if (cachedBoundsContainsView && this.layer.getLayers().length > 0) {
      this.layer.bringToFront();
      return;
    }

    const queryBounds = b.pad(0.45);
    const bbox = `${queryBounds.getWest()},${queryBounds.getSouth()},${queryBounds.getEast()},${queryBounds.getNorth()}`;
    const bboxKey = `${queryBounds.getWest().toFixed(2)},${queryBounds.getSouth().toFixed(2)},${queryBounds.getEast().toFixed(2)},${queryBounds.getNorth().toFixed(2)}`;

    if (bboxKey === this.lastBbox) return;
    this.lastBbox = bboxKey;
    const requestId = ++this.requestSeq;

    this.api.getTracks(bbox).subscribe({
      next: (geojson: GeoJsonObject) => {
        if (requestId !== this.requestSeq) return;
        this.cachedBounds = queryBounds;
        this.layer.clearLayers();
        this.layer.addData(geojson);
        this.layer.bringToFront();
        this.onData?.(geojson);
      },
      error: (err: any) => console.error('Track layer error', err),
    });
  }
}

