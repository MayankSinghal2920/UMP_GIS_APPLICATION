import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type AttrRow = Record<string, any>;
export type LayerKey =
  | 'Station'
  | 'Land Plan Ontrack'
  | 'Land Offset'
  | 'Km Post'
  | 'Land Boundary'
  | 'Railway Track';


export type Dataset = {
  rows: AttrRow[];
  columns: string[];
  count: number;
  features: any[]; // GeoJSON Feature[]
};

@Injectable({ providedIn: 'root' })
export class AttributeTableService {
  private _open = new BehaviorSubject<boolean>(false);
  open$ = this._open.asObservable();

  private _active = new BehaviorSubject<LayerKey>('Station');
  active$ = this._active.asObservable();

  private _datasets = new BehaviorSubject<Record<LayerKey, Dataset>>({
    'Station': { rows: [], columns: [], count: 0, features: [] },
    'Land Plan Ontrack': { rows: [], columns: [], count: 0, features: [] },
    'Land Offset': { rows: [], columns: [], count: 0, features: [] },
    'Land Boundary': { rows: [], columns: [], count: 0, features: [] },
    'Km Post': { rows: [], columns: [], count: 0, features: [] },
    'Railway Track': { rows: [], columns: [], count: 0, features: [] },
  });
  datasets$ = this._datasets.asObservable();

  // ✅ map will subscribe to this to zoom
  private _zoomTo = new Subject<{ layer: LayerKey; feature: any }>();
  zoomTo$ = this._zoomTo.asObservable();

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
}
