import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Sentry Error Interceptor
 *
 * Kurulum:
 * 1. `pnpm add @sentry/node` (backend'e)
 * 2. main.ts'de Sentry.init() çağır
 * 3. Bu interceptor'ı global olarak ekle
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap({
        error: (error) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Sentry = require('@sentry/node');
            const request = context.switchToHttp().getRequest();
            Sentry.withScope(
              (scope: {
                setExtra: (k: string, v: unknown) => void;
                setUser: (u: { id?: string }) => void;
              }) => {
                scope.setExtra('url', request.url);
                scope.setExtra('method', request.method);
                scope.setUser({ id: request.user?.id });
                Sentry.captureException(error);
              },
            );
          } catch {
            // @sentry/node yüklü değilse sessizce geç
          }
        },
      }),
    );
  }
}
