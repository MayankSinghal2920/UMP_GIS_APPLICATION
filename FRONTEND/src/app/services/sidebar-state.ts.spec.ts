import { TestBed } from '@angular/core/testing';

import { SidebarStateTs } from './sidebar-state.ts';

describe('SidebarStateTs', () => {
  let service: SidebarStateTs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarStateTs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
