import { Component, HostListener } from '@angular/core';
import { UiState } from '../../services/ui-state';
import { LayerManager } from '../../services/layer-manager';
import { MapRegistry } from '../../services/map-registry';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttributeTableService } from '../../services/attribute-table';
import { StationCategoryVisibilityService } from '../../services/station-category-visibility';
import {
  STATION_CATEGORY_GROUPS,
  type StationCategory,
  type StationCategoryGroup,
} from '../../departments/civil_engineering_assets/viewing/station-category-config';

type LayerTreeNode = {
  id: string;
  title: string;
  kind: 'group' | 'layer' | 'station-category';
  checked: boolean;
  expanded: boolean;
  children?: LayerTreeNode[];
  layerRef?: any;
  stationCategory?: StationCategory;
  stationGroup?: StationCategoryGroup;
  controlsStationLayer?: boolean;
};

@Component({
  selector: 'app-layer-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './layer-panel.html',
  styleUrls: ['./layer-panel.css'],
})
export class LayerPanel {
  private expandState = new Map<string, boolean>();
  activeActionNodeId: string | null = null;

  constructor(
    public ui: UiState,
    public layerManager: LayerManager,
    private mapRegistry: MapRegistry,
    private attributeTable: AttributeTableService,
    private stationCategoryVisibility: StationCategoryVisibilityService,
  ) {}

  @HostListener('document:click')
  onDocumentClick(): void {
    this.activeActionNodeId = null;
  }

  close() {
    this.ui.activePanel = null;
  }

  getLabel(layer: { title?: string; legend?: { label?: string } }): string {
    return layer.title?.trim() || layer.legend?.label?.trim() || 'Layer';
  }

  trackByNodeId(_index: number, node: LayerTreeNode): string {
    return node.id;
  }

  private normalize(value: string): string {
    return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isExpanded(id: string, fallback = true): boolean {
    return this.expandState.has(id) ? !!this.expandState.get(id) : fallback;
  }

  private setExpanded(id: string, value: boolean): void {
    this.expandState.set(id, value);
  }

  private makeLayerNode(layer: any): LayerTreeNode {
    return {
      id: layer.id,
      title: this.getLabel(layer),
      kind: 'layer',
      checked: !!layer.visible,
      expanded: false,
      layerRef: layer,
    };
  }

  private makeGroupNode(id: string, title: string, children: LayerTreeNode[], fallbackExpanded = true): LayerTreeNode {
    return {
      id,
      title,
      kind: 'group',
      checked: children.some((child) => child.checked),
      expanded: this.isExpanded(id, fallbackExpanded),
      children,
    };
  }

  private makeStationCategoryNode(category: StationCategory): LayerTreeNode {
    return {
      id: `station-category-${category}`,
      title: category,
      kind: 'station-category',
      checked: this.stationCategoryVisibility.isCategoryVisible(category),
      expanded: false,
      stationCategory: category,
    };
  }

  private makeStationCategoryGroupNode(group: StationCategoryGroup): LayerTreeNode {
    const groupDef = STATION_CATEGORY_GROUPS.find((item) => item.group === group);
    const children = (groupDef?.categories || []).map((category) => this.makeStationCategoryNode(category));
    return {
      id: `station-group-${group}`,
      title: group,
      kind: 'group',
      checked: children.some((child) => child.checked),
      expanded: this.isExpanded(`station-group-${group}`, true),
      children,
      stationGroup: group,
    };
  }

  private makeStationRootNode(layer: any): LayerTreeNode {
    const children = STATION_CATEGORY_GROUPS.map((group) => this.makeStationCategoryGroupNode(group.group));
    return {
      id: 'root-railway-stations',
      title: 'RAILWAY STATIONS',
      kind: 'group',
      checked: !!layer.visible && this.stationCategoryVisibility.isAnyCategoryVisible(),
      expanded: this.isExpanded('root-railway-stations', true),
      children,
      layerRef: layer,
      controlsStationLayer: true,
    };
  }

  private groupDepartmentLayers(layers: any[]): LayerTreeNode[] {
    let stationRoot: LayerTreeNode | null = null;
    const trackChildren: LayerTreeNode[] = [];
    const bridgeChildren: LayerTreeNode[] = [];
    const railwayLandChildren: LayerTreeNode[] = [];
    const otherChildren: LayerTreeNode[] = [];

    const trackKeys = new Set([
      'railway track', 'track', 'km post', 'point & crossing', 'point and crossing', 'point xing', 'pointxing',
      'level crossing', 'levelxing', 'switch expansion joint', 'sej', 'buffer rails', 'buffer rail',
      'gradient start', 'gradient end', 'curve start', 'curve end', 'cutting start', 'cutting end'
    ]);

    const bridgeKeys = new Set([
      'bridge start', 'bridge end', 'bridge stop', 'bridge minor', 'tunnel start', 'tunnel end',
      'road over bridge', 'rob', 'rub_lhs', 'rub lhs', 'rub', 'foot over bridge', 'fob', 'rail over rail', 'ror'
    ]);

    const railwayLandKeys = new Set([
      'land boundary', 'land offset', 'landplan', 'land plan', 'landplan ontrack', 'land plan ontrack', 'land plans on-track',
      'land plans (on-track)', 'landplan offtrack', 'land plan offtrack', 'land plans off-track',
      'land plans (off-track)', 'land parcel', 'land parcels'
    ]);

    layers.forEach((layer) => {
      const node = this.makeLayerNode(layer);
      const normalized = this.normalize(node.title);

      if (normalized === 'stations' || normalized === 'station' || normalized.includes('railway station')) {
        stationRoot = this.makeStationRootNode(layer);
        return;
      }
      if ([...railwayLandKeys].some((key) => normalized.includes(key))) {
        railwayLandChildren.push(node);
        return;
      }
      if ([...trackKeys].some((key) => normalized.includes(key))) {
        trackChildren.push(node);
        return;
      }
      if ([...bridgeKeys].some((key) => normalized.includes(key))) {
        bridgeChildren.push(node);
        return;
      }
      otherChildren.push(node);
    });

    const groups: LayerTreeNode[] = [];
    if (stationRoot) groups.push(stationRoot);
    if (trackChildren.length) groups.push(this.makeGroupNode('group-track', 'Track', trackChildren));
    if (bridgeChildren.length) groups.push(this.makeGroupNode('group-bridges', 'Bridges', bridgeChildren));
    if (railwayLandChildren.length) groups.push(this.makeGroupNode('group-railway-land', 'Railway Land', railwayLandChildren));
    groups.push(...otherChildren);
    return groups;
  }

  getLayerTree(): LayerTreeNode[] {
    const groups = this.layerManager.getGroupedLayers();
    const tree: LayerTreeNode[] = [];

    groups.forEach((group) => {
      const children = group.key === 'department'
        ? this.groupDepartmentLayers(group.layers)
        : group.layers.map((layer) => this.makeLayerNode(layer));

      if (group.key === 'department') {
        const stationRoot = children.find((child) => child.id === 'root-railway-stations');
        const departmentChildren = children.filter((child) => child.id !== 'root-railway-stations');

        if (stationRoot) {
          tree.push(stationRoot);
        }
        if (departmentChildren.length) {
          tree.push(this.makeGroupNode(`root-${group.key}`, group.title.toUpperCase(), departmentChildren, true));
        }
        return;
      }

      tree.push(this.makeGroupNode(`root-${group.key}`, group.title.toUpperCase(), children, true));
    });

    return tree;
  }

  toggleExpanded(node: LayerTreeNode): void {
    if (node.kind !== 'group') return;
    node.expanded = !node.expanded;
    this.setExpanded(node.id, node.expanded);
  }

  toggleNodeActions(node: LayerTreeNode, event?: MouseEvent): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.activeActionNodeId = this.activeActionNodeId === node.id ? null : node.id;
  }

  showInAttributeTable(node: LayerTreeNode, event?: MouseEvent): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (node.kind !== 'layer') return;

    this.attributeTable.setActive(node.title);
    this.attributeTable.show();
    this.activeActionNodeId = null;
  }

  toggleNode(node: LayerTreeNode, checked: boolean): void {
    if (!this.mapRegistry.hasMap()) return;
    const map = this.mapRegistry.getMap();

    if (node.controlsStationLayer) {
      this.stationCategoryVisibility.setAllVisible(checked);
      if (node.layerRef) {
        node.layerRef.visible = checked;
        this.layerManager.setVisible(node.layerRef.id, checked, map);
      }
      return;
    }

    if (node.stationGroup) {
      this.stationCategoryVisibility.setGroupVisible(node.stationGroup, checked);
      this.syncStationLayerVisibility(map);
      return;
    }

    if (node.stationCategory) {
      this.stationCategoryVisibility.setCategoryVisible(node.stationCategory, checked);
      this.syncStationLayerVisibility(map);
      return;
    }

    if (node.kind === 'group') {
      const nextValue = checked;
      node.checked = nextValue;
      (node.children || []).forEach((child) => this.applyNodeVisibility(child, nextValue, map));
    } else if (node.layerRef) {
      node.checked = checked;
      node.layerRef.visible = checked;
      this.layerManager.setVisible(node.layerRef.id, checked, map);
    }

    this.layerManager.applyVisibility(map);
    this.layerManager.reloadVisible(map);
  }

  private applyNodeVisibility(node: LayerTreeNode, visible: boolean, map: any): void {
    node.checked = visible;
    if (node.controlsStationLayer) {
      this.stationCategoryVisibility.setAllVisible(visible);
      if (node.layerRef) {
        node.layerRef.visible = visible;
        this.layerManager.setVisible(node.layerRef.id, visible, map);
      }
      return;
    }
    if (node.stationGroup) {
      this.stationCategoryVisibility.setGroupVisible(node.stationGroup, visible);
      this.syncStationLayerVisibility(map);
      return;
    }
    if (node.stationCategory) {
      this.stationCategoryVisibility.setCategoryVisible(node.stationCategory, visible);
      this.syncStationLayerVisibility(map);
      return;
    }
    if (node.kind === 'group') {
      (node.children || []).forEach((child) => this.applyNodeVisibility(child, visible, map));
      return;
    }
    if (node.layerRef) {
      node.layerRef.visible = visible;
      this.layerManager.setVisible(node.layerRef.id, visible, map);
    }
  }

  private syncStationLayerVisibility(map: any): void {
    const stationLayer = this.layerManager.findById('stations');
    if (!stationLayer) return;
    const shouldShow = this.stationCategoryVisibility.isAnyCategoryVisible();
    stationLayer.visible = shouldShow;
    this.layerManager.setVisible(stationLayer.id, shouldShow, map);
  }
}



