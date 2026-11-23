import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import {
  auditContextStorage,
  stripClientAuditFields,
} from './audit-context';
import { AuditRequestContext } from './audit.types';

interface AuditableRequest extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<AuditableRequest>();

    // Strip any client-supplied audit fields before reaching controllers/services
    if (req.body && typeof req.body === 'object') {
      stripClientAuditFields(req.body);
    }

    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    const ipAddress = forwardedIp || req.ip || req.socket?.remoteAddress || null;
    const rawUserAgent = req.headers['user-agent'];
    const userAgent =
      typeof rawUserAgent === 'string' ? rawUserAgent.slice(0, 500) : null;

    const user = req.user;
    const displayName = user
      ? `${user.fullName}${user.empNo ? ` (${user.empNo})` : ''}`
      : undefined;

    const auditCtx: AuditRequestContext = {
      userId: user?.id ?? null,
      userName: displayName,
      ipAddress,
      userAgent,
      isSystem: false,
    };

    return new Observable((subscriber) => {
      auditContextStorage.run(auditCtx, () => {
        const sub = next.handle().subscribe({
          next: (val) => subscriber.next(val),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
        return () => sub.unsubscribe();
      });
    });
  }
}
