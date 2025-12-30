import * as L from 'leaflet';
import { Injectable } from '@angular/core';
import { MapLayer } from './interface';

@Injectable({ providedIn: 'root' })
export class LayerManager {
  private layers: MapLayer[] = [];

  // ✅ use only for quick tests; prefer registerOnce
  register(layer: MapLayer) {
    this.layers.push(layer);
  }

  // ✅ prevents duplicates by id (IMPORTANT in Angular services)
  registerOnce(layer: MapLayer) {
    const idx = this.layers.findIndex(l => l.id === layer.id);
    if (idx !== -1) {
      // replace existing instance (so latest constructor deps are used)
      this.layers[idx] = layer;
      return;
    }
    this.layers.push(layer);
  }

  // ✅ call this when you want a fresh start (optional)
  clear() {
    this.layers = [];
  }

  addAll(map: L.Map) {
    if (!map) return;

    // ✅ ensure Leaflet is ready before adding vector layers
    map.whenReady(() => {
      this.layers.forEach(layer => {
        try {
          layer.addTo(map);
        } catch (e) {
          console.error(`Layer addTo failed: ${layer.id}`, e);
        }
      });
    });
  }

  removeAll(map: L.Map) {
    if (!map) return;
    this.layers.forEach(layer => {
      try {
        layer.removeFrom(map);
      } catch (e) {
        console.error(`Layer removeFrom failed: ${layer.id}`, e);
      }
    });
  }

  reloadAll(map: L.Map) {
    if (!map) return;

    // ✅ wait for renderer/panes to exist
    map.whenReady(() => {
      this.layers.forEach(layer => {
        try {
          layer.loadForMap(map);
        } catch (e) {
          console.error(`Layer loadForMap failed: ${layer.id}`, e);
        }
      });
    });
  }

  getLayers(): MapLayer[] {
    return this.layers;
  }

  // Show / hide layers based on `visible` flag
  applyVisibility(map: L.Map) {
    if (!map) return;

    map.whenReady(() => {
      this.layers.forEach(layer => {
        try {
          if (layer.visible) layer.addTo(map);
          else layer.removeFrom(map);
        } catch (e) {
          console.error(`Layer applyVisibility failed: ${layer.id}`, e);
        }
      });
    });
  }

  // Reload ONLY visible layers (called on map move)
  reloadVisible(map: L.Map) {
    if (!map) return;

    map.whenReady(() => {
      this.layers.forEach(layer => {
        if (!layer.visible) return;
        try {
          layer.loadForMap(map);
        } catch (e) {
          console.error(`Layer reloadVisible failed: ${layer.id}`, e);
        }
      });
    });
  }
}

