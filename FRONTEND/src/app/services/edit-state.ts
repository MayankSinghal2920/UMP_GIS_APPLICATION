import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type EditableLayer = 'stations' | null;

@Injectable({ providedIn: 'root' })
export class EditState {
  enabled = false;
  editLayer: EditableLayer = null;

  selectedFeatureId: number | null = null;
  draft: any = null;

  // ✅ NEW: drag end stream
  private _dragEnd$ = new Subject<{ lat: number; lng: number }>();
  readonly dragEnd$ = this._dragEnd$.asObservable();

  // ✅ NEW: lock drag stream
  private _lockDrag$ = new Subject<void>();
  readonly lockDrag$ = this._lockDrag$.asObservable();

  emitDragEnd(lat: number, lng: number) {
    this._dragEnd$.next({ lat, lng });
  }

  lockDrag() {
    this._lockDrag$.next();
  }

  enable() {
    this.enabled = true;
    this.reset();
  }

  disable() {
    this.enabled = false;
    this.reset();
  }

  setLayer(layer: EditableLayer) {
    this.editLayer = layer;
    this.resetSelection();
  }

  resetSelection() {
    this.selectedFeatureId = null;
    this.draft = null;
  }

  reset() {
    this.editLayer = null;
    this.selectedFeatureId = null;
    this.draft = null;
  }

  select(feature: any) {
    const id = feature?.id ?? feature?.properties?.objectid ?? null;
    this.selectedFeatureId = id;
    this.draft = { ...(feature.properties || {}) };
  }
}
