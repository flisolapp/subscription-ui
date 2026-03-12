import { Injectable } from '@angular/core';
import { Platform } from '@angular/cdk/platform';

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  constructor(private platform: Platform) {}

  public isDesktop(): boolean {
    return !(this.platform.ANDROID || this.platform.IOS);
  }

  public isMobile(): boolean {
    return this.platform.ANDROID || this.platform.IOS;
  }
}
