import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRestaurants } from './admin-restaurants';

describe('AdminRestaurants', () => {
  let component: AdminRestaurants;
  let fixture: ComponentFixture<AdminRestaurants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRestaurants],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRestaurants);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
