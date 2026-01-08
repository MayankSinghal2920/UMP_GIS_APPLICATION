import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';


@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.css',
})
export class DashboardHome {
   // MAIN CARDS
  mainCards = [
    { title: 'TOTAL', value: 3384 },
    { title: 'MAKER', value: 100 },
    { title: 'CHECKER', value: 26 },
    { title: 'APPROVER', value: 0 },
    { title: 'FINALIZED', value: 3258 },
  ];

  // SUB CARDS
  subCards = [
    { title: 'KM Post', value: 1911 },
    { title: 'Road Over Bridge', value: 178 },
    { title: 'Rail Over Rail', value: 21 },
    { title: 'Road Under Bridge', value: 514 },
    { title: 'Station', value: 235 },
    { title: 'Level Xing', value: 408 },
    { title: 'Land Parcel', value: 113 },
    { title: 'Land Plan Offtrack', value: 4 },
  ];

}
