import { Component, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ActivatedRoute, Router, NavigationStart } from '@angular/router';

import { Api } from '../../api/api';
import { StationLayer } from '../../departments/civil_engineering_assets/editing/station';
import { LandBoundaryLayer } from '../../departments/civil_engineering_assets/viewing/civil-engineering-assets-viewing';
import { LandPlanOntrackLayer } from 'src/app/departments/civil_engineering_assets/editing/landplan-ontrack';
import { LandOffsetLayer } from 'src/app/departments/civil_engineering_assets/viewing/civil-engineering-assets-viewing';
import {
  DivisionBufferLayer,
  IndiaBoundaryLayer,
  KmPostLayer,
  TrackLayer,
} from '../../departments/common';

import { LayerManager } from '../../services/layer-manager';
import { MapRegistry } from '../../services/map-registry';
import { FilterState } from '../../services/filter-state';
import { EditState } from '../../services/edit-state';
import { AttributeTableService, LayerKey } from '../../services/attribute-table';
import { UiState } from '../../services/ui-state';

import { MapZoomService, ZoomTarget } from 'src/app/services/map-zoom';

/* Widget panels */
import { LayerPanel } from '../layer-panel/layer-panel';
import { LegendPanel } from '../legend-panel/legend-panel';
import { BasemapPanel } from '../basemap-panel/basemap-panel';
import { EditPanel } from '../edit-panel/edit-panel';
import { AttributeTableComponent } from '../attribute-table/attribute-table';

type WidgetPanel = 'layers' | 'legend' | 'basemap' | 'edit';

/**
 * Match what your EditPanel dropdown uses:
 * edit-panel.html has: value="stations" and value="landplan"
 */
type EditableLayer = 'stations' | 'landplan';
type DepartmentModuleKey =
  | 'civil_engineering_assets'
  | 'civil_engineering_assets_offtrack'
  | 'unknown';

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
  private clearSelectionSub?: Subscription;
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

  // ✅ Hide/restore layers during Station Edit
  private editSuppressionSub?: Subscription;
  private suppressedVis = new globalThis.Map<string, boolean>();

  // IMPORTANT: must match id values in LandOffsetLayer / LandPlanOntrackLayer
  private readonly LAND_OFFSET_ID = 'land_offset';
  private readonly LAND_PLAN_ID = 'landplan_ontrack';

  // ✅ debounce layer reload on move/zoom (prevents API spam + hangs)
  private reloadTimer: any = null;

  // ✅ deep-linking from dashboard -> map
  private routeSub?: Subscription;

  private readonly departmentAliases: Record<string, DepartmentModuleKey> = {
    'civil engineering assets': 'civil_engineering_assets',
    'civil engineering assets offtrack': 'civil_engineering_assets_offtrack',
    'civil_engineering_assets': 'civil_engineering_assets',
    'civil_engineering_assets_offtrack': 'civil_engineering_assets_offtrack',
  };

  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private zone: NgZone,
    private mapRegistry: MapRegistry,
    private layerManager: LayerManager,
    private attrTable: AttributeTableService,
    public ui: UiState,
    private mapZoom: MapZoomService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  toggle(panel: WidgetPanel): void {
    const next = this.ui.activePanel === panel ? null : panel;
    this.ui.activePanel = next;

    if (next === 'edit') this.edit.enable();
    else this.edit.disable();

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

  private scheduleReload(): void {
    if (!this.map) return;

    if (this.reloadTimer) clearTimeout(this.reloadTimer);

    this.reloadTimer = setTimeout(() => {
      if (!this.map) return;
      this.layerManager.reloadVisible(this.map);
    }, 260);
  }

  private captureHomeAfterFirstSettle(): void {
    if (!this.map) return;
    if (this.homeCaptured) return;

    const initialCenter = L.latLng(22.5, 79);
    const initialZoom = 5;

    const isInitialView = () => {
      if (!this.map) return true;
      const z = this.map.getZoom();
      const c = this.map.getCenter();
      return z === initialZoom && c.distanceTo(initialCenter) < 50_000;
    };

    const trySave = () => {
      if (!this.map || this.homeCaptured) return;
      if (isInitialView()) return;

      this.homeCenter = this.map.getCenter();
      this.homeZoom = this.map.getZoom();
      this.homeCaptured = true;

      this.map.off('moveend', trySave);
      this.map.off('zoomend', trySave);
    };

    this.map.on('moveend', trySave);
    this.map.on('zoomend', trySave);

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
      }
    }, 200);
  }

  private zoomToHome(): void {
    if (!this.map) return;

    if (!this.homeCaptured || !this.homeCenter || typeof this.homeZoom !== 'number') {
      return;
    }

    this.map.invalidateSize();
    this.map.setView(this.homeCenter, this.homeZoom, { animate: false });
  }

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

  private createDraggableCircleMarker(ll: L.LatLng): L.Marker {
    const size = 34;
    const border = 5;

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

  private isEditableLayer(x: any): x is EditableLayer {
    return x === 'stations' || x === 'landplan';
  }

  private normalizeDepartmentName(value: string | null | undefined): string {
    return (value || '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private resolveDepartmentModule(): { key: DepartmentModuleKey; label: string } {
    const rawDepartment = localStorage.getItem('department') || '';
    const normalized = this.normalizeDepartmentName(rawDepartment);
    const key = this.departmentAliases[normalized] || 'unknown';

    if (key === 'civil_engineering_assets') {
      return {
        key,
        label: 'Civil Engineering Assets Layers',
      };
    }

    if (key === 'civil_engineering_assets_offtrack') {
      return {
        key,
        label: 'Civil Engineering Assets Offtrack Layers',
      };
    }

    return {
      key,
      label: rawDepartment?.trim() || 'Department Layers',
    };
  }

  private registerDepartmentLayers(): void {
    const department = this.resolveDepartmentModule();
    const attributeTabs: LayerKey[] = ['Km Post', 'Railway Track'];

    this.layerManager.clear();
    this.layerManager.setActiveDepartmentLabel(department.label);

    this.layerManager.registerOnce(new IndiaBoundaryLayer(this.api));
    this.layerManager.registerOnce(new DivisionBufferLayer(this.api));
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

    if (
      department.key !== 'civil_engineering_assets' &&
      department.key !== 'civil_engineering_assets_offtrack'
    ) {
      this.attrTable.setTabs(attributeTabs);
      return;
    }

    attributeTabs.unshift(
      'Station',
      'Land Plan Ontrack',
      'Land Offset',
      'Land Boundary'
    );

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
      new LandPlanOntrackLayer(this.api, this.edit, (g) =>
        this.attrTable.pushFeatureCollection('Land Plan Ontrack', g)
      )
    );

    this.attrTable.setTabs(attributeTabs);
  }

  /**
   * ✅ Deep link:
   * /map?panel=edit&layer=stations
   */
  private initDeepLinking(): void {
    this.routeSub?.unsubscribe();

    this.routeSub = this.route.queryParams.subscribe((params) => {
      const panel = String(params['panel'] || '').trim().toLowerCase();
      if (panel !== 'edit') return;

      const layerParam = String(params['layer'] || '').trim();

      // 1) open panel + enable edit
      this.ui.activePanel = 'edit';
      this.edit.enable();

      // 2) set layer safely (fix TS2345)
      if (this.isEditableLayer(layerParam)) {
        const safeLayer = layerParam as EditableLayer;

        // update edit state
        (this.edit as any).editLayer = safeLayer;
        this.edit.setLayer(safeLayer as any);

        /**
         * IMPORTANT:
         * EditPanel loads data in onLayerChange().
         * Since EditPanel is not directly callable here, we "re-trigger"
         * by setting same layer again on next tick.
         */
        setTimeout(() => {
          (this.edit as any).editLayer = safeLayer;
          this.edit.setLayer(safeLayer as any);
        }, 0);
      }

      // 3) resize (panel open)
      setTimeout(() => this.forceMapResize(), 0);
      setTimeout(() => this.forceMapResize(), 260);
    });
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
// ✅ hard reset UI before map is created (refresh safe)
this.ui.activePanel = null;
this.edit.disable();
    this.map = L.map(el, {
      preferCanvas: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: false,
      zoomAnimationThreshold: 4,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 90,
    }).setView([22.5, 79], 5);
    this.mapRegistry.setMap(this.map);

// ✅ sidebarSub now handles both:
// 1) sidebar collapse/expand -> resize map
// 2) sidebar navigation (route change) -> reset map UI if leaving map page
this.sidebarSub?.unsubscribe();
this.sidebarSub = new Subscription();

// 1) existing resize behavior
this.sidebarSub.add(
  this.ui.layoutChanged$.subscribe(() => {
    setTimeout(() => this.forceMapResize(), 320);
  })
);

// 2) NEW: reset widgets when sidebar navigates away from map page
this.sidebarSub.add(
  this.router.events
    .pipe(filter((e) => e instanceof NavigationStart))
    .subscribe((e: any) => {
      const fromUrl = this.router.url || '';
      const toUrl = e?.url || '';

      const isMapPage = (u: string) =>
        u.includes('/dashboard/railway-assets') || u.includes('/map');

      // only when leaving map page
      if (isMapPage(fromUrl) && !isMapPage(toUrl)) {
        // ✅ reset only (do NOT destroy map)
        this.ui.activePanel = null;
        this.edit.disable();
        this.mapZoom.clearHighlight();
        this.clearZoomArtifacts();
        this.applyEditSuppression();
      }
    })
);
    const base = L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      { maxNativeZoom: 17, maxZoom: 22, attribution: 'Tiles © Esri' }
    ).addTo(this.map);

    base.once('load', () => this.forceMapResize());

    this.registerDepartmentLayers();

    this.map.whenReady(() => {
      this.forceMapResize();


      // ✅ On refresh/first load: always start with all panels closed
// (deep-linking will re-open if panel=edit is present)
this.ui.activePanel = null;
this.edit.disable();
this.clearZoomArtifacts();
this.mapZoom.clearHighlight();

      this.layerManager.addAll(this.map!);
      this.layerManager.reloadAll(this.map!);

      this.captureHomeAfterFirstSettle();

      // ✅ Deep link AFTER map exists
      this.initDeepLinking();

      this.onMoveOrZoom = () => this.scheduleReload();
      this.map!.on('moveend', this.onMoveOrZoom);

      this.editSuppressionSub?.unsubscribe();
      this.editSuppressionSub = this.edit.stateChanged$.subscribe(() => {
        this.applyEditSuppression();
      });
      this.applyEditSuppression();

      this.lockDragSub?.unsubscribe();
      this.lockDragSub = this.edit.lockDrag$.subscribe(() => {
        if (!this.dragMarker) return;

        this.dragMarker.dragging?.disable();
        this.dragMarker.off('drag');
        this.dragMarker.off('dragend');
      });

      this.mapZoomSub?.unsubscribe();
      this.mapZoomSub = this.mapZoom.zoomTo$.subscribe((t: ZoomTarget) => {
        if (!this.map) return;

        this.clearZoomArtifacts();

        if (t.type === 'clear') return;

        if (t.type === 'home') {
          this.zoomToHome();
          return;
        }

        if (t.type === 'latlng') {
          const z = t.zoom ?? 17;
          const ll = L.latLng(t.lat, t.lng);
          const draggable = !!(t as any).draggable;

          this.map.invalidateSize();
          this.map.setView(ll, z, { animate: false });

          if (draggable) {
            this.dragMarker = this.createDraggableCircleMarker(ll).addTo(this.map);

            this.dragMarker.on('drag', () => {
              const p = this.dragMarker!.getLatLng();
              this.edit.emitDragEnd(p.lat, p.lng);
            });

            this.dragMarker.on('dragend', () => {
              const p = this.dragMarker!.getLatLng();
              this.edit.emitDragEnd(p.lat, p.lng);
            });

            this.zoomHighlight = this.dragMarker;
          } else {
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
          this.map.setView(ll, z, { animate: false });

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
          this.map.fitBounds(b.pad(t.pad ?? 0.2), { animate: false });
          return;
        }
      });

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
            this.map.fitBounds(bounds.pad(0.2), { animate: false });
          }
        } catch (e) {}
      });

      this.clearSelectionSub?.unsubscribe();
      this.clearSelectionSub = this.attrTable.clearSelection$.subscribe(() => {
        if (!this.map) return;
        this.clearZoomArtifacts();
        this.zoomToHome();
      });
    });
  }

  private applyEditSuppression(): void {
    if (!this.map) return;

    const shouldHide = this.edit.enabled && (this.edit as any).editLayer === 'stations';
    const ids = [this.LAND_OFFSET_ID, this.LAND_PLAN_ID];

    if (shouldHide) {
      ids.forEach((id) => {
        const layer = this.layerManager.findById(id);
        if (!layer) return;

        if (!this.suppressedVis.has(id)) {
          this.suppressedVis.set(id, !!layer.visible);
        }

        this.layerManager.setVisible(id, false, this.map!);
      });
    } else {
      ids.forEach((id) => {
        if (!this.suppressedVis.has(id)) return;

        const prev = this.suppressedVis.get(id)!;
        this.layerManager.setVisible(id, prev, this.map!);
        this.suppressedVis.delete(id);
      });
    }
  }

  ngOnDestroy(): void {
    this.zoomSub?.unsubscribe();
    this.clearSelectionSub?.unsubscribe();
    this.sidebarSub?.unsubscribe();
    this.mapZoomSub?.unsubscribe();
    this.lockDragSub?.unsubscribe();
    this.editSuppressionSub?.unsubscribe();
    this.routeSub?.unsubscribe();

    this.zoomSub = undefined;
    this.clearSelectionSub = undefined;
    this.sidebarSub = undefined;
    this.mapZoomSub = undefined;
    this.lockDragSub = undefined;
    this.editSuppressionSub = undefined;
    this.routeSub = undefined;

    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    this.reloadTimer = null;

    if (this.map) this.clearZoomArtifacts();

    if (!this.map) return;

    try {
      if (this.onMoveOrZoom) {
        this.map.off('moveend', this.onMoveOrZoom);
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
      this.suppressedVis.clear();
    }
  }
}
