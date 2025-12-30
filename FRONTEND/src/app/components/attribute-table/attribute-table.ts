import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { AttributeTableService, LayerKey, Dataset, AttrRow } from '../../services/attribute-table';

@Component({
  selector: 'app-attribute-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './attribute-table.html',
  styleUrls: ['./attribute-table.css'],
})
export class AttributeTableComponent {
  collapsedHeight = 40;
  expandedHeight = 300;

  tabs: LayerKey[] = [
    'Station',
    'Land Plan Ontrack',
    'Land Offset',
    'Km Post',
    'Land Boundary',
    'Railway Track',
  ];
  

  open$!: Observable<boolean>;
  active$!: Observable<LayerKey>;
  datasets$!: Observable<Record<LayerKey, Dataset>>;

  constructor(private attr: AttributeTableService) {
    this.open$ = this.attr.open$;
    this.active$ = this.attr.active$;
    this.datasets$ = this.attr.datasets$;
  }

  toggle() { this.attr.toggle(); }

  setTab(tab: LayerKey, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.attr.setActive(tab);
  }

  onRowClick(active: LayerKey, row: AttrRow, ev?: MouseEvent) {
    ev?.stopPropagation();
    this.attr.zoomToRow(active, row);
  }

  getDataset(d: Record<LayerKey, Dataset>, a: LayerKey): Dataset {
    return d[a] ?? { rows: [], columns: [], count: 0, features: [] };
  }
}
