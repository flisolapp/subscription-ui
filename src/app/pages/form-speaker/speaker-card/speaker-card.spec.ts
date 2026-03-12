import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpeakerCard } from './speaker-card';

describe('SpeakerCard', () => {
  let component: SpeakerCard;
  let fixture: ComponentFixture<SpeakerCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeakerCard],
    }).compileComponents();

    fixture = TestBed.createComponent(SpeakerCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
