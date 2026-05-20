import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Api } from 'src/app/api/api';
import { CurrentUserService } from 'src/app/services/current-user';
import { normalizeCivilEngineeringLayerId } from 'src/app/departments/civil_engineering_assets/editing/civil-engineering-assets-editing';

type CardType = 'TOTAL' | 'MAKER' | 'CHECKER' | 'APPROVER' | 'FINALIZED';

interface MainCard {
  key: CardType;
  title: string;
  value: number;
  color: string;
}

type EditableLayerKey =
  | 'stations'
  | 'km_post'
  | 'landplan_ontrack'
  | 'land_offset'
  | 'bridge_start'
  | 'bridge_end'
  | 'bridge_minor'
  | 'levelxing'
  | 'road_over_bridge'
  | 'rub_lhs'
  | 'ror';

interface SubCard {
  title: string;
  value: number;
  layerKey: string;
  statusKey: string;
}

type DashboardLayerConfig = {
  title: string;
  layerKey: EditableLayerKey;
  call: (type: CardType, allIndia: boolean) => any;
};

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {
  selectedMain: CardType = 'TOTAL';
  private visibleDashboardLayers: DashboardLayerConfig[] = [];

  mainCards: MainCard[] = [
    { key: 'TOTAL', title: 'TOTAL', value: 0, color: 'blue' },
    { key: 'MAKER', title: 'MAKER', value: 0, color: 'pink' },
    { key: 'CHECKER', title: 'CHECKER', value: 0, color: 'green' },
    { key: 'APPROVER', title: 'APPROVER', value: 0, color: 'yellow' },
    { key: 'FINALIZED', title: 'FINALIZED', value: 0, color: 'teal' },
  ];

  subCardMap: Record<CardType, SubCard[]> = {
    TOTAL: this.emptySubCards('TOTAL'),
    MAKER: this.emptySubCards('MAKER'),
    CHECKER: this.emptySubCards('CHECKER'),
    APPROVER: this.emptySubCards('APPROVER'),
    FINALIZED: this.emptySubCards('FINALIZED'),
  };

  constructor(
    private api: Api,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private currentUser: CurrentUserService
  ) {}

  private getUserMainKey(): CardType | 'ADMIN' | null {
    const ut = (this.currentUser.getSnapshot()?.user_type || '').trim().toLowerCase();
    if (ut === 'maker') return 'MAKER';
    if (ut === 'checker') return 'CHECKER';
    if (ut === 'approver') return 'APPROVER';
    if (ut === 'admin') return 'ADMIN';
    return null;
  }

  get isSuperAdminDashboard(): boolean {
    return (this.currentUser.getSnapshot()?.user_type || '').trim().toLowerCase() === 'super admin';
  }

  onSubCardClick(card: SubCard): void {
    const userMain = this.getUserMainKey();
    if (!userMain) return;

    const allowed = userMain === 'ADMIN' || this.selectedMain === userMain;
    if (!allowed) return;

    const layer = this.getEditRouteLayer(card.layerKey);
    if (!layer) return;

    this.router.navigate(['/dashboard/railway-assets'], {
      queryParams: {
        panel: 'edit',
        layer,
      },
    });
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    if (this.isMakerDashboard()) {
      this.loadMakerDashboard();
      return;
    }

    this.visibleDashboardLayers = this.getAllDashboardLayers();
    this.loadDashboardCounts(this.isSuperAdminDashboard);
  }

  private loadMakerDashboard(): void {
    const currentUserId = String(this.currentUser.getSnapshot()?.user_id || '').trim();
    if (!currentUserId) {
      this.applyVisibleDashboardLayers([]);
      return;
    }

    this.api.getMakerLayerList(currentUserId).subscribe({
      next: (res: any) => {
        const makers = Array.isArray(res?.makers) ? res.makers : [];
        const maker = makers.find(
          (item: any) => String(item?.user_id || '').trim().toLowerCase() === currentUserId.toLowerCase(),
        );

        const assignedIds = String(maker?.assigned_layers || '')
          .split(',')
          .map((value) => String(value || '').trim())
          .filter(Boolean);

        if (!maker?.department_id || !assignedIds.length) {
          this.applyVisibleDashboardLayers([]);
          return;
        }

        this.api.getDepartmentLayers(String(maker.department_id).trim()).subscribe({
          next: (layers: any[]) => {
            const assignedLayerKeys = new Set(
              (Array.isArray(layers) ? layers : [])
                .filter((layer: any) => assignedIds.includes(String(layer?.layer_id || '').trim()))
                .map((layer: any) => this.toDashboardLayerKey(layer?.layer_id, layer?.layar_name))
                .filter(Boolean) as EditableLayerKey[],
            );

            const visibleLayers = this.getAllDashboardLayers().filter((layer) =>
              assignedLayerKeys.has(layer.layerKey)
            );
            this.visibleDashboardLayers = visibleLayers;
            this.loadDashboardCounts(false);
          },
          error: () => this.applyVisibleDashboardLayers([]),
        });
      },
      error: () => this.applyVisibleDashboardLayers([]),
    });
  }

  private loadDashboardCounts(allIndia: boolean): void {
    const types: CardType[] = ['TOTAL', 'MAKER', 'CHECKER', 'APPROVER', 'FINALIZED'];

    this.applyVisibleDashboardLayers(this.visibleDashboardLayers);
    if (!this.visibleDashboardLayers.length) {
      this.selectedMain = 'TOTAL';
      this.cdr.detectChanges();
      return;
    }

    const calls: Record<string, any> = {};
    this.visibleDashboardLayers.forEach((layer) => {
      const perStatusCalls: any = {};
      types.forEach((type) => {
        perStatusCalls[type] = layer.call(type, allIndia);
      });
      calls[layer.layerKey] = forkJoin(perStatusCalls);
    });

    forkJoin(calls).subscribe({
      next: (res: any) => {
        types.forEach((type) => {
          this.visibleDashboardLayers.forEach((layer) => {
            this.setSubCard(type, layer.title, Number(res?.[layer.layerKey]?.[type]?.count || 0));
          });
        });
        this.selectedMain = 'TOTAL';
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Dashboard load failed', err),
    });
  }

  private setSubCard(type: CardType, title: string, value: number): void {
    this.subCardMap = {
      ...this.subCardMap,
      [type]: this.subCardMap[type].map((c) => (c.title === title ? { ...c, value } : c)),
    };
    this.updateMain(type);
  }

  private updateMain(type: CardType): void {
    const sum = this.subCardMap[type].reduce((a, b) => a + b.value, 0);
    this.mainCards = this.mainCards.map((c) => (c.key === type ? { ...c, value: sum } : c));
  }

  onMainCardClick(key: CardType): void {
    this.selectedMain = key;
  }

  get activeSubCards(): SubCard[] {
    return this.subCardMap[this.selectedMain];
  }

  get activeColor(): string | undefined {
    return this.mainCards.find((c) => c.key === this.selectedMain)?.color;
  }

  private emptySubCards(statusKey: string): SubCard[] {
    return this.visibleDashboardLayers.map((layer) => ({
      title: layer.title,
      value: 0,
      layerKey: layer.layerKey,
      statusKey,
    }));
  }

  private isMakerDashboard(): boolean {
    return (this.currentUser.getSnapshot()?.user_type || '').trim().toLowerCase() === 'maker';
  }

  private applyVisibleDashboardLayers(layers: DashboardLayerConfig[]): void {
    this.visibleDashboardLayers = [...layers];
    const types: CardType[] = ['TOTAL', 'MAKER', 'CHECKER', 'APPROVER', 'FINALIZED'];
    const nextSubCardMap = types.reduce((acc, type) => {
      acc[type] = this.emptySubCards(type);
      return acc;
    }, {} as Record<CardType, SubCard[]>);

    this.subCardMap = nextSubCardMap;
    this.mainCards = this.mainCards.map((card) => ({ ...card, value: 0 }));
  }

  private getAllDashboardLayers(): DashboardLayerConfig[] {
    return [
      { title: 'KM Post', layerKey: 'km_post', call: (type, allIndia) => this.api.getKmPostCount(type, allIndia) },
      { title: 'Road Over Bridge', layerKey: 'road_over_bridge', call: (type, allIndia) => this.api.getRoadOverBridgeCount(type, allIndia) },
      { title: 'Rail Over Rail', layerKey: 'ror', call: (type, allIndia) => this.api.getRorCount(type, allIndia) },
      { title: 'Road Under Bridge', layerKey: 'rub_lhs', call: (type, allIndia) => this.api.getRubLhsCount(type, allIndia) },
      { title: 'Station', layerKey: 'stations', call: (type, allIndia) => this.api.getStationCount(type, allIndia) },
      { title: 'Level Xing', layerKey: 'levelxing', call: (type, allIndia) => this.api.getLevelXingCount(type, allIndia) },
      { title: 'Bridge Start', layerKey: 'bridge_start', call: (type, allIndia) => this.api.getBridgeStartCount(type, allIndia) },
      { title: 'Bridge End', layerKey: 'bridge_end', call: (type, allIndia) => this.api.getBridgeStopCount(type, allIndia) },
      { title: 'Bridge Minor', layerKey: 'bridge_minor', call: (type, allIndia) => this.api.getBridgeMinorCount(type, allIndia) },
      { title: 'Land Plan Ontrack', layerKey: 'landplan_ontrack', call: (type, allIndia) => this.api.getLandPlanCount(type, allIndia) },
    ];
  }

  private toDashboardLayerKey(layerId: any, layerName: any): EditableLayerKey | null {
    const candidates = [
      normalizeCivilEngineeringLayerId(String(layerId || '')),
      normalizeCivilEngineeringLayerId(String(layerName || '')),
    ];

    for (const candidate of candidates) {
      if (candidate === 'station') return 'stations';
      if (candidate === 'stations') return 'stations';
      if (candidate === 'km_post') return 'km_post';
      if (candidate === 'landplan_ontrack' || candidate === 'land_plan_ontrack' || candidate === 'land_plan_on_track') return 'landplan_ontrack';
      if (candidate === 'bridge_start') return 'bridge_start';
      if (candidate === 'bridge_end') return 'bridge_end';
      if (candidate === 'bridge_minor') return 'bridge_minor';
      if (candidate === 'levelxing' || candidate === 'level_xing') return 'levelxing';
      if (candidate === 'road_over_bridge' || candidate === 'rob') return 'road_over_bridge';
      if (candidate === 'road_under_bridge' || candidate === 'rub_lhs' || candidate === 'rub') return 'rub_lhs';
      if (candidate === 'rail_over_rail' || candidate === 'ror') return 'ror';
    }

    return null;
  }

  private getEditRouteLayer(layerKey: string): string | null {
    if (!layerKey) return null;
    return normalizeCivilEngineeringLayerId(layerKey);
  }
}
