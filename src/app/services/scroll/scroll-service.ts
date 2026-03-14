import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ScrollService {
  public static toTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}
