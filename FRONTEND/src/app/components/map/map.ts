import { Component, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { Api } from '../../services/api';
import { StationLayer } from '../../layers/station';
import { LayerManager } from '../../layers/layer-manager';
import { MapRegistry } from '../../services/map-registry';
import { TrackLayer } from '../../layers/track';
import {KmPostLayer} from '../../layers/km-post';
import { IndiaBoundaryLayer } from '../../layers/india-boundary';
import { FilterState } from '../../services/filter-state';
import { EditState } from '../../services/edit-state';
import { DivisionBufferLayer } from '../../layers/division-buffer';







@Component({
  selector: 'app-map',
  imports: [],
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements AfterViewInit {

  private map!: L.Map;
 
  // private stationLayer!: StationLayer;


  constructor(
    private api: Api,
    private filters: FilterState,
    private edit: EditState,
    private mapRegistry: MapRegistry,
    private layerManager: LayerManager
  ) {}


  ngAfterViewInit(): void {

      // Delay ensures Angular finishes rendering
    setTimeout(() => {
      this.initializeMap();
    }, 50);
  }

  private initializeMap() {
    // Create map
    this.map = L.map('map').setView([22.5, 79], 5);
    this.mapRegistry.setMap(this.map);

    // Tile Layer (World Topo)
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      {
        maxNativeZoom: 17,
        maxZoom: 22,
        attribution: 'Tiles © Esri'
      }
    ).addTo(this.map);
     // Register layers
     this.layerManager.register(new IndiaBoundaryLayer(this.api));
     this.layerManager.register(new DivisionBufferLayer(this.api));

    this.layerManager.register(
      new StationLayer(this.api, this.filters, this.edit)
    );
    this.layerManager.register(new TrackLayer(this.api));
    this.layerManager.register(new KmPostLayer(this.api));



     // Add & load all layers
    this.layerManager.addAll(this.map);
    this.layerManager.reloadAll(this.map);



     // Reload stations when map moves
     this.map.on('moveend zoomend', () => {
      this.layerManager.reloadAll(this.map);
    });
    

    // Fix map distortion issue
    this.map.invalidateSize();

  }

}
