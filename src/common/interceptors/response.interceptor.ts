import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T> | unknown> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T> | unknown> {
    const req = context.switchToHttp().getRequest<{ url?: string }>();
    // Allow binary file downloads to bypass JSON wrapping
    if (req?.url?.includes('/download')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown) => {
        if (
          payload !== null &&
          typeof payload === 'object' &&
          'success' in (payload as Record<string, unknown>) &&
          'data' in (payload as Record<string, unknown>)
        ) {
          return payload;
        }
        if (
          payload !== null &&
          typeof payload === 'object' &&
          'items' in (payload as Record<string, unknown>) &&
          'meta' in (payload as Record<string, unknown>)
        ) {
          const paged = payload as { items: T; meta: Record<string, unknown>; message?: string };
          return {
            success: true,
            message: paged.message || 'Records retrieved successfully',
            data: paged.items,
            meta: paged.meta,
          };
        }
        return {
          success: true,
          message: 'Operation completed successfully',
          data: payload as T,
        };
      }),
    );
  }
}
