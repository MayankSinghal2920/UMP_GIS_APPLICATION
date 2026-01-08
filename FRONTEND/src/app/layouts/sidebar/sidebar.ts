import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';


@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
   collapsed = false;

  constructor(private router: Router) {}

  toggle() {
    this.collapsed = !this.collapsed;
  }

  go(path: string) {
    this.router.navigateByUrl(path);
  }

}
