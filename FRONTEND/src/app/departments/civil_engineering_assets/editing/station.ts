import * as L from 'leaflet';
import { NgZone } from '@angular/core';
import { Api } from '../../../api/api';
import { FilterState } from '../../../services/filter-state';
import { EditState } from '../../../services/edit-state';
import { StationViewingLayer } from '../viewing/civil-engineering-assets-viewing';

export class StationLayer extends StationViewingLayer {
  private markerIndex = new Map<number, L.Marker>();

  constructor(
    api: Api,
    _filters: FilterState,
    private edit: EditState,
    zone: NgZone,
    onData?: (geojson: any) => void
  ) {
    super(api, zone, onData);
  }

  protected override onMarkerCreated(feature: any, marker: L.Marker) {
    const id = feature?.properties?.objectid;
    if (id) this.markerIndex.set(id, marker);
  }

  protected override onFeatureReady(feature: any, layer: any) {
    layer.on('click', () => {
      if (!this.edit.enabled || this.edit.editLayer !== 'stations') return;
      this.edit.select(feature);
    });
  }

  protected override beforeRender(_geojson: any) {
    this.markerIndex.clear();
  }

  /** Used by GeometryEditor */
  getMarkerById(id: number): L.Marker | null {
    return this.markerIndex.get(id) || null;
  }
}
