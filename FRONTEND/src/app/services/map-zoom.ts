import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ZoomTarget =
  | { type: 'latlng'; lat: number; lng: number; zoom?: number }
  | { type: 'xy'; x: number; y: number; zoom?: number }
  | { type: 'bounds'; west: number; south: number; east: number; north: number; pad?: number }
  | { type: 'home' }
  | { type: 'clear' };

@Injectable({ providedIn: 'root' })
export class MapZoomService {
  private readonly _zoomTo$ = new Subject<ZoomTarget>();
  readonly zoomTo$ = this._zoomTo$.asObservable();

  zoomTo(t: ZoomTarget) {
    this._zoomTo$.next(t);
  }

  /** Remove any current highlight (map.ts should handle type === 'clear') */
  clearHighlight() {
    this._zoomTo$.next({ type: 'clear' });
  }

    zoomHome() {
    this._zoomTo$.next({ type: 'home' });
  }
}

