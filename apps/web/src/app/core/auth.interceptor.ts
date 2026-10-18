import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const outgoing = token && request.url.startsWith('/api/') && !request.url.endsWith('/auth/login')
    ? request.clone({setHeaders: {Authorization:`Bearer ${token}`}}) : request;
  return next(outgoing).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && !request.url.endsWith('/auth/login')) auth.logout();
    return throwError(() => error);
  }));
};
