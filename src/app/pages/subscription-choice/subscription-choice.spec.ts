import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubscriptionChoice } from './subscription-choice';

describe('SubscriptionChoice', () => {
  let component: SubscriptionChoice;
  let fixture: ComponentFixture<SubscriptionChoice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubscriptionChoice],
    }).compileComponents();

    fixture = TestBed.createComponent(SubscriptionChoice);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
