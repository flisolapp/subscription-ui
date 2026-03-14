import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EditionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getCurrentEdition(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/editions/active`).pipe(
      map((response) => response.data),
      catchError((error: HttpErrorResponse) => {
        console.error('Failed to fetch current edition:', error);
        return throwError(() => new Error('Failed to fetch current edition'));
      }),
    );
  }
}
