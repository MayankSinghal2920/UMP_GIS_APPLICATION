// import { Component, signal } from '@angular/core';
// import { RouterOutlet } from '@angular/router';
// import { Map } from "./components/map/map";
// import { Topbar } from "./components/topbar/topbar";
// import { LayerPanel } from "./components/layer-panel/layer-panel";
// import { UiState } from './services/ui-state';
// import { CommonModule } from '@angular/common';
// import { LegendPanel } from "./components/legend-panel/legend-panel";
// import { BasemapPanel } from "./components/basemap-panel/basemap-panel";
// import { FilterPanel } from "./components/filter-panel/filter-panel";
// import { EditPanel } from "./components/edit-panel/edit-panel";

// @Component({
//   selector: 'app-root',
//   imports: [RouterOutlet, CommonModule, Map, Topbar, LayerPanel, LegendPanel, BasemapPanel, FilterPanel, EditPanel],
//   templateUrl: './app.html',
//   styleUrl: './app.css'
// })
// export class App {
//   protected readonly title = signal('UMP_GIS_APPLICATION');
//   constructor(public ui: UiState) {}
// }

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class App {}
