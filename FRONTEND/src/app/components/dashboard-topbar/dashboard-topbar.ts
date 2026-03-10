import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Api } from 'src/app/api/api';

import { Auth } from 'src/app/services/auth';
import { SidebarState } from 'src/app/services/sidebar-state';

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-topbar.html',
  styleUrl: './dashboard-topbar.css',
})
export class DashboardTopbar implements OnInit, OnDestroy {
  private readonly LAST_RATING_CACHE_KEY = 'last_rating_at';
  private readonly RATING_DUE_DAYS = 30;

  userName = 'User';
  profileImage = 'assets/images/user.png';
  showMenu = false;

  stars = [1, 2, 3, 4, 5];
  showModal = false;
  selectedRating = 0;
  message = '';
  user_id = '';

  collapsed$!: Observable<boolean>;

  constructor(
    private auth: Auth,
    private router: Router,
    private sidebarState: SidebarState,
    private api: Api,
  ) {
    this.userName = localStorage.getItem('user_name') || 'User';
    this.collapsed$ = this.sidebarState.collapsed$;
    this.user_id = localStorage.getItem('user_id') || '';
  }

  ngOnInit(): void {
    this.primeRatingCache();
  }

  toggleSidebar() {
    this.sidebarState.toggle();
  }

  toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + this.userName;
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  openModal() {
    this.showModal = true;
  }

  ngOnDestroy(): void {
    this.showModal = false;
  }

  closeModal() {
    this.selectedRating = 0;
    this.message = '';
    this.showModal = false;
    // this.logout();
    // this.openLogoutModal()
    // this.router.navigate(['/dashboard']); // remove query param after closing
  }

  // ============================================= rating apis ====================================================

  setRating(rating: number) {
    this.selectedRating = rating;
  }

  checkRatingBeforeLogout() {
    if (!this.user_id) {
      this.logout();
      return;
    }

    const cachedLastRatingAt = this.getCachedLastRatingAt();
    if (cachedLastRatingAt && !this.isRatingDue(cachedLastRatingAt)) {
      this.logout();
      return;
    }

    if (this.ratingData?.created_at && !this.isRatingDue(this.ratingData.created_at)) {
      this.setCachedLastRatingAt(this.ratingData.created_at);
      this.logout();
      return;
    }

    this.openModal();
  }

  addRating() {
    const user_id = (localStorage.getItem('user_id') || '').trim();
    const user_name = (localStorage.getItem('user_name') || '').trim();
    const railway = (localStorage.getItem('railway') || '').trim();
    const division = (localStorage.getItem('division') || '').trim();

    if (!user_id || !user_name || !railway || !division) {
      console.error('Missing user details in localStorage for rating submit');
      return;
    }

    const data = {
      rating: this.selectedRating,
      comment: this.message,
      user_id,
      user_name,
      railway,
      division,
    };
    this.api.rating(data).subscribe({
      next: (res: any) => {
        console.log('here is res from rating', res);
        const createdAt = res?.data?.created_at || new Date().toISOString();
        this.setCachedLastRatingAt(createdAt);
        this.closeModal();
        this.logout();
      },
      error: (err) => {
        console.error('Error adding rating', err);
      },
    });
  }

  ratingData: any;

  private primeRatingCache() {
    if (!this.user_id) return;

    const data = {
      user_id: this.user_id,
    };

    this.api.getRating(data).subscribe({
      next: (res: any) => {
        this.ratingData = res?.data || null;
        if (this.ratingData?.created_at) {
          this.setCachedLastRatingAt(this.ratingData.created_at);
        }
      },
      error: () => {
        // Keep logout flow fast even if rating-read API fails.
      },
    });
  }

  private getCachedLastRatingAt(): string {
    return (localStorage.getItem(this.LAST_RATING_CACHE_KEY) || '').trim();
  }

  private setCachedLastRatingAt(value: string) {
    if (!value) return;
    localStorage.setItem(this.LAST_RATING_CACHE_KEY, value);
  }

  private isRatingDue(lastRatedAt: string): boolean {
    const parsed = new Date(lastRatedAt);
    if (Number.isNaN(parsed.getTime())) return true;

    const now = new Date();
    const diffInDays = (now.getTime() - parsed.getTime()) / (1000 * 3600 * 24);
    return diffInDays > this.RATING_DUE_DAYS;
  }

  // getRatingList() {
  //   let data={
  //     user_id: this.user_id
  //   }
  //   this.api.getRating(data).subscribe({
  //     next: (res: any) => {
  //       this.ratingData = res.data; // ✅ Ensure you're using res.data
  //       console.log('here is rating list', this.ratingData);

  //       if (!this.ratingData) {
  //         //  No previous rating → open modal
  //         this.openModal();
  //         // return;
  //         // this.logout()
  //         console.log('need to open model');
          
  //       }

  //       const lastRated = new Date(this.ratingData?.created_at);
  //       const now = new Date();

  //       const diffInDays = (now.getTime() - lastRated.getTime()) / (1000 * 3600 * 24);

  //       if (diffInDays > 30) {
  //         //  More than a month ago → open modal
  //         this.openModal();
  //       } else if (!this.showModal) {
  //         // this.openLogoutModal()
  //         console.log('here need log out');
          
  //         console.log(`Last rating given ${Math.floor(diffInDays)} days ago. Modal not opened.`);
  //       }
  //     },
  //     error: (err) => {
  //       console.error('Error fetching last rating', err);
  //     },
  //   });
  // }

  getRatingList() {
    if (!this.user_id) {
      this.logout();
      return;
    }

    const data = {
      user_id: this.user_id,
    };

    this.api.getRating(data).subscribe({
      next: (res: any) => {
        this.ratingData = res?.data || null;

        // No rating found
        if (!this.ratingData) {
          this.openModal();
          return;
        }

        const lastRated = new Date(this.ratingData.created_at);
        const now = new Date();
        const diffInDays = (now.getTime() - lastRated.getTime()) / (1000 * 3600 * 24);

        if (diffInDays > 30) this.openModal();
        else this.logout();
      },
      error: (err) => {
        console.error('Error fetching rating', err);
        this.logout();
      },
    });
  }
}
