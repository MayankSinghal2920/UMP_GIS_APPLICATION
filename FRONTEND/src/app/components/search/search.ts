import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import {
  StationFeature,
  StationSearchResult,
  StationService,
} from '../../services/station.service';

type ButtonMode = 'text' | 'icon';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class SearchComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search...';
  @Input() buttonLabel = 'Search';
  @Input() disabled = false;
  @Input() query = '';
  @Input() buttonMode: ButtonMode = 'text';
  @Input() stationSearch = false;
  @Input() maxResults = 10;

  @Output() queryChange = new EventEmitter<string>();
  @Output() search = new EventEmitter<string>();
  @Output() cleared = new EventEmitter<void>();
  @Output() stationSelected = new EventEmitter<StationFeature>();

  searchResults: StationSearchResult[] = [];
  showResults = false;
  isLoading = false;
  selectedIndex = -1;

  private readonly destroy$ = new Subject<void>();
  private readonly queryInput$ = new Subject<string>();

  constructor(private stationService: StationService) {}

  ngOnInit(): void {
    this.queryInput$
      .pipe(
        debounceTime(150),
        map((value) => String(value || '').trim()),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((value) => {
        void this.handleStationQuery(value);
      });

    if (this.stationSearch) {
      void this.stationService.ensureLoaded();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onQueryChange(value: string): void {
    this.query = String(value || '');
    this.queryChange.emit(this.query);

    if (this.stationSearch) {
      this.queryInput$.next(this.query);
    }
  }

  async onFocus(): Promise<void> {
    if (!this.stationSearch) return;
    const value = String(this.query || '').trim();
    if (!value) return;
    await this.handleStationQuery(value);
  }

  submit(): void {
    if (this.disabled) return;

    const normalized = String(this.query || '').trim();

    if (this.stationSearch && this.searchResults.length > 0) {
      const nextIndex = this.selectedIndex >= 0 ? this.selectedIndex : 0;
      const match = this.searchResults[nextIndex];
      if (match) {
        this.selectStation(match);
        return;
      }
    }

    this.search.emit(normalized);
  }

  clear(): void {
    if (!this.query && !this.searchResults.length) return;
    this.query = '';
    this.searchResults = [];
    this.showResults = false;
    this.selectedIndex = -1;
    this.queryChange.emit('');
    this.cleared.emit();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.stationSearch || !this.showResults || !this.searchResults.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.searchResults.length - 1);
        this.scrollToSelected();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.scrollToSelected();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedIndex >= 0 && this.searchResults[this.selectedIndex]) {
          this.selectStation(this.searchResults[this.selectedIndex]);
        } else if (this.searchResults[0]) {
          this.selectStation(this.searchResults[0]);
        }
        break;
      case 'Escape':
        this.showResults = false;
        this.selectedIndex = -1;
        break;
    }
  }

  closeResults(): void {
    if (!this.stationSearch) return;
    setTimeout(() => {
      this.showResults = false;
      this.selectedIndex = -1;
    }, 180);
  }

  selectStation(result: StationSearchResult): void {
    const display = this.stationService.getDisplayValue(result.station);
    this.query = display;
    this.queryChange.emit(display);
    this.search.emit(display);
    this.stationSelected.emit(result.station);
    this.searchResults = [];
    this.showResults = false;
    this.selectedIndex = -1;
  }

  getStationName(result: StationSearchResult): string {
    return this.stationService.getStationName(result.station);
  }

  getStationCode(result: StationSearchResult): string {
    return this.stationService.getStationCode(result.station);
  }

  getStationLocation(result: StationSearchResult): string {
    return this.stationService.getStationLocation(result.station);
  }

  trackResult(index: number, result: StationSearchResult): string {
    return this.getStationCode(result) || this.getStationName(result) || String(index);
  }

  private async handleStationQuery(query: string): Promise<void> {
    if (!this.stationSearch) return;

    if (!query) {
      this.searchResults = [];
      this.showResults = false;
      this.selectedIndex = -1;
      return;
    }

    this.isLoading = true;
    try {
      await this.stationService.ensureLoaded();
      this.searchResults = this.stationService.searchStations(query, this.maxResults);
      this.showResults = true;
      this.selectedIndex = this.searchResults.length ? 0 : -1;
    } finally {
      this.isLoading = false;
    }
  }

  private scrollToSelected(): void {
    setTimeout(() => {
      const selected = document.querySelector('.station-result-item.selected');
      selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 0);
  }
}


