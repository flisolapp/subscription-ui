import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormParticipant } from './form-participant';

describe('FormParticipant', () => {
  let component: FormParticipant;
  let fixture: ComponentFixture<FormParticipant>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormParticipant],
    }).compileComponents();

    fixture = TestBed.createComponent(FormParticipant);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
