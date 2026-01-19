import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

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
import { AttributeTableService } from '../../services/attribute-table';
import { UiState } from '../../services/ui-state';

/* Widget panels */
import { LayerPanel } from '../layer-panel/layer-panel';
import { LegendPanel } from '../legend-panel/legend-panel';
import { BasemapPanel } from '../basemap-panel/basemap-panel';
import { EditPanel } from '../edit-panel/edit-panel';
import { AttributeTableComponent } from '../attribute-table/attribute-table';

type WidgetPanel = 'layers' | 'legend' | 'basemap' | 'edit';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule,
    LayerPanel,
    LegendPanel,
    BasemapPanel,
    EditPanel,
    AttributeTableComponent,
  ],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements AfterViewInit, OnDestroy {
  private map?: L.Map;
  private zoomSub?: Subscription;
  private highlightLayer?: L.GeoJSON;
  private onMoveOrZoom?: () => void;
  private sidebarSub?: Subscription;

  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private zone: NgZone,
    private mapRegistry: MapRegistry,
    private layerManager: LayerManager,
    private attrTable: AttributeTableService, // ✅ existing table logic
    public ui: UiState
  ) {}

// private updateRightPanelWidth(): void {
//   const host = document.querySelector('app-map') as HTMLElement;
//   if (!host) return;

//   const open = this.ui.activePanel !== null;
//   host.style.setProperty('--right-panel-width', open ? '420px' : '0px');

//   setTimeout(() => this.map?.invalidateSize(), 260);
// }

  /* Widget toggle */
toggle(panel: WidgetPanel): void {
  console.log('widget clicked:', panel);
  const next = this.ui.activePanel === panel ? null : panel;
  this.ui.activePanel = next;
  this.edit.enabled = next === 'edit';

  setTimeout(() => this.forceMapResize(), 0);
  setTimeout(() => this.forceMapResize(), 260);
}





  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.initializeMapSafely());
    });
  }

  /** ✅ Fix refresh-gap: force Leaflet to recompute size after layout settles */
  private forceMapResize(): void {
    if (!this.map) return;

    // 1) immediate
    this.map.invalidateSize();

    // 2) after DOM paint
    requestAnimationFrame(() => this.map?.invalidateSize());

    // 3) after sidebar/layout transition settles
    setTimeout(() => this.map?.invalidateSize(), 350);
  }


  private initializeMapSafely(): void {
    const el = document.getElementById('map');
    if (!el) {
      requestAnimationFrame(() => this.initializeMapSafely());
      return;
    }

    if (this.map) return;

    const anyEl = el as any;
    if (anyEl._leaflet_id) {
      try {
        anyEl._leaflet_id = undefined;
      } catch {}
    }

    this.map = L.map(el, { preferCanvas: true }).setView([22.5, 79], 5);
    this.mapRegistry.setMap(this.map);

    // ✅ Resize Leaflet after sidebar open/close or any layout changes
    this.sidebarSub = this.ui.layoutChanged$.subscribe(() => {
      // wait a bit because sidebar uses width transition
      setTimeout(() => this.forceMapResize(), 320);
    });

    const base = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { maxNativeZoom: 17, maxZoom: 22, attribution: 'Tiles © Esri' }
    ).addTo(this.map);

    // ✅ When tiles first load, Leaflet container size is fully settled
    base.once('load', () => this.forceMapResize());

    /* Register layers once */
    this.layerManager.registerOnce(new IndiaBoundaryLayer(this.api));
    this.layerManager.registerOnce(new DivisionBufferLayer(this.api));

    this.layerManager.registerOnce(
      new StationLayer(this.api, this.filters, this.edit, this.zone, (g) =>
        this.attrTable.pushFeatureCollection('Station', g)
      )
    );

    this.layerManager.registerOnce(
      new LandOffsetLayer(this.api, (g) =>
        this.attrTable.pushFeatureCollection('Land Offset', g)
      )
    );

    this.layerManager.registerOnce(
      new LandBoundaryLayer(this.api, (g) =>
        this.attrTable.pushFeatureCollection('Land Boundary', g)
      )
    );

    this.layerManager.registerOnce(
      new LandPlanOntrackLayer(this.api, (g) =>
        this.attrTable.pushFeatureCollection('Land Plan Ontrack', g)
      )
    );

    this.layerManager.registerOnce(
      new TrackLayer(this.api, (g) =>
        this.attrTable.pushFeatureCollection('Railway Track', g)
      )
    );

    this.layerManager.registerOnce(
      new KmPostLayer(this.api, (g) =>
        this.attrTable.pushFeatureCollection('Km Post', g)
      )
    );

    this.map.whenReady(() => {
      // ✅ do multi-pass resize (fixes right-gap after refresh)
      this.forceMapResize();

      this.layerManager.addAll(this.map!);
      this.layerManager.reloadAll(this.map!);

      this.onMoveOrZoom = () => this.layerManager.reloadAll(this.map!);
      this.map!.on('moveend', this.onMoveOrZoom);
      this.map!.on('zoomend', this.onMoveOrZoom);
      // this.updateRightPanelWidth();


      this.zoomSub = this.attrTable.zoomTo$.subscribe(({ feature }) => {
        if (!this.map) return;

        try {
          if (this.highlightLayer && this.map.hasLayer(this.highlightLayer)) {
            this.map.removeLayer(this.highlightLayer);
          }

          const gj = L.geoJSON(feature);
          const bounds = gj.getBounds();

          if (bounds?.isValid()) {
            this.map.fitBounds(bounds.pad(0.2), { animate: true });
          }
        } catch (e) {
          console.error('Zoom-to feature failed:', e);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.zoomSub?.unsubscribe();
    this.zoomSub = undefined;

    this.sidebarSub?.unsubscribe();
    this.sidebarSub = undefined;

    if (!this.map) return;

    try {
      if (this.onMoveOrZoom) {
        this.map.off('moveend', this.onMoveOrZoom);
        this.map.off('zoomend', this.onMoveOrZoom);
      } else {
        this.map.off();
      }

      this.layerManager.removeAll(this.map);
      this.map.remove();
    } finally {
      this.map = undefined;
      this.onMoveOrZoom = undefined;
      this.highlightLayer = undefined;
    }
  }
}
