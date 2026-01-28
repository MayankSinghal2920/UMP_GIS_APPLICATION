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
    private cdr: ChangeDetectorRef   // 🔑 IMPORTANT
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  /* ================= LOAD EVERYTHING TOGETHER ================= */
  private loadDashboard(): void {

    const stationCalls = {
      TOTAL: this.api.getStationCount('TOTAL'),
      MAKER: this.api.getStationCount('MAKER'),
      CHECKER: this.api.getStationCount('CHECKER'),
      APPROVER: this.api.getStationCount('APPROVER'),
      FINALIZED: this.api.getStationCount('FINALIZED'),
    };

    forkJoin({
      stations: forkJoin(stationCalls),
      landPlan: this.api.getLandPlanOntrack(0),
    }).subscribe({
      next: ({ stations, landPlan }) => {

        /* ---------- STATIONS ---------- */
        (Object.keys(stations) as CardType[]).forEach(type => {
          this.setSubCard(type, 'Station', stations[type].count);
        });

        /* ---------- LAND PLAN ON TRACK ---------- */
        const features = landPlan?.features ?? [];

        const lpCounts: Record<CardType, number> = {
          TOTAL: features.length,
          MAKER: features.filter((f: any) => f.properties?.status === 'Sent to Maker').length,
          CHECKER: features.filter((f: any) => f.properties?.status === 'Sent to Checker').length,
          APPROVER: features.filter((f: any) => f.properties?.status === 'Sent to Approver').length,
          FINALIZED: features.filter((f: any) => f.properties?.status === 'Approved').length,
        };

        (Object.keys(lpCounts) as CardType[]).forEach(type => {
          this.setSubCard(type, 'Land Plan Ontrack', lpCounts[type]);
        });

        /* ---------- FORCE RENDER ---------- */
        this.selectedMain = 'TOTAL';
        this.cdr.detectChanges();   // 🔥 THIS FIXES REFRESH

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
      { title: 'Land Parcel', value: 0 },
      { title: 'Land Plan Ontrack', value: 0 },
    ];
  }
}
