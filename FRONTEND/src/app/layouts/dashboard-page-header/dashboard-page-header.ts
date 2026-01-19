import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-page-header.html',
  styleUrl: './dashboard-page-header.css'
})
export class DashboardPageHeader implements OnInit {

  title = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.title = this.resolveTitle(this.route);
      });
  }

  private resolveTitle(route: ActivatedRoute): string {
    let current = route.firstChild;
    while (current?.firstChild) {
      current = current.firstChild;
    }
    return current?.snapshot.data['title'] ?? '';
  }
}
