import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome {

  /* ================= ACTIVE MAIN CARD ================= */
  selectedMain = 'TOTAL';

  /* ================= MAIN CARDS ================= */
  mainCards = [
    { key: 'TOTAL', title: 'TOTAL', value: 3384, color: 'blue' },
    { key: 'MAKER', title: 'MAKER', value: 100, color: 'pink' },
    { key: 'CHECKER', title: 'CHECKER', value: 26, color: 'green' },
    { key: 'APPROVER', title: 'APPROVER', value: 0, color: 'yellow' },
    { key: 'FINALIZED', title: 'FINALIZED', value: 3258, color: 'teal' },
  ];

  /* ================= SUB CARD DATA (8 EACH) ================= */
  subCardMap: Record<string, any[]> = {
    TOTAL: [
      { title: 'KM Post', value: 1911 },
      { title: 'Road Over Bridge', value: 178 },
      { title: 'Rail Over Rail', value: 21 },
      { title: 'Road Under Bridge', value: 514 },
      { title: 'Station', value: 235 },
      { title: 'Level Xing', value: 408 },
      { title: 'Land Parcel', value: 113 },
      { title: 'Land Plan Offtrack', value: 4 },
    ],

    MAKER: [
      { title: 'KM Post', value: 40 },
      { title: 'Road Over Bridge', value: 10 },
      { title: 'Rail Over Rail', value: 5 },
      { title: 'Road Under Bridge', value: 45 },
      { title: 'Station', value: 20 },
      { title: 'Level Xing', value: 18 },
      { title: 'Land Parcel', value: 2 },
      { title: 'Land Plan Offtrack', value: 0 },
    ],

    CHECKER: [
      { title: 'KM Post', value: 15 },
      { title: 'Road Over Bridge', value: 6 },
      { title: 'Rail Over Rail', value: 2 },
      { title: 'Road Under Bridge', value: 3 },
      { title: 'Station', value: 8 },
      { title: 'Level Xing', value: 12 },
      { title: 'Land Parcel', value: 1 },
      { title: 'Land Plan Offtrack', value: 0 },
    ],

    APPROVER: [
      { title: 'KM Post', value: 0 },
      { title: 'Road Over Bridge', value: 0 },
      { title: 'Rail Over Rail', value: 0 },
      { title: 'Road Under Bridge', value: 0 },
      { title: 'Station', value: 0 },
      { title: 'Level Xing', value: 0 },
      { title: 'Land Parcel', value: 0 },
      { title: 'Land Plan Offtrack', value: 0 },
    ],

    FINALIZED: [
      { title: 'KM Post', value: 1856 },
      { title: 'Road Over Bridge', value: 162 },
      { title: 'Rail Over Rail', value: 19 },
      { title: 'Road Under Bridge', value: 501 },
      { title: 'Station', value: 207 },
      { title: 'Level Xing', value: 390 },
      { title: 'Land Parcel', value: 110 },
      { title: 'Land Plan Offtrack', value: 4 },
    ],
  };

  /* ================= GETTERS ================= */
  get activeSubCards() {
    return this.subCardMap[this.selectedMain] || [];
  }

  get activeColor() {
    return this.mainCards.find(c => c.key === this.selectedMain)?.color;
  }

  /* ================= ACTION ================= */
  selectMain(key: string) {
    this.selectedMain = key;
  }
}
