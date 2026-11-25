import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

interface FieldError {
  field?: string;
  message: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: FieldError[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const resObj = body as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          message = 'Validation failed';
          errors = resObj.message.map((m) => {
            if (typeof m === 'string') {
              const firstWord = m.split(' ')[0];
              return { field: firstWord, message: m };
            }
            return { message: String(m) };
          });
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }
        if (Array.isArray(resObj.errors)) {
          errors = resObj.errors as FieldError[];
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(`Prisma error ${exception.code}: ${exception.message}`);
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta.target.join(', ')
          : String(exception.meta?.target || 'record');
        message = `A record with duplicate ${target} already exists.`;
        errors = [{ field: target, message }];
      } else if (exception.code === 'P2003') {
        status = HttpStatus.CONFLICT;
        const fieldName = exception.meta?.field_name ? String(exception.meta.field_name) : '';
        message = fieldName
          ? `Operation violates relational reference (${fieldName}). Record may be in use or reference an invalid parent.`
          : 'Operation violates a relational foreign key reference.';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Requested record was not found.';
      } else if (exception.code === 'P2024') {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'Database connection pool is temporarily busy. Please try again.';
      } else if (exception.code === 'P2034') {
        status = HttpStatus.CONFLICT;
        message = 'Concurrent update conflict detected. Please refresh and try again.';
      } else if (exception.code === 'P2000') {
        status = HttpStatus.BAD_REQUEST;
        message = 'One or more field values exceed the maximum allowed length.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database request could not be processed.';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn(`Prisma validation error: ${exception.message}`);
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data format submitted to database layer.';
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors && errors.length > 0 ? { errors } : {}),
    });
  }
}
