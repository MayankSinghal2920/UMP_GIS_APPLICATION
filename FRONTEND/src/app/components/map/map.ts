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

import { MapZoomService, ZoomTarget } from 'src/app/services/map-zoom';

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

  // ✅ draggable geometry marker
  private dragMarker?: L.Marker;
  private lockDragSub?: Subscription;

  private mapZoomSub?: Subscription;
  private zoomHighlight?: L.Layer;

  // ✅ Division “home view”
  private homeCenter?: L.LatLng;
  private homeZoom?: number;
  private homeCaptured = false;

  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private zone: NgZone,
    private mapRegistry: MapRegistry,
    private layerManager: LayerManager,
    private attrTable: AttributeTableService,
    public ui: UiState,
    private mapZoom: MapZoomService
  ) {}

  toggle(panel: WidgetPanel): void {
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

  private forceMapResize(): void {
    if (!this.map) return;
    this.map.invalidateSize();
    requestAnimationFrame(() => this.map?.invalidateSize());
    setTimeout(() => this.map?.invalidateSize(), 350);
  }

  // ✅ Capture home AFTER the map has moved away from initial India view
  private captureHomeAfterFirstSettle(): void {
    if (!this.map) return;
    if (this.homeCaptured) return;

    const initialCenter = L.latLng(22.5, 79);
    const initialZoom = 5;

    const isInitialView = () => {
      if (!this.map) return true;
      const z = this.map.getZoom();
      const c = this.map.getCenter();
      return z === initialZoom && c.distanceTo(initialCenter) < 50_000; // 50 km
    };

    const trySave = () => {
      if (!this.map || this.homeCaptured) return;
      if (isInitialView()) return; // ✅ do NOT capture India view

      this.homeCenter = this.map.getCenter();
      this.homeZoom = this.map.getZoom();
      this.homeCaptured = true;

      console.log('✅ HOME CAPTURED:', this.homeCenter, this.homeZoom);

      this.map.off('moveend', trySave);
      this.map.off('zoomend', trySave);
    };

    // listen for real movement (division fitBounds/setView)
    this.map.on('moveend', trySave);
    this.map.on('zoomend', trySave);

    // fallback polling (does NOT capture initial view)
    let tries = 0;
    const timer = setInterval(() => {
      if (!this.map || this.homeCaptured) {
        clearInterval(timer);
        return;
      }
      tries++;
      trySave();

      if (tries >= 30) {
        clearInterval(timer);
        this.map.off('moveend', trySave);
        this.map.off('zoomend', trySave);
        console.warn('⚠️ Home not captured yet (division zoom may not have happened).');
      }
    }, 200);
  }

  private zoomToHome(): void {
    if (!this.map) return;

    if (!this.homeCaptured || !this.homeCenter || typeof this.homeZoom !== 'number') {
      console.warn('⚠️ Home not captured yet. Skipping zoomHome.');
      return;
    }

    this.map.invalidateSize();
    this.map.setView(this.homeCenter, this.homeZoom, { animate: true });
  }

  // ✅ remove highlight + drag marker
  private clearZoomArtifacts(): void {
    if (!this.map) return;

    if (this.zoomHighlight && this.map.hasLayer(this.zoomHighlight as any)) {
      this.map.removeLayer(this.zoomHighlight as any);
    }
    this.zoomHighlight = undefined;

    if (this.dragMarker && this.map.hasLayer(this.dragMarker as any)) {
      this.dragMarker.off();
      this.map.removeLayer(this.dragMarker as any);
    }
    this.dragMarker = undefined;
  }

  // ✅ create draggable "circle" marker (circleMarker is NOT draggable)
  private createDraggableCircleMarker(ll: L.LatLng): L.Marker {
    const size = 34;  // circle diameter
    const border = 5; // border thickness

    const icon = L.divIcon({
      className: 'drag-circle-icon',
      html: `
        <div style="
          width:${size}px;height:${size}px;
          border:${border}px solid #7c3aed;
          background: rgba(167,139,250,0.60);
          border-radius: 50%;
          box-sizing: border-box;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });

    const m = L.marker(ll, {
      draggable: true,
      icon,
      keyboard: false,
      autoPan: true,
      autoPanPadding: L.point(40, 40),
    });

    (m as any).setZIndexOffset?.(9999);
    return m;
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
      try { anyEl._leaflet_id = undefined; } catch {}
    }

    this.map = L.map(el, { preferCanvas: true }).setView([22.5, 79], 5);
    this.mapRegistry.setMap(this.map);

    this.sidebarSub = this.ui.layoutChanged$.subscribe(() => {
      setTimeout(() => this.forceMapResize(), 320);
    });

    const base = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { maxNativeZoom: 17, maxZoom: 22, attribution: 'Tiles © Esri' }
    ).addTo(this.map);

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
      this.forceMapResize();

      this.layerManager.addAll(this.map!);
      this.layerManager.reloadAll(this.map!);

      // ✅ capture home after division zoom settles
      this.captureHomeAfterFirstSettle();

      this.onMoveOrZoom = () => this.layerManager.reloadAll(this.map!);
      this.map!.on('moveend', this.onMoveOrZoom);
      this.map!.on('zoomend', this.onMoveOrZoom);

      // ✅ Lock drag requests (from EditState)
      this.lockDragSub?.unsubscribe();
this.lockDragSub = this.edit.lockDrag$.subscribe(() => {
  if (!this.dragMarker) return;

  // hard lock
  this.dragMarker.dragging?.disable();
  this.dragMarker.off('drag');
  this.dragMarker.off('dragend');

  // optional: visually confirm it locked
  console.log('✅ Drag locked');
});



      // ✅ Listen to zoom commands
      this.mapZoomSub?.unsubscribe();
      this.mapZoomSub = this.mapZoom.zoomTo$.subscribe((t: ZoomTarget) => {
        if (!this.map) return;

        // always clear previous highlight/drag marker first
        this.clearZoomArtifacts();

        if (t.type === 'clear') return;

        if (t.type === 'home') {
          this.zoomToHome();
          return;
        }

        if (t.type === 'latlng') {
          const z = t.zoom ?? 17;
          const ll = L.latLng(t.lat, t.lng);

          // NOTE: draggable is a custom flag you pass from edit-panel
          const draggable = !!(t as any).draggable;

          this.map.invalidateSize();
          this.map.setView(ll, z, { animate: true });

          if (draggable) {
            // ✅ draggable “circle” marker
            this.dragMarker = this.createDraggableCircleMarker(ll).addTo(this.map);

this.dragMarker.on('drag', () => {
  const p = this.dragMarker!.getLatLng();
  console.log('MAP DRAG =>', p.lat, p.lng);
  this.edit.emitDragEnd(p.lat, p.lng);
});

this.dragMarker.on('dragend', () => {
  const p = this.dragMarker!.getLatLng();
  console.log('MAP DRAG END =>', p.lat, p.lng);
  this.edit.emitDragEnd(p.lat, p.lng);
});


            // keep reference for clearing
            this.zoomHighlight = this.dragMarker;
          } else {
            // ✅ non-draggable highlight
            this.zoomHighlight = L.circleMarker(ll, {
              radius: 15,
              weight: 5,
              color: '#7c3aed',
              fillColor: '#a78bfa',
              fillOpacity: 0.6,
            }).addTo(this.map);
          }

          return;
        }

        if (t.type === 'xy') {
          const ll = L.CRS.EPSG3857.unproject(L.point(t.x, t.y));
          const z = t.zoom ?? 17;

          this.map.invalidateSize();
          this.map.setView(ll, z, { animate: true });

          this.zoomHighlight = L.circleMarker(ll, {
            radius: 10,
            weight: 3,
            fillOpacity: 0.2,
          }).addTo(this.map);

          return;
        }

        if (t.type === 'bounds') {
          const b = L.latLngBounds(
            L.latLng(t.south, t.west),
            L.latLng(t.north, t.east)
          );
          this.map.invalidateSize();
          this.map.fitBounds(b.pad(t.pad ?? 0.2), { animate: true });
          return;
        }
      });

      // Existing attribute table zoom
      this.zoomSub?.unsubscribe();
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
    this.sidebarSub?.unsubscribe();
    this.mapZoomSub?.unsubscribe();
    this.lockDragSub?.unsubscribe();

    this.zoomSub = undefined;
    this.sidebarSub = undefined;
    this.mapZoomSub = undefined;
    this.lockDragSub = undefined;

    if (this.map) this.clearZoomArtifacts();

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
      this.homeCenter = undefined;
      this.homeZoom = undefined;
      this.homeCaptured = false;
      this.dragMarker = undefined;
      this.zoomHighlight = undefined;
    }
  }
}
