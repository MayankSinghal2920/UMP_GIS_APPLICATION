import * as L from 'leaflet';

export interface MapLayer {
  id: string;          // unique key (e.g. 'stations')
  title: string;       // display name (e.g. 'Stations')
  visible: boolean;    // UI-controlled visibility
  layerGroup?: 'common' | 'department';

   legend: {
    type: 'point' | 'line' | 'polygon';
    color: string;
    label: string;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeWidth?: number;
    radius?: number;
  };


  addTo(map: L.Map): void;
  removeFrom(map: L.Map): void;
  loadForMap(map: L.Map): void;

  
}
