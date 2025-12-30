import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import * as L from 'leaflet';

import { Api } from '../../services/api';
import { StationLayer } from '../../layers/station';
import { TrackLayer } from '../../layers/track';
import { KmPostLayer } from '../../layers/km-post';
import { IndiaBoundaryLayer } from '../../layers/india-boundary';
import { LandBoundaryLayer } from '../../layers/land-boundary';
import { LandPlanOntrackLayer } from 'src/app/layers/landplan-ontrack';
import { LandOffsetLayer } from 'src/app/layers/land-offset';
import { DivisionBufferLayer } from '../../layers/division-buffer';

import { LayerManager } from '../../layers/layer-manager';
import { MapRegistry } from '../../services/map-registry';
import { FilterState } from '../../services/filter-state';
import { EditState } from '../../services/edit-state';
// import { AttributeTableComponent } from '../attribute-table/attribute-table'; // adjust path
import { AttributeTableService } from '../../services/attribute-table';
import { Subscription } from 'rxjs';

function toRows(geojson: any): Record<string, any>[] {
  const features = geojson?.features ?? [];
  return features.map((f: any) =>
    f?.properties ?? f?.attributes ?? {}
  );
}

@Component({
  selector: 'app-map',
  templateUrl: './map.html',
  styleUrl: './map.css',
  // imports: [AttributeTableComponent],
})




export class Map implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private zoomSub?: Subscription;
private highlightLayer?: L.GeoJSON; // optional highlight

  private onMoveOrZoom?: () => void;

  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private mapRegistry: MapRegistry,
    private layerManager: LayerManager,
    private zone: NgZone,
    private attrTable: AttributeTableService,

  ) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      // wait 1 paint frame so #map exists + has size
      requestAnimationFrame(() => this.initializeMapSafely());
    });
  }


  

  private initializeMapSafely() {
    const el = document.getElementById('map');
    if (!el) {
      requestAnimationFrame(() => this.initializeMapSafely());
      return;
    }

    // ✅ prevent double-init if component recreated quickly
    if (this.map) return;

    // ✅ if Leaflet left a stale instance on this container (rare but happens)
    const anyEl = el as any;
    if (anyEl._leaflet_id) {
      try { anyEl._leaflet_id = undefined; } catch {}
    }

    this.map = L.map(el, {
      preferCanvas: true, // ✅ helps avoid some renderer timing issues
    }).setView([22.5, 79], 5);

    this.mapRegistry.setMap(this.map);

    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { maxNativeZoom: 17, maxZoom: 22, attribution: 'Tiles © Esri' }
    ).addTo(this.map);

    // ✅ register layers ONCE (singleton service)
    this.layerManager.registerOnce(new IndiaBoundaryLayer(this.api));
    this.layerManager.registerOnce(new DivisionBufferLayer(this.api));
    this.layerManager.registerOnce(
      new StationLayer(this.api, this.filters, this.edit, (geojson: any) => {
        this.attrTable.pushFeatureCollection('Station', geojson);
      })
    );
    
    this.layerManager.registerOnce(
      new LandOffsetLayer(this.api, (geojson: any) => {
        this.attrTable.pushFeatureCollection('Land Offset', geojson);
      })
    );
    
    this.layerManager.registerOnce(
      new LandBoundaryLayer(this.api, (geojson: any) => {
        this.attrTable.pushFeatureCollection('Land Boundary', geojson);
      })
    );
    
    this.layerManager.registerOnce(
      new LandPlanOntrackLayer(this.api, (geojson: any) => {
        this.attrTable.pushFeatureCollection('Land Plan Ontrack', geojson);
      })
    );
    
    this.layerManager.registerOnce(
      new TrackLayer(this.api, (geojson: any) => {
        this.attrTable.pushFeatureCollection('Railway Track', geojson);
      })
    );
    
    this.layerManager.registerOnce(
      new KmPostLayer(this.api, (geojson: any) => {
        this.attrTable.pushFeatureCollection('Km Post', geojson);
      })
    );
    

    // ✅ only add/load once map is truly ready
    this.map.whenReady(() => {
      this.map!.invalidateSize();
    
      this.layerManager.addAll(this.map!);
      this.layerManager.reloadAll(this.map!);
    
      requestAnimationFrame(() => this.map?.invalidateSize());
      setTimeout(() => this.map?.invalidateSize(), 50);
    
      this.onMoveOrZoom = () => {
        if (!this.map) return;
        this.layerManager.reloadAll(this.map);
      };
    
      this.map!.on('moveend', this.onMoveOrZoom);
      this.map!.on('zoomend', this.onMoveOrZoom);
    
      // ✅ add this subscription block here
      this.zoomSub = this.attrTable.zoomTo$.subscribe(({ feature }) => {
        if (!this.map) return;
        try {
          if (this.highlightLayer && this.map.hasLayer(this.highlightLayer)) {
            this.map.removeLayer(this.highlightLayer);
          }
    
          const gj = L.geoJSON(feature);
          const bounds = gj.getBounds();
    
          if (bounds && bounds.isValid && bounds.isValid()) {
            this.map.fitBounds(bounds.pad(0.2), { animate: true });
          } else {
            const coords = feature?.geometry?.coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
              this.map.setView([coords[1], coords[0]], Math.max(this.map.getZoom(), 16), { animate: true });
            }
          }
    
          this.highlightLayer = L.geoJSON(feature, {
            style: () => ({ weight: 4 }),
            pointToLayer: (_f, latlng) => L.circleMarker(latlng, { radius: 8 }),
          }).addTo(this.map);
    
          setTimeout(() => {
            if (this.map && this.highlightLayer && this.map.hasLayer(this.highlightLayer)) {
              this.map.removeLayer(this.highlightLayer);
            }
          }, 2000);
        } catch (e) {
          console.error('Zoom-to feature failed:', e);
        }
      });
    });
    
  }

  ngOnDestroy(): void {
    if (!this.map) return;
    this.zoomSub?.unsubscribe();
this.zoomSub = undefined;


    try {
      // ✅ remove events
      if (this.onMoveOrZoom) {
        this.map.off('moveend', this.onMoveOrZoom);
        this.map.off('zoomend', this.onMoveOrZoom);
      } else {
        this.map.off();
      }

      // ✅ remove all layers cleanly (important with singleton layerManager)
      this.layerManager.removeAll(this.map);

      // ✅ remove leaflet map
      this.map.remove();

      // optional: clear registry reference if you have such a method
      // this.mapRegistry.clearMap?.();
    } finally {
      this.map = undefined;
      this.onMoveOrZoom = undefined;
    }
  }
}
