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
  // private renderer = L.canvas({ padding: 0.5 });
  private lastBbox = '';
  private loadedBounds?: L.LatLngBounds;
  private requestSeq = 0;


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
    if (this.visible) {
      this.layer.addTo(map);
      this.layer.bringToFront();
    }
  }

  removeFrom(map: L.Map) {
    map.removeLayer(this.layer);
  }

  private getBufferedBounds(map: L.Map): L.LatLngBounds {
    return map.getBounds().pad(0.5);
  }

  loadForMap(map: L.Map) {
    if (!this.visible) return;

    this.addTo(map);

    const currentBounds = map.getBounds();

    if (this.loadedBounds && this.loadedBounds.contains(currentBounds)) {
      return;
    }

    const b = this.getBufferedBounds(map);
    const bbox = `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const bboxKey = `${b.getWest().toFixed(2)},${b.getSouth().toFixed(2)},${b.getEast().toFixed(2)},${b.getNorth().toFixed(2)}`;

    if (bboxKey === this.lastBbox) return;
    this.lastBbox = bboxKey;
    const requestId = ++this.requestSeq;

    this.api.getTracks(bbox, map.getZoom()).subscribe({
      next: (geojson: GeoJsonObject) => {
        if (requestId !== this.requestSeq) return;
        this.loadedBounds = b;
        this.layer.clearLayers();
        this.layer.addData(geojson);
        this.layer.bringToFront();
        this.onData?.(geojson);
      },
      error: (err: any) => console.error('Track layer error', err),
    });
  }


}

