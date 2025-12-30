import { TestBed } from '@angular/core/testing';

import { AttributeTable } from './attribute-table';

describe('AttributeTable', () => {
  let service: AttributeTable;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AttributeTable);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
