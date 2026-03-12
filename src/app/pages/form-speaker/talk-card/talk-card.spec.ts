import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TalkCard } from './talk-card';

describe('TalkCard', () => {
  let component: TalkCard;
  let fixture: ComponentFixture<TalkCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TalkCard],
    }).compileComponents();

    fixture = TestBed.createComponent(TalkCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
