import { Injectable } from '@angular/core';

export type EditableLayer = 'stations' | null;

@Injectable({
  providedIn: 'root'
})
export class EditState {

  enabled = false;

  // NEW
  editLayer: EditableLayer = null;

  // selection & draft (will be used later)
  selectedFeatureId: number | null = null;
  draft: any = null;

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


}
