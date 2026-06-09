import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = sessionStorage.getItem('token');
  const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/register');
  const isPublicGet =
    req.method === 'GET'
    && (
      req.url.includes('/publicconfig')
      || req.url.includes('/restaurants')
      || req.url.includes('/fooditems/restaurant/')
    );

  if (token && !isAuthRequest && !isPublicGet) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(clonedRequest);
  }

  return next(req);
};
