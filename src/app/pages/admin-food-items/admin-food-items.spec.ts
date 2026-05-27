import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminFoodItems } from './admin-food-items';

describe('AdminFoodItems', () => {
  let component: AdminFoodItems;
  let fixture: ComponentFixture<AdminFoodItems>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFoodItems],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFoodItems);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
