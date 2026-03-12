import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormSpeaker } from './form-speaker';

describe('FormSpeaker', () => {
  let component: FormSpeaker;
  let fixture: ComponentFixture<FormSpeaker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSpeaker],
    }).compileComponents();

    fixture = TestBed.createComponent(FormSpeaker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
