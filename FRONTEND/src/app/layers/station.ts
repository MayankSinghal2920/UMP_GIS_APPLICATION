import * as L from 'leaflet';
import { Api } from '../services/api';
import { MapLayer } from './interface';
import { FilterState } from '../services/filter-state';
import { NgZone } from '@angular/core';

export class StationLayer implements MapLayer {
    id = 'stations';
    title = 'Stations';
    visible = true;

    legend = {
    type: 'point' as const,
    color: '#d32f2f',
    label: 'Railway Station'
};

    private layer!: L.GeoJSON;
    private lastBbox = '';

    constructor(
      private api: Api,
      private filters: FilterState,
       private zone: NgZone
    ) {
        this.layer = L.geoJSON(null,{
             pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 5,
          fillColor: '#d32f2f',
          color: '#ffffff',
          weight: 1,
          opacity: 1,
          fillOpacity: 0.9
        });
    },
     onEachFeature: (feature, layer) => {
  const p: any = feature.properties || {};

  layer.bindPopup(`
    <b>${p.sttnname || 'Station'}</b><br>
    Code: ${p.sttncode || '-'}
  `);

 
}
    });
  }

    addTo(map: L.Map) {
    this.layer.addTo(map);
  }

  removeFrom(map: L.Map) {
    map.removeLayer(this.layer);
  }

  loadForMap(map: L.Map) {
    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

    if (bbox === this.lastBbox) return;
    this.lastBbox = bbox;

    this.api.getStations(bbox, this.filters.stationCode, this.filters.division).subscribe({
      next: (geojson: GeoJSON.GeoJsonObject) => {
        this.layer.clearLayers();
        this.layer.addData(geojson as any);
      },
      error: (err: any) => console.error('Station layer error', err)
    });
  }
}
