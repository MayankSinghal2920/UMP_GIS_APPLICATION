import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Api } from 'src/app/services/api';

type CardType = 'TOTAL' | 'MAKER' | 'CHECKER' | 'APPROVER' | 'FINALIZED';

interface MainCard {
  key: CardType;
  title: string;
  value: number;
  color: string;
}

interface SubCard {
  title: string;
  value: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {

  selectedMain: CardType = 'TOTAL';

  mainCards: MainCard[] = [
    { key: 'TOTAL', title: 'TOTAL', value: 0, color: 'blue' },
    { key: 'MAKER', title: 'MAKER', value: 0, color: 'pink' },
    { key: 'CHECKER', title: 'CHECKER', value: 0, color: 'green' },
    { key: 'APPROVER', title: 'APPROVER', value: 0, color: 'yellow' },
    { key: 'FINALIZED', title: 'FINALIZED', value: 0, color: 'teal' },
  ];

  subCardMap: Record<CardType, SubCard[]> = {
    TOTAL: this.emptySubCards(),
    MAKER: this.emptySubCards(),
    CHECKER: this.emptySubCards(),
    APPROVER: this.emptySubCards(),
    FINALIZED: this.emptySubCards(),
  };

  constructor(
    private api: Api,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  /* ================= LOAD DASHBOARD ================= */
  private loadDashboard(): void {

    const types: CardType[] = ['TOTAL', 'MAKER', 'CHECKER', 'APPROVER', 'FINALIZED'];

    const stationCalls: any = {};
    const bridgeStartCalls: any = {};
    const bridgeStopCalls: any = {};
    const bridgeMinorCalls: any = {};
    const levelXingCalls: any = {};
    const robCalls: any = {};
    const rubLhsCalls: any = {};
    const rorCalls: any = {};

    types.forEach(type => {
      stationCalls[type]     = this.api.getStationCount(type);
      bridgeStartCalls[type] = this.api.getBridgeStartCount(type);
      bridgeStopCalls[type]  = this.api.getBridgeStopCount(type);
      bridgeMinorCalls[type] = this.api.getBridgeMinorCount(type);
      levelXingCalls[type]   = this.api.getLevelXingCount(type);
      robCalls[type]         = this.api.getRoadOverBridgeCount(type);
      rubLhsCalls[type]      = this.api.getRubLhsCount(type);
      rorCalls[type]         = this.api.getRorCount(type);
    });

    forkJoin({
      stations:     forkJoin(stationCalls),
      bridgeStart:  forkJoin(bridgeStartCalls),
      bridgeStop:   forkJoin(bridgeStopCalls),
      bridgeMinor:  forkJoin(bridgeMinorCalls),
      levelXing:    forkJoin(levelXingCalls),
      rob:          forkJoin(robCalls),
      rubLhs:       forkJoin(rubLhsCalls),
      ror:          forkJoin(rorCalls),
      landPlan:     this.api.getLandPlanOntrack(0),
      kmPosts:      this.api.getkmposts('68,6,97,37'),
    }).subscribe({
      next: (res: any) => {

        types.forEach(type => {
          this.setSubCard(type, 'Station',        res.stations[type].count);
          this.setSubCard(type, 'Bridge Start',   res.bridgeStart[type].count);
          this.setSubCard(type, 'Bridge Stop',    res.bridgeStop[type].count);
          this.setSubCard(type, 'Bridge Minor',   res.bridgeMinor[type].count);
          this.setSubCard(type, 'Level Xing',     res.levelXing[type].count);
          this.setSubCard(type, 'Road Over Bridge', res.rob[type].count);
          this.setSubCard(type, 'Road Under Bridge', res.rubLhs[type].count);
          this.setSubCard(type, 'Rail Over Rail', res.ror[type].count);
        });

        /* ---------- LAND PLAN ON TRACK ---------- */
        const lp = res.landPlan?.features ?? [];
        const lpCounts: Record<CardType, number> = {
          TOTAL: lp.length,
          MAKER: lp.filter((f: any) => f.properties?.status === 'Sent to Maker').length,
          CHECKER: lp.filter((f: any) => f.properties?.status === 'Sent to Checker').length,
          APPROVER: lp.filter((f: any) => f.properties?.status === 'Sent to Approver').length,
          FINALIZED: lp.filter((f: any) => f.properties?.status === 'Approved').length,
        };

        types.forEach(type =>
          this.setSubCard(type, 'Land Plan Ontrack', lpCounts[type])
        );

        /* ---------- KM POSTS ---------- */
        const km = res.kmPosts?.features ?? [];
        const kmCounts: Record<CardType, number> = {
          TOTAL: km.length,
          MAKER: km.filter((f: any) => f.properties?.status === 'Sent to Maker').length,
          CHECKER: km.filter((f: any) => f.properties?.status === 'Sent to Checker').length,
          APPROVER: km.filter((f: any) => f.properties?.status === 'Sent to Approver').length,
          FINALIZED: km.filter((f: any) => f.properties?.status === 'Approved').length,
        };

        types.forEach(type =>
          this.setSubCard(type, 'KM Post', kmCounts[type])
        );

        this.selectedMain = 'TOTAL';
        this.cdr.detectChanges();
      },
      error: err => console.error('❌ Dashboard load failed', err)
    });
  }

  /* ================= HELPERS ================= */
  private setSubCard(type: CardType, title: string, value: number): void {
    this.subCardMap = {
      ...this.subCardMap,
      [type]: this.subCardMap[type].map(c =>
        c.title === title ? { ...c, value } : c
      )
    };
    this.updateMain(type);
  }

  private updateMain(type: CardType): void {
    const sum = this.subCardMap[type].reduce((a, b) => a + b.value, 0);
    this.mainCards = this.mainCards.map(c =>
      c.key === type ? { ...c, value: sum } : c
    );
  }

  onMainCardClick(key: CardType): void {
    this.selectedMain = key;
  }

  get activeSubCards(): SubCard[] {
    return this.subCardMap[this.selectedMain];
  }

  get activeColor(): string | undefined {
    return this.mainCards.find(c => c.key === this.selectedMain)?.color;
  }

  private emptySubCards(): SubCard[] {
    return [
      { title: 'KM Post', value: 0 },
      { title: 'Road Over Bridge', value: 0 },
      { title: 'Rail Over Rail', value: 0 },
      { title: 'Road Under Bridge', value: 0 },
      { title: 'Station', value: 0 },
      { title: 'Level Xing', value: 0 },
      { title: 'Bridge Start', value: 0 },
      { title: 'Bridge Stop', value: 0 },
      { title: 'Bridge Minor', value: 0 },
      { title: 'Land Plan Ontrack', value: 0 },
    ];
  }
}
