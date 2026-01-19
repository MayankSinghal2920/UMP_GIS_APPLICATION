import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPageHeader } from './dashboard-page-header';

describe('DashboardPageHeader', () => {
  let component: DashboardPageHeader;
  let fixture: ComponentFixture<DashboardPageHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPageHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPageHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
