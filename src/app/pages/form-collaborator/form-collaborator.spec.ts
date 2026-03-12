import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormCollaborator } from './form-collaborator';

describe('FormCollaborator', () => {
  let component: FormCollaborator;
  let fixture: ComponentFixture<FormCollaborator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormCollaborator],
    }).compileComponents();

    fixture = TestBed.createComponent(FormCollaborator);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
