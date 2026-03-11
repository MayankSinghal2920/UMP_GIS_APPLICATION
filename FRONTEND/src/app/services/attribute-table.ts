import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type AttrRow = Record<string, any>;
export type LayerKey = string;

export type Dataset = {
  rows: AttrRow[];
  columns: string[];
  count: number;
  features: any[]; // GeoJSON Feature[]
};

@Injectable({ providedIn: 'root' })
export class AttributeTableService {
  private readonly emptyDataset: Dataset = {
    rows: [],
    columns: [],
    count: 0,
    features: [],
  };

  private _open = new BehaviorSubject<boolean>(false);
  open$ = this._open.asObservable();

  private _tabs = new BehaviorSubject<LayerKey[]>(['Km Post', 'Railway Track']);
  tabs$ = this._tabs.asObservable();

  private _active = new BehaviorSubject<LayerKey>('Km Post');
  active$ = this._active.asObservable();

  private _datasets = new BehaviorSubject<Record<LayerKey, Dataset>>({
    'Km Post': { rows: [], columns: [], count: 0, features: [] },
    'Railway Track': { rows: [], columns: [], count: 0, features: [] },
  });
  datasets$ = this._datasets.asObservable();

  private _selected = new BehaviorSubject<{ layer: LayerKey; rowId: number } | null>(null);
  selected$ = this._selected.asObservable();

  // ✅ map will subscribe to this to zoom
  private _zoomTo = new Subject<{ layer: LayerKey; feature: any }>();
  zoomTo$ = this._zoomTo.asObservable();

  private _clearSelection = new Subject<void>();
  clearSelection$ = this._clearSelection.asObservable();

  setTabs(tabs: LayerKey[]) {
    const uniqueTabs = Array.from(new Set(tabs.filter(Boolean)));
    const nextTabs = uniqueTabs.length ? uniqueTabs : ['Km Post', 'Railway Track'];
    const currentDatasets = this._datasets.getValue();
    const nextDatasets: Record<LayerKey, Dataset> = {};

    nextTabs.forEach((tab) => {
      nextDatasets[tab] = currentDatasets[tab] ?? { ...this.emptyDataset };
    });

    this._tabs.next(nextTabs);
    this._datasets.next(nextDatasets);

    if (!nextTabs.includes(this._active.getValue())) {
      this._active.next(nextTabs[0]);
    }
  }

  setActive(tab: LayerKey) {
    this._active.next(tab);
  }

  toggle() { this._open.next(!this._open.getValue()); }
  show() { this._open.next(true); }
  hide() { this._open.next(false); }

  /**
   * Push full GeoJSON FeatureCollection or Feature array
   */
  pushFeatureCollection(tab: LayerKey, geojson: any) {
    const fc =
      geojson?.type === 'Feature'
        ? { type: 'FeatureCollection', features: [geojson] }
        : geojson;

    const features = (fc?.features ?? []).map((f: any) => ({
      ...f,
      properties: f?.properties ?? f?.attributes ?? {},
    }));

    const rows: AttrRow[] = features.map((f: any, i: number) => ({
      __rowid: i, // ✅ used to pick matching feature
      ...(f.properties ?? {}),
    }));

   // ✅ union of all keys so all columns appear
const colSet = new Set<string>();
for (const r of rows) {
  for (const k of Object.keys(r)) {
    if (k !== '__rowid') colSet.add(k);
  }
}

// optional: keep stable order (ObjectId first if present, etc.)
const preferred = ['OBJECTID', 'objectid', 'id', 'km', 'division', 'railway'];
const cols = [
  ...preferred.filter(p => colSet.has(p)),
  ...Array.from(colSet).filter(k => !preferred.includes(k)).sort(),
];


    const next = { ...this._datasets.getValue() };
    next[tab] = {
      rows,
      columns: cols,
      count: rows.length,
      features,
    };

    this._datasets.next(next);
  }

  zoomToRow(tab: LayerKey, row: AttrRow) {
    const ds = this._datasets.getValue()[tab];
    const idx = Number((row as any).__rowid);
    const feature = ds?.features?.[idx];
    if (feature) this._zoomTo.next({ layer: tab, feature });
  }

  selectRow(tab: LayerKey, row: AttrRow) {
    const rowId = Number((row as any).__rowid);
    if (Number.isNaN(rowId)) return;
    this._selected.next({ layer: tab, rowId });
  }

  getSelected() {
    return this._selected.getValue();
  }

  clearSelection() {
    this._selected.next(null);
    this._clearSelection.next();
  }
}
