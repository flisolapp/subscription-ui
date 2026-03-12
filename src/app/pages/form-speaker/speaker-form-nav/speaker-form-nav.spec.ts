import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeakerFormNav } from './speaker-form-nav';

describe('SpeakerFormNav', () => {
  let component: SpeakerFormNav;
  let fixture: ComponentFixture<SpeakerFormNav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeakerFormNav],
    }).compileComponents();

    fixture = TestBed.createComponent(SpeakerFormNav);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
