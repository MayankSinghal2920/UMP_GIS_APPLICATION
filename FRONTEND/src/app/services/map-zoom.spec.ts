import { TestBed } from '@angular/core/testing';

import { MapZoom } from './map-zoom';

describe('MapZoom', () => {
  let service: MapZoom;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapZoom);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
