import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormSubmitSuccess } from './form-submit-success';

describe('FormSubmitSuccess', () => {
  let component: FormSubmitSuccess;
  let fixture: ComponentFixture<FormSubmitSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSubmitSuccess],
    }).compileComponents();

    fixture = TestBed.createComponent(FormSubmitSuccess);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
