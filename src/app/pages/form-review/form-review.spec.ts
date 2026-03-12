import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormReview } from './form-review';

describe('FormReview', () => {
  let component: FormReview;
  let fixture: ComponentFixture<FormReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormReview],
    }).compileComponents();

    fixture = TestBed.createComponent(FormReview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
