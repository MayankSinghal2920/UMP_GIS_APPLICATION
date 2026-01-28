import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ZoomTarget =
  | { type: 'latlng'; lat: number; lng: number; zoom?: number; draggable?: boolean }
  | { type: 'xy'; x: number; y: number; zoom?: number }
  | { type: 'bounds'; west: number; south: number; east: number; north: number; pad?: number }
  | { type: 'home' }
  | { type: 'clear' }
  | { type: 'lock' };

@Injectable({ providedIn: 'root' })
export class MapZoomService {
  private readonly _zoomTo$ = new Subject<ZoomTarget>();
  readonly zoomTo$ = this._zoomTo$.asObservable();

  // ✅ drag-end callback channel
  private readonly _dragEnd$ = new Subject<{ lat: number; lng: number }>();
  readonly dragEnd$ = this._dragEnd$.asObservable();

  zoomTo(t: ZoomTarget) {
    this._zoomTo$.next(t);
  }

  clearHighlight() {
    this._zoomTo$.next({ type: 'clear' });
  }

  zoomHome() {
    this._zoomTo$.next({ type: 'home' });
  }

  // ✅ called from map.ts when drag ends
  emitDragEnd(lat: number, lng: number) {
    this._dragEnd$.next({ lat, lng });
  }

  // ✅ called from edit-panel.ts
  onDragEnd(fn: (lat: number, lng: number) => void) {
    const sub = this.dragEnd$.subscribe(({ lat, lng }) => fn(lat, lng));
    return sub;
  }

  lockDrag() {
    this._zoomTo$.next({ type: 'lock' });
  }
}

