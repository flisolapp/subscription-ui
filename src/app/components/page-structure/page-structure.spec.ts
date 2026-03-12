import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { PageStructure } from './page-structure';
import packageInfo from '../../../../package.json';

describe('PageStructure', () => {
  let component: PageStructure;
  let fixture: ComponentFixture<PageStructure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageStructure],
      providers: [provideZonelessChangeDetection()],
    })
      .overrideComponent(PageStructure, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(PageStructure);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeDefined();
  });

  it('should have version set from package.json', () => {
    expect(component.version()).toBe(packageInfo.version);
  });
});
