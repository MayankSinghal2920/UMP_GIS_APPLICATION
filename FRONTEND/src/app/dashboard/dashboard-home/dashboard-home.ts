import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Api } from 'src/app/services/api';

type CardType = 'TOTAL' | 'MAKER' | 'CHECKER' | 'APPROVER' | 'FINALIZED';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome implements OnInit {

  selectedMain: CardType = 'TOTAL';

  /* ================= MAIN CARDS ================= */
  mainCards: { key: CardType; title: string; value: number; color: string }[] = [
    { key: 'TOTAL', title: 'TOTAL', value: 0, color: 'blue' },
    { key: 'MAKER', title: 'MAKER', value: 0, color: 'pink' },
    { key: 'CHECKER', title: 'CHECKER', value: 0, color: 'green' },
    { key: 'APPROVER', title: 'APPROVER', value: 0, color: 'yellow' },
    { key: 'FINALIZED', title: 'FINALIZED', value: 0, color: 'teal' },
  ];

  /* ================= SUB CARDS ================= */
  subCardMap: Record<CardType, any[]> = {
    TOTAL: this.createEmptySubCards(),
    MAKER: this.createEmptySubCards(),
    CHECKER: this.createEmptySubCards(),
    APPROVER: this.createEmptySubCards(),
    FINALIZED: this.createEmptySubCards(),
  };

  constructor(private api: Api) {}

  /* ================= INIT ================= */
  ngOnInit(): void {
    this.preloadStationCounts();
  }

  /* ================= PRELOAD STATION COUNTS ================= */
  private preloadStationCounts(): void {
    const types: CardType[] = [
      'TOTAL',
      'MAKER',
      'CHECKER',
      'APPROVER',
      'FINALIZED',
    ];

    types.forEach(type => {
      this.api.getStationCount(type).subscribe({
        next: (res) => {
          // update Station subcard
          const updatedSubCards = this.subCardMap[type].map(card =>
            card.title === 'Station'
              ? { ...card, value: res.count }
              : card
          );

          this.subCardMap = {
            ...this.subCardMap,
            [type]: updatedSubCards
          };

          // update main card total
          this.updateMainCardValue(type);

          // 🔥 CRITICAL FIX: force initial TOTAL render
          if (type === 'TOTAL') {
            this.selectedMain = 'TOTAL';
          }
        },
        error: (err) => {
          console.error(`❌ Failed to load station count for ${type}`, err);
        }
      });
    });
  }

  /* ================= MAIN CARD TOTAL ================= */
  private updateMainCardValue(type: CardType): void {
    const total = this.subCardMap[type].reduce(
      (sum, card) => sum + (Number(card.value) || 0),
      0
    );

    this.mainCards = this.mainCards.map(card =>
      card.key === type
        ? { ...card, value: total }
        : card
    );
  }

  /* ================= UI ================= */
  selectMain(key: CardType): void {
    this.selectedMain = key;
  }

  get activeSubCards() {
    return this.subCardMap[this.selectedMain];
  }

  get activeColor() {
    return this.mainCards.find(c => c.key === this.selectedMain)?.color;
  }

  /* ================= HELPERS ================= */
  private createEmptySubCards() {
    return [
      { title: 'KM Post', value: 0 },
      { title: 'Road Over Bridge', value: 0 },
      { title: 'Rail Over Rail', value: 0 },
      { title: 'Road Under Bridge', value: 0 },
      { title: 'Station', value: 0 },
      { title: 'Level Xing', value: 0 },
      { title: 'Land Parcel', value: 0 },
      { title: 'Land Plan Offtrack', value: 0 },
    ];
  }
}
