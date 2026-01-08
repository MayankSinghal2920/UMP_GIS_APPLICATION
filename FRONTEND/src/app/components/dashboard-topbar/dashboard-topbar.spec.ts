import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardTopbar } from './dashboard-topbar';

describe('DashboardTopbar', () => {
  let component: DashboardTopbar;
  let fixture: ComponentFixture<DashboardTopbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardTopbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardTopbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
